// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager,
};
use tauri_plugin_window_state::StateFlags;
use window_vibrancy::apply_blur;

fn show_main_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

fn toggle_main_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let is_visible = window.is_visible().unwrap_or(false);
        let is_minimized = window.is_minimized().unwrap_or(false);

        if is_visible && !is_minimized {
            let _ = window.hide();
        } else {
            let _ = window.show();
            let _ = window.unminimize();
            let _ = window.set_focus();
        }
    }
}

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
fn close_about_window(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("about") {
        window.destroy().map_err(|error| error.to_string())?;
    }

    Ok(())
}

#[tauri::command]
fn get_app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[tauri::command]
fn exit_application(app: tauri::AppHandle) {
    app.exit(0);
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
    .skip_taskbar(true)
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

#[tauri::command]
async fn open_about_window(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("about") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
        return Ok(());
    }

    let about_position = app.get_webview_window("main").and_then(|window| {
        let scale_factor = window.scale_factor().ok()?;
        let position = window
            .outer_position()
            .ok()?
            .to_logical::<f64>(scale_factor);

        Some((position.x + 60.0, position.y + 40.0))
    });

    let mut builder = tauri::WebviewWindowBuilder::new(
        &app,
        "about",
        tauri::WebviewUrl::App("about.html".into()),
    )
    .title("About BSL-Timer")
    .inner_size(360.0, 285.0)
    .resizable(false)
    .visible(false)
    .focused(false)
    .decorations(true)
    .skip_taskbar(true)
    .always_on_top(false)
    .prevent_overflow_with_margin(tauri::LogicalSize::new(20.0, 20.0));

    builder = match about_position {
        Some((x, y)) => builder.position(x, y),
        None => builder.center(),
    };

    builder
        .build()
        .map(|_| ())
        .map_err(|error| error.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            show_main_window(app);
        }))
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_window_state::Builder::default()
                .with_state_flags(StateFlags::POSITION)
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            greet,
            close_about_window,
            close_settings_window,
            exit_application,
            get_app_version,
            open_about_window,
            open_settings_window,
            set_main_window_transparency
        ])
        .setup(|app| {
            let window = app.get_webview_window("main").unwrap();

            let open_item =
                MenuItem::with_id(app, "open", "Open BSL-Timer", true, None::<&str>)?;
            let exit_item = MenuItem::with_id(app, "exit", "Exit", true, None::<&str>)?;
            let tray_menu = Menu::with_items(app, &[&open_item, &exit_item])?;

            TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("BSL-Timer")
                .menu(&tray_menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "open" => show_main_window(app),
                    "exit" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.emit("tray-exit-requested", ());
                        }
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        toggle_main_window(tray.app_handle());
                    }
                })
                .build(app)?;

            #[cfg(target_os = "windows")]
            {
                let _ = apply_blur(&window, Some((18, 18, 18, 125)));
            }

            Ok(())
        })
        .on_window_event(|window, event| {
            if window.label() == "main" {
                if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
