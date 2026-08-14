// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use tauri::Manager;
use window_vibrancy::apply_blur;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn open_settings_window(app: tauri::AppHandle) -> Result<(), String> {
    // If settings window already exists, just show and focus it
    if let Some(window) = app.get_webview_window("settings") {
        let _ = window.show();
        let _ = window.set_focus();
        return Ok(());
    }

    // Create settings window
    let settings_window = tauri::WebviewWindowBuilder::new(
        &app,
        "settings",
        tauri::WebviewUrl::App("settings.html".into()),
    )
    .title("Settings")
    .inner_size(600.0, 400.0)
    .center()
    .resizable(true)
    .visible(true)
    .focused(true)
    .decorations(true)
    .skip_taskbar(false)
    .always_on_top(false)
    .build();

    match settings_window {
        Ok(window) => {
            let _ = window.show();
            let _ = window.set_focus();
            Ok(())
        }
        Err(e) => Err(e.to_string()),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, open_settings_window])
        .setup(|app| {
            let window = app.get_webview_window("main").unwrap();
            #[cfg(target_os = "windows")]
            {
                let _ = apply_blur(&window, Some((18, 18, 18, 125)));
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
