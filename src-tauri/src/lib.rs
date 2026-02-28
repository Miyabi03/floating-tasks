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

    // Wait for page to reload and render
    std::thread::sleep(std::time::Duration::from_secs(4));

    // Re-acquire window handle after reload
    let window = app
        .get_webview_window("addness-sync")
        .ok_or_else(|| "Addness sync window not found after reload".to_string())?;

    let js = r#"
    (function() {
        try {
            var goals = [];
            var idx = 0;
            var seen = new Set();

            var text = document.body.innerText;
            var lines = text.split(/\n/).map(function(l) { return l.trim(); }).filter(function(l) { return l.length > 0; });

            var inGoalSection = false;

            for (var i = 0; i < lines.length; i++) {
                var line = lines[i];

                if (line.includes('\u4eca\u3084\u308b\u3079\u304d\u30b4\u30fc\u30eb')) {
                    inGoalSection = true;
                    continue;
                }

                if (!inGoalSection) continue;

                if (line.match(/^(\u5B8C\u4E86|\u30A2\u30FC\u30AB\u30A4\u30D6|\u7FD2\u6163|\u6210\u679C|\u30B4\u30FC\u30EB\u4E00\u89A7)/)) break;

                if (line.length < 4) continue;
                if (line.match(/^[\u301C~]\s*\d/)) continue;
                if (line.match(/^(\u691C\u7D22|Q\s)/)) continue;

                var title = line.replace(/\s*[\u301C~]\s*\d{1,2}\/\d{1,2}\s+\d{2}:\d{2}\s*$/, '').trim();
                title = title.replace(/^[\u25B6\u25B7\u25BA\u25B8\u25B3\u25B2\u21BB\u25C9\u25CB\u25CF\u25CE\u23F0\uD83D\uDD04\u25A0\u25A1\u25AA\u25AB\s]+/, '').trim();

                if (title.length < 2 || seen.has(title)) continue;
                seen.add(title);

                goals.push({
                    id: 'addness-' + (idx++),
                    title: title,
                    completed: false
                });
            }

            var json = JSON.stringify(goals);
            var encoded = encodeURIComponent(json);
            window.location.href = 'http://localhost:19837?data=' + encoded;
        } catch(e) {
            window.location.href = 'http://localhost:19837?data=' + encodeURIComponent('[]');
        }
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
