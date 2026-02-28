mod tray;

use tauri::{Emitter, Manager, RunEvent};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut};

fn show_window(app_handle: &tauri::AppHandle) {
    if let Some(window) = app_handle.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
    }
}

fn toggle_window(app_handle: &tauri::AppHandle) {
    if let Some(window) = app_handle.get_webview_window("main") {
        if window.is_visible().unwrap_or(false) {
            let _ = window.hide();
        } else {
            let _ = window.show();
            let _ = window.set_focus();
        }
    }
}

#[tauri::command]
async fn google_auth_start(
    app: tauri::AppHandle,
    auth_url: String,
    redirect_port: u16,
) -> Result<(), String> {
    let app_handle = app.clone();
    let redirect_origin = format!("http://localhost:{redirect_port}");

    let _auth_window = tauri::WebviewWindowBuilder::new(
        &app,
        "google-auth",
        tauri::WebviewUrl::External(auth_url.parse().map_err(|e| format!("{e}"))?),
    )
    .title("Sign in with Google")
    .inner_size(500.0, 700.0)
    .on_navigation(move |url: &url::Url| {
        let url_str = url.as_str();
        if url_str.starts_with(&redirect_origin) {
            if let Ok(parsed) = url::Url::parse(url_str) {
                let code = parsed
                    .query_pairs()
                    .find(|(k, _)| k == "code")
                    .map(|(_, v)| v.to_string());
                if let Some(code) = code {
                    let _ = app_handle.emit("google-auth-code", code);
                }
            }
            if let Some(w) = app_handle.get_webview_window("google-auth") {
                let _ = w.close();
            }
            return false;
        }
        true
    })
    .build()
    .map_err(|e| format!("{e}"))?;

    Ok(())
}

#[tauri::command]
async fn addness_start_sync(app: tauri::AppHandle) -> Result<(), String> {
    // Close existing window if any
    if let Some(existing) = app.get_webview_window("addness-sync") {
        let _ = existing.close();
    }

    let app_handle = app.clone();
    let redirect_origin = "http://localhost:19837";

    let _window = tauri::WebviewWindowBuilder::new(
        &app,
        "addness-sync",
        tauri::WebviewUrl::External(
            "https://addness.com/todo".parse().map_err(|e| format!("{e}"))?,
        ),
    )
    .title("Addness - Sign in")
    .inner_size(500.0, 700.0)
    .on_navigation(move |url: &url::Url| {
        let url_str = url.as_str();
        if url_str.starts_with(redirect_origin) {
            if let Ok(parsed) = url::Url::parse(url_str) {
                let data = parsed
                    .query_pairs()
                    .find(|(k, _)| k == "data")
                    .map(|(_, v)| v.to_string());
                if let Some(encoded) = data {
                    let decoded = urlencoding::decode(&encoded)
                        .unwrap_or_else(|_| encoded.clone().into());
                    let _ = app_handle.emit("addness-sync-data", decoded.to_string());
                }
            }
            return false;
        }
        true
    })
    .build()
    .map_err(|e| format!("{e}"))?;

    Ok(())
}

