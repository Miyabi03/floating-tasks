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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .invoke_handler(tauri::generate_handler![google_auth_start])
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
        if let RunEvent::Reopen { .. } = event {
            show_window(app_handle);
        }
    });
}
