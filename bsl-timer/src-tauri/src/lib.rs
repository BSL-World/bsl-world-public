// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use tauri::Manager;
use tauri_plugin_window_state::StateFlags;
use window_vibrancy::apply_blur;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn set_main_window_transparency(app: tauri::AppHandle, transparency: u8) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "Main window was not found".to_string())?;

    let normalized_transparency = transparency.min(90);
    let alpha = (((100 - normalized_transparency) as f64 / 100.0) * 255.0).round() as u8;

    apply_blur(&window, Some((18, 18, 18, alpha))).map_err(|error| error.to_string())
}

#[tauri::command]
fn close_settings_window(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("settings") {
        window.destroy().map_err(|error| error.to_string())?;
    }

    Ok(())
}

#[tauri::command]
async fn open_settings_window(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("settings") {
        let _ = window.show();
        let _ = window.set_focus();
        return Ok(());
    }

    let settings_position = app.get_webview_window("main").and_then(|window| {
        let scale_factor = window.scale_factor().ok()?;
        let position = window
            .outer_position()
            .ok()?
            .to_logical::<f64>(scale_factor);

        Some((position.x + 120.0, position.y + 120.0))
    });

    let mut builder = tauri::WebviewWindowBuilder::new(
        &app,
        "settings",
        tauri::WebviewUrl::App("settings.html".into()),
    )
    .title("Settings")
    .inner_size(460.0, 640.0)
    .resizable(false)
    .visible(false)
    .focused(false)
    .decorations(true)
    .skip_taskbar(false)
    .always_on_top(false)
    .prevent_overflow_with_margin(tauri::LogicalSize::new(30.0, 30.0));

    builder = match settings_position {
        Some((x, y)) => builder.position(x, y),
        None => builder.center(),
    };

    let settings_window = builder.build();

    match settings_window {
        Ok(_) => Ok(()),
        Err(error) => Err(error.to_string()),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_window_state::Builder::default()
                .with_state_flags(StateFlags::POSITION)
                .with_filter(|label| label == "main")
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            greet,
            close_settings_window,
            open_settings_window,
            set_main_window_transparency
        ])
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
