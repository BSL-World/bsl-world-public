// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use std::{
    sync::{Arc, Mutex},
    thread,
    time::Duration,
};
use tauri::{
    image::Image,
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager,
};
use tauri_plugin_window_state::StateFlags;
use window_vibrancy::apply_blur;

const TRAY_ICON_ID: &str = "main-tray";
const PULSE_LEVELS: [u8; 8] = [100, 92, 84, 76, 68, 76, 84, 92];

#[derive(Clone)]
struct TrayVisualState(Arc<Mutex<TrayVisual>>);

#[derive(Clone, Copy)]
struct TrayVisual {
    color: [u8; 3],
    overdue: bool,
    pulse_enabled: bool,
    pulse_step: usize,
}

impl Default for TrayVisualState {
    fn default() -> Self {
        Self(Arc::new(Mutex::new(TrayVisual {
            color: [11, 219, 4],
            overdue: false,
            pulse_enabled: false,
            pulse_step: 0,
        })))
    }
}

fn mix_color(first: [u8; 3], second: [u8; 3], second_weight: u16) -> [u8; 3] {
    let first_weight = 255 - second_weight;
    let mut result = [0; 3];

    for channel in 0..3 {
        result[channel] = ((u16::from(first[channel]) * first_weight
            + u16::from(second[channel]) * second_weight)
            / 255) as u8;
    }

    result
}

fn scale_color(color: [u8; 3], level: u8) -> [u8; 3] {
    let mut result = [0; 3];

    for channel in 0..3 {
        result[channel] = ((u16::from(color[channel]) * u16::from(level)) / 100) as u8;
    }

    result
}

fn contrast_color(color: [u8; 3]) -> [u8; 3] {
    let luminance =
        (u32::from(color[0]) * 2126 + u32::from(color[1]) * 7152 + u32::from(color[2]) * 722)
            / 10_000;

    if luminance > 105 {
        mix_color(color, [24, 24, 24], 190)
    } else {
        mix_color(color, [232, 232, 232], 190)
    }
}

fn recolor_tray_icon(color: [u8; 3], level: u8) -> Result<Image<'static>, String> {
    let source = Image::from_bytes(include_bytes!("../icons/32x32.png"))
        .map_err(|error| error.to_string())?;
    let mut rgba = source.rgba().to_vec();
    let width = source.width();
    let height = source.height();
    let center_x = (f64::from(width) - 1.0) / 2.0;
    let center_y = f64::from(height) / 2.0;
    let dial_radius = f64::from(width.min(height)) * 0.44;
    let pale_color = mix_color(color, [245, 245, 245], 205);
    let outline_color = contrast_color(color);

    for (index, pixel) in rgba.chunks_exact_mut(4).enumerate() {
        if pixel[3] == 0 {
            continue;
        }

        let luminance = (u16::from(pixel[0]) + u16::from(pixel[1]) + u16::from(pixel[2])) / 3;

        let x = (index as u32 % width) as f64;
        let y = (index as u32 / width) as f64;
        let distance = ((x - center_x).powi(2) + (y - center_y).powi(2)).sqrt();
        let mut angle = (x - center_x).atan2(center_y - y).to_degrees();

        if angle < 0.0 {
            angle += 360.0;
        }

        let is_active_segment = angle < 240.0;
        let segment_color = if is_active_segment {
            let glow_strength = ((1.0 - distance / dial_radius).clamp(0.0, 1.0) * 96.0) as u16;
            mix_color(color, [255, 255, 255], glow_strength)
        } else {
            pale_color
        };
        let themed_color = if luminance < 72 {
            outline_color
        } else if luminance > 220 {
            mix_color(segment_color, [255, 255, 255], 64)
        } else {
            segment_color
        };
        let themed_color = scale_color(themed_color, level);

        pixel[..3].copy_from_slice(&themed_color);
    }

    Ok(Image::new_owned(rgba, width, height))
}

fn set_tray_icon(app: &tauri::AppHandle, color: [u8; 3], level: u8) -> Result<(), String> {
    let tray = app
        .tray_by_id(TRAY_ICON_ID)
        .ok_or_else(|| "Tray icon was not found".to_string())?;
    let icon = recolor_tray_icon(color, level)?;

    tray.set_icon(Some(icon)).map_err(|error| error.to_string())
}

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
fn update_tray_icon(
    app: tauri::AppHandle,
    state: tauri::State<'_, TrayVisualState>,
    color: [u8; 3],
    overdue: bool,
    pulse_enabled: bool,
) -> Result<(), String> {
    let mut visual = state
        .0
        .lock()
        .map_err(|_| "Tray visual state is unavailable".to_string())?;

    visual.color = color;
    visual.overdue = overdue;
    visual.pulse_enabled = pulse_enabled;
    visual.pulse_step = 0;
    drop(visual);

    set_tray_icon(&app, color, 100)
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
    let tray_visual_state = TrayVisualState::default();

    tauri::Builder::default()
        .manage(tray_visual_state.clone())
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
            set_main_window_transparency,
            update_tray_icon
        ])
        .setup(move |app| {
            let window = app.get_webview_window("main").unwrap();

            let open_item = MenuItem::with_id(app, "open", "Open BSL-Timer", true, None::<&str>)?;
            let exit_item = MenuItem::with_id(app, "exit", "Exit", true, None::<&str>)?;
            let tray_menu = Menu::with_items(app, &[&open_item, &exit_item])?;

            TrayIconBuilder::with_id(TRAY_ICON_ID)
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

            let pulse_app = app.handle().clone();
            let pulse_state = tray_visual_state.clone();

            thread::spawn(move || loop {
                thread::sleep(Duration::from_millis(120));

                let pulse = {
                    let Ok(mut visual) = pulse_state.0.lock() else {
                        break;
                    };

                    if !visual.overdue || !visual.pulse_enabled {
                        None
                    } else {
                        visual.pulse_step = (visual.pulse_step + 1) % PULSE_LEVELS.len();
                        Some((visual.color, PULSE_LEVELS[visual.pulse_step]))
                    }
                };

                if let Some((color, level)) = pulse {
                    let _ = set_tray_icon(&pulse_app, color, level);
                }
            });

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