#[tauri::command]
async fn addness_fetch_data(app: tauri::AppHandle) -> Result<(), String> {
    let window = app
        .get_webview_window("addness-sync")
        .ok_or_else(|| "Addness sync window not found".to_string())?;

    // Reload the page to get latest state from Addness
    window.eval("location.reload()").map_err(|e| format!("{e}"))?;

    // Wait for page to start loading
    std::thread::sleep(std::time::Duration::from_secs(3));

    // Re-acquire window handle after reload
    let window = app
        .get_webview_window("addness-sync")
        .ok_or_else(|| "Addness sync window not found after reload".to_string())?;

    let js = r#"
    (function() {
        var MAX_WAIT = 20;
        var attempts = 0;

        function poll() {
            var bodyText = document.body.innerText || '';
            if (bodyText.length < 50 && attempts < MAX_WAIT) {
                attempts++;
                setTimeout(poll, 500);
                return;
            }
            try {
                var goals = extractFromDOM();
                if (goals.length === 0) goals = extractFromText();
                sendGoals(goals);
            } catch(e) {
                sendGoals([]);
            }
        }

        function sendGoals(goals) {
            var json = JSON.stringify(goals);
            var encoded = encodeURIComponent(json);
            window.location.href = 'http://localhost:19837?data=' + encoded;
        }

        function getOwnText(el) {
            var t = '';
            for (var i = 0; i < el.childNodes.length; i++) {
                if (el.childNodes[i].nodeType === 3) t += el.childNodes[i].textContent;
            }
            return t.trim();
        }

        function cleanTitle(text) {
            var t = text.replace(/\s*[\u301C~]\s*\d{1,2}\/\d{1,2}\s+\d{2}:\d{2}\s*$/, '');
            t = t.replace(/^[\u25B6\u25B7\u25BA\u25B8\u25B3\u25B2\u21BB\u25C9\u25CB\u25CF\u25CE\u25A0\u25A1\s]+/, '');
            return t.trim();
        }

        function isDateLike(text) {
            return /^[\u301C~]\s*\d/.test(text) || /^\d{1,2}\/\d{1,2}/.test(text);
        }

        function extractFromDOM() {
            var main = document.querySelector('main') || document.body;
            var allEls = main.querySelectorAll('*');
            var items = [];

            for (var i = 0; i < allEls.length; i++) {
                var el = allEls[i];
                var own = getOwnText(el);
                if (own.length < 3) continue;
                var rect = el.getBoundingClientRect();
                if (rect.width <= 0 || rect.height <= 0) continue;
                items.push({ text: own, left: rect.left, top: rect.top, h: rect.height });
            }

            var secTop = -1, secBot = 99999;
            for (var i = 0; i < items.length; i++) {
                if (items[i].text.indexOf('\u3084\u308B\u3079\u304D') >= 0 &&
                    items[i].text.indexOf('\u30B4\u30FC\u30EB') >= 0) {
                    secTop = items[i].top + items[i].h;
                    break;
                }
            }
            if (secTop < 0) {
                for (var i = 0; i < items.length; i++) {
                    if (items[i].text === '\u4ECA\u3084\u308B\u3079\u304D\u30B4\u30FC\u30EB') {
                        secTop = items[i].top + items[i].h;
                        break;
                    }
                }
            }
            if (secTop < 0) return [];

            var ends = ['\u5B8C\u4E86', '\u6210\u679C', '\u7FD2\u6163'];
            for (var i = 0; i < items.length; i++) {
                if (items[i].top <= secTop) continue;
                for (var j = 0; j < ends.length; j++) {
                    if (items[i].text.indexOf(ends[j]) >= 0) { secBot = items[i].top; break; }
                }
                if (secBot < 99999) break;
            }

            var seen = {};
            var candidates = [];
            for (var i = 0; i < items.length; i++) {
                var it = items[i];
                if (it.top < secTop || it.top >= secBot) continue;
                if (isDateLike(it.text)) continue;
                var cl = cleanTitle(it.text);
                if (cl.length < 3 || seen[cl]) continue;
                seen[cl] = true;
                candidates.push({ text: cl, left: it.left, top: it.top });
            }

            if (candidates.length === 0) return [];
            candidates.sort(function(a, b) { return a.top - b.top; });

            var minLeft = candidates[0].left;
            for (var i = 1; i < candidates.length; i++) {
                if (candidates[i].left < minLeft) minLeft = candidates[i].left;
            }

            var goals = [];
            var idx = 0;
            var lastParentId = null;
            for (var i = 0; i < candidates.length; i++) {
                var c = candidates[i];
                var isChild = c.left > minLeft + 15;
                var goalId = 'addness-' + idx;
                goals.push({
                    id: goalId,
                    title: c.text,
                    completed: false,
                    parentId: isChild ? lastParentId : null
                });
                if (!isChild) lastParentId = goalId;
                idx++;
            }
            return goals;
        }

        function extractFromText() {
            var goals = [];
            var idx = 0;
            var seen = {};
            var text = document.body.innerText || '';
            var lines = text.split(/\n/).map(function(l) { return l.trim(); }).filter(function(l) { return l.length > 0; });
            var inSec = false;

            for (var i = 0; i < lines.length; i++) {
                var line = lines[i];
                if (line.indexOf('\u30B4\u30FC\u30EB') >= 0 &&
                    (line.indexOf('\u3084\u308B\u3079\u304D') >= 0 || line === '\u30B4\u30FC\u30EB')) {
                    inSec = true;
                    continue;
                }
                if (!inSec) continue;
                if (/^(\u5B8C\u4E86|\u30A2\u30FC\u30AB\u30A4\u30D6|\u7FD2\u6163|\u6210\u679C)/.test(line)) break;
                if (line.length < 4) continue;
                if (isDateLike(line)) continue;
                if (/^(\u691C\u7D22|Q\s)/.test(line)) continue;
                var title = cleanTitle(line);
                if (title.length < 2 || seen[title]) continue;
                seen[title] = true;
                goals.push({ id: 'addness-' + (idx++), title: title, completed: false, parentId: null });
            }
            return goals;
        }

        poll();
    })();
    "#;

    window.eval(js).map_err(|e| format!("{e}"))?;
    Ok(())
}

#[tauri::command]
async fn addness_close_sync(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("addness-sync") {
        window.close().map_err(|e| format!("{e}"))?;
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            google_auth_start,
            addness_start_sync,
            addness_fetch_data,
            addness_close_sync,
        ])
        .setup(|app| {
            tray::setup_tray(app)?;

            let shortcut = Shortcut::new(Some(Modifiers::SUPER | Modifiers::SHIFT), Code::KeyT);
            let app_handle = app.handle().clone();

            app.global_shortcut().on_shortcut(shortcut, move |_app, _shortcut, _event| {
                toggle_window(&app_handle);
            })?;

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                if window.label() == "main" {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(|app_handle, event| {
        #[cfg(target_os = "macos")]
        if let RunEvent::Reopen { .. } = event {
            show_window(app_handle);
        }
        let _ = (app_handle, event);
    });
}
