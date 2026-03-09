mod tray;

use std::collections::HashMap;
use tauri::{Emitter, Manager, RunEvent};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut};

const GOOGLE_CLIENT_SECRET: &str = match option_env!("GOOGLE_CLIENT_SECRET") {
    Some(s) => s,
    None => "",
};
const TOKEN_ENDPOINT: &str = "https://oauth2.googleapis.com/token";

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

const FALLBACK_JS: &str = r#"
(function(){
    var MAX_WAIT=40,attempts=0;
    function poll(){
        var t=document.body.innerText||'';
        var ready=document.readyState==='complete';
        var hasGoal=t.indexOf('\u30B4\u30FC\u30EB')>=0;
        if((!ready||!hasGoal||t.length<50)&&attempts<MAX_WAIT){attempts++;setTimeout(poll,500);return}
        try{
            var goals=[],idx=0,seen={},lines=t.split(/\n/).map(function(l){return l.trim()}).filter(function(l){return l.length>0});
            var inSec=false;
            for(var i=0;i<lines.length;i++){
                var line=lines[i];
                if(line.indexOf('\u30B4\u30FC\u30EB')>=0&&(line.indexOf('\u3084\u308B\u3079\u304D')>=0||line==='\u30B4\u30FC\u30EB')){inSec=true;continue}
                if(!inSec)continue;
                if(/^(\u5B8C\u4E86|\u30A2\u30FC\u30AB\u30A4\u30D6|\u7FD2\u6163|\u6210\u679C)/.test(line))break;
                if(line.length<4)continue;
                if(/^[\u301C~]\s*\d/.test(line)||/^\d{1,2}\/\d{1,2}/.test(line))continue;
                if(/^(\u691C\u7D22|Q\s)/.test(line))continue;
                var title=line.replace(/\s*[\u301C~]\s*\d{1,2}\/\d{1,2}\s+\d{2}:\d{2}\s*$/,'').replace(/^[\u25B6\u25B7\u25BA\u25B8\u25B3\u25B2\u21BB\u25C9\u25CB\u25CF\u25CE\u25A0\u25A1\s]+/,'').trim();
                if(title.length<2||seen[title])continue;
                seen[title]=true;
                goals.push({id:'addness-'+(idx++),title:title,completed:false,parentId:null});
            }
            var json=JSON.stringify(goals);
            window.location.href='http://localhost:19837?data='+encodeURIComponent(json);
        }catch(e){window.location.href='http://localhost:19837?data='+encodeURIComponent('[]')}
    }
    poll();
})();
"#;

#[tauri::command]
async fn addness_fetch_data(app: tauri::AppHandle, js_code: String) -> Result<(), String> {
    let window = app
        .get_webview_window("addness-sync")
        .ok_or_else(|| "Addness sync window not found".to_string())?;

    // Force a cache-busting reload to get latest state from Addness
    window
        .eval("location.replace(location.pathname + '?_=' + Date.now())")
        .map_err(|e| format!("{e}"))?;

    // Wait for navigation to start and page to begin loading
    tokio::time::sleep(std::time::Duration::from_secs(2)).await;

    // Re-acquire window handle after reload
    let window = app
        .get_webview_window("addness-sync")
        .ok_or_else(|| "Addness sync window not found after reload".to_string())?;

    let js = if js_code.is_empty() {
        FALLBACK_JS.to_string()
    } else {
        js_code
    };

    window.eval(&js).map_err(|e| format!("{e}"))?;
    Ok(())
}

#[tauri::command]
async fn addness_eval_js(app: tauri::AppHandle, js_code: String) -> Result<(), String> {
    let window = app
        .get_webview_window("addness-sync")
        .ok_or_else(|| "Addness sync window not found".to_string())?;
    window.eval(&js_code).map_err(|e| format!("{e}"))?;
    Ok(())
}

#[tauri::command]
async fn addness_close_sync(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("addness-sync") {
        window.close().map_err(|e| format!("{e}"))?;
    }
    Ok(())
}

#[derive(serde::Serialize)]
struct TokenResponse {
    access_token: String,
    refresh_token: Option<String>,
    expires_in: u64,
}

#[tauri::command]
async fn google_exchange_token(
    code: String,
    client_id: String,
    redirect_uri: String,
) -> Result<TokenResponse, String> {
    if GOOGLE_CLIENT_SECRET.is_empty() {
        return Err("GOOGLE_CLIENT_SECRET is not configured. Set it in .env.local or as an environment variable at build time.".to_string());
    }
    let mut params = HashMap::new();
    params.insert("code", code);
    params.insert("client_id", client_id);
    params.insert("client_secret", GOOGLE_CLIENT_SECRET.to_string());
    params.insert("redirect_uri", redirect_uri);
    params.insert("grant_type", "authorization_code".to_string());

    let client = reqwest::Client::new();
    let res = client
        .post(TOKEN_ENDPOINT)
        .form(&params)
        .send()
        .await
        .map_err(|e| format!("Token exchange request failed: {e}"))?;

    if !res.status().is_success() {
        let text = res.text().await.unwrap_or_default();
        return Err(format!("Token exchange failed: {text}"));
    }

    let data: serde_json::Value = res
        .json()
        .await
        .map_err(|e| format!("Failed to parse token response: {e}"))?;

    Ok(TokenResponse {
        access_token: data["access_token"]
            .as_str()
            .ok_or("Missing access_token")?
            .to_string(),
        refresh_token: data["refresh_token"].as_str().map(|s| s.to_string()),
        expires_in: data["expires_in"]
            .as_u64()
            .ok_or("Missing expires_in")?,
    })
}

#[tauri::command]
async fn google_refresh_token(
    refresh_token: String,
    client_id: String,
) -> Result<TokenResponse, String> {
    if GOOGLE_CLIENT_SECRET.is_empty() {
        return Err("GOOGLE_CLIENT_SECRET is not configured. Set it in .env.local or as an environment variable at build time.".to_string());
    }
    let mut params = HashMap::new();
    params.insert("refresh_token", refresh_token.clone());
    params.insert("client_id", client_id);
    params.insert("client_secret", GOOGLE_CLIENT_SECRET.to_string());
    params.insert("grant_type", "refresh_token".to_string());

    let client = reqwest::Client::new();
    let res = client
        .post(TOKEN_ENDPOINT)
        .form(&params)
        .send()
        .await
        .map_err(|e| format!("Token refresh request failed: {e}"))?;

    if !res.status().is_success() {
        let text = res.text().await.unwrap_or_default();
        return Err(format!("Token refresh failed: {text}"));
    }

    let data: serde_json::Value = res
        .json()
        .await
        .map_err(|e| format!("Failed to parse token response: {e}"))?;

    Ok(TokenResponse {
        access_token: data["access_token"]
            .as_str()
            .ok_or("Missing access_token")?
            .to_string(),
        refresh_token: data["refresh_token"]
            .as_str()
            .map(|s| s.to_string())
            .or(Some(refresh_token)),
        expires_in: data["expires_in"]
            .as_u64()
            .ok_or("Missing expires_in")?,
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            google_auth_start,
            google_exchange_token,
            google_refresh_token,
            addness_start_sync,
            addness_fetch_data,
            addness_eval_js,
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
