// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use bsl_desktop_audio::{
    is_audio_output_device_available as shared_audio_output_device_available,
    list_audio_output_devices as shared_list_audio_output_devices,
    AudioEngine, AudioOutputDevice, NativeAudioRequest, NativeAudioResult,
};
use bsl_desktop_settings::SharedSettingsStore;
use std::{
    ffi::OsStr,
    path::Path,
    sync::{
        atomic::{AtomicU64, Ordering},
        Arc, Mutex,
    },
    thread,
    time::Duration,
};
use tauri::{
    image::Image,
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, LogicalPosition, Manager, PhysicalPosition,
};
use tauri_plugin_autostart::ManagerExt;
use tauri_plugin_window_state::StateFlags;
use window_vibrancy::apply_blur;

#[tauri::command]
fn list_audio_output_devices() -> Result<Vec<AudioOutputDevice>, String> {
    shared_list_audio_output_devices()
}

#[tauri::command]
fn is_audio_output_device_available(device_id: String) -> bool {
    shared_audio_output_device_available(&device_id)
}

#[tauri::command]
fn load_shared_desktop_settings_section(section: String) -> Result<serde_json::Value, String> {
    SharedSettingsStore::for_current_user()?.load_shared_section(&section)
}

#[tauri::command]
fn save_shared_desktop_settings_section(
    section: String,
    value: serde_json::Value,
) -> Result<serde_json::Value, String> {
    SharedSettingsStore::for_current_user()?.save_shared_section(&section, value)
}

#[tauri::command]
fn load_application_desktop_settings_section(
    application: String,
    section: String,
) -> Result<serde_json::Value, String> {
    SharedSettingsStore::for_current_user()?.load_application_section(&application, &section)
}

#[tauri::command]
fn save_application_desktop_settings_section(
    application: String,
    section: String,
    value: serde_json::Value,
) -> Result<serde_json::Value, String> {
    SharedSettingsStore::for_current_user()?.save_application_section(
        &application,
        &section,
        value,
    )
}

#[tauri::command]
fn remove_application_desktop_settings_section(
    application: String,
    section: String,
) -> Result<bool, String> {
    SharedSettingsStore::for_current_user()?.remove_application_section(&application, &section)
}

#[tauri::command]
async fn play_audio_signal(
    audio_engine: tauri::State<'_, AudioEngine>,
    request: NativeAudioRequest,
) -> Result<NativeAudioResult, String> {
    let audio_engine = audio_engine.inner().clone();

    tauri::async_runtime::spawn_blocking(move || audio_engine.play(request))
        .await
        .map_err(|error| format!("The native audio task failed: {error}"))?
}

#[tauri::command]
fn stop_audio_playback(
    audio_engine: tauri::State<'_, AudioEngine>,
    playback_ids: Vec<String>,
) -> Result<(), String> {
    audio_engine.stop(&playback_ids)
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct AudioFileEntry {
    name: String,
    path: String,
}

const SUPPORTED_AUDIO_EXTENSIONS: [&str; 10] = [
    "wav", "mp3", "m4a", "aac", "ogg", "oga", "opus", "flac", "webm", "wma",
];

fn is_supported_audio_path(path: &Path) -> bool {
    path.extension()
        .and_then(OsStr::to_str)
        .map(|extension| {
            SUPPORTED_AUDIO_EXTENSIONS
                .iter()
                .any(|supported| extension.eq_ignore_ascii_case(supported))
        })
        .unwrap_or(false)
}

#[tauri::command]
fn list_windows_sounds() -> Result<Vec<AudioFileEntry>, String> {
    #[cfg(target_os = "windows")]
    {
        let windows_directory = std::env::var_os("WINDIR")
            .ok_or_else(|| "The Windows directory is unavailable".to_string())?;
        let media_directory = Path::new(&windows_directory).join("Media");
        let entries = std::fs::read_dir(&media_directory).map_err(|error| {
            format!(
                "Failed to read {}: {error}",
                media_directory.display()
            )
        })?;
        let mut sounds = entries
            .filter_map(Result::ok)
            .map(|entry| entry.path())
            .filter(|path| path.is_file() && is_supported_audio_path(path))
            .map(|path| AudioFileEntry {
                name: path
                    .file_stem()
                    .and_then(OsStr::to_str)
                    .unwrap_or_default()
                    .to_string(),
                path: path.to_string_lossy().into_owned(),
            })
            .collect::<Vec<_>>();

        sounds.sort_by_key(|sound| sound.name.to_lowercase());
        Ok(sounds)
    }

    #[cfg(not(target_os = "windows"))]
    {
        Ok(Vec::new())
    }
}

#[cfg(target_os = "windows")]
use windows_sys::Win32::UI::Shell::SetCurrentProcessExplicitAppUserModelID;
#[cfg(target_os = "windows")]
use windows_sys::Win32::UI::WindowsAndMessaging::{
    CreateIcon, DestroyIcon, SendMessageW, SetClassLongPtrW, GCLP_HICON, GCLP_HICONSM, ICON_BIG,
    ICON_SMALL, WM_SETICON,
};

const AUTOSTART_ARG: &str = "--from-autostart";
const TRAY_ICON_ID: &str = "main-tray";
const TRAY_PREVIEW_LABEL: &str = "tray-preview";
const DATE_COUNTDOWN_EDITOR_LABEL: &str = "date-countdown-editor";
const TRAY_PREVIEW_DELAY_MS: u64 = 350;
const TRAY_PREVIEW_HIDE_DELAY_MS: u64 = 600;
const TRAY_PREVIEW_FADE_MS: u64 = 420;
const TRAY_PREVIEW_WIDTH: f64 = 340.0;
const TRAY_PREVIEW_HEIGHT: f64 = 190.0;
const PULSE_LEVELS: [u8; 8] = [100, 92, 84, 76, 68, 76, 84, 92];
const SETTINGS_WINDOW_OFFSET_X: f64 = 120.0;
const SETTINGS_WINDOW_OFFSET_Y: f64 = 120.0;
const SETTINGS_WINDOW_MARGIN: f64 = 30.0;

#[derive(Clone, Default)]
struct TrayPreviewState(Arc<AtomicU64>);

#[cfg(target_os = "windows")]
#[derive(Clone, Default)]
struct TaskbarIconState(Arc<Mutex<TaskbarIcons>>);

#[cfg(target_os = "windows")]
#[derive(Default)]
struct TaskbarIcons {
    small: usize,
    big: usize,
}

#[derive(Clone, Copy)]
struct TrayBounds {
    left: f64,
    top: f64,
    right: f64,
    bottom: f64,
}

impl TrayBounds {
    fn contains(self, position: PhysicalPosition<f64>) -> bool {
        position.x >= self.left
            && position.x <= self.right
            && position.y >= self.top
            && position.y <= self.bottom
    }
}

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

fn outline_color(color: [u8; 3]) -> [u8; 3] {
    mix_color(color, [10, 18, 12], 185)
}

fn recolor_icon(
    source_bytes: &'static [u8],
    color: [u8; 3],
    level: u8,
) -> Result<Image<'static>, String> {
    let source = Image::from_bytes(source_bytes).map_err(|error| error.to_string())?;
    let mut rgba = source.rgba().to_vec();
    let width = source.width();
    let height = source.height();
    let center_x = (f64::from(width) - 1.0) / 2.0;
    let center_y = f64::from(height) / 2.0;
    let dial_radius = f64::from(width.min(height)) * 0.44;
    let pale_color = mix_color(color, [245, 245, 245], 205);
    let outline_color = outline_color(color);

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
    let icon = recolor_icon(include_bytes!("../icons/32x32.png"), color, level)?;

    tray.set_icon(Some(icon)).map_err(|error| error.to_string())
}

#[cfg(target_os = "windows")]
fn create_windows_icon(image: &Image<'_>) -> Result<usize, String> {
    let width = image.width() as usize;
    let height = image.height() as usize;
    let rgba = image.rgba();

    if width == 0 || height == 0 || rgba.len() != width * height * 4 {
        return Err("Invalid taskbar icon image".to_string());
    }

    let mask_stride = width.div_ceil(32) * 4;
    let mut and_mask = vec![0_u8; mask_stride * height];
    let mut xor_bits = vec![0_u8; width * height * 4];

    for y in 0..height {
        for x in 0..width {
            let source_index = (y * width + x) * 4;
            let destination_index = (y * width + x) * 4;
            let red = rgba[source_index];
            let green = rgba[source_index + 1];
            let blue = rgba[source_index + 2];
            let alpha = rgba[source_index + 3];

            xor_bits[destination_index] = blue;
            xor_bits[destination_index + 1] = green;
            xor_bits[destination_index + 2] = red;
            xor_bits[destination_index + 3] = alpha;

            if alpha == 0 {
                let mask_index = y * mask_stride + x / 8;
                and_mask[mask_index] |= 0x80 >> (x % 8);
            }
        }
    }

    let icon = unsafe {
        CreateIcon(
            std::ptr::null_mut(),
            width as i32,
            height as i32,
            1,
            32,
            and_mask.as_ptr(),
            xor_bits.as_ptr(),
        )
    };

    if icon.is_null() {
        return Err("Failed to create native Windows taskbar icon".to_string());
    }

    Ok(icon as usize)
}

#[cfg(target_os = "windows")]
fn set_taskbar_icon(
    app: &tauri::AppHandle,
    state: &TaskbarIconState,
    color: [u8; 3],
) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "Main window was not found".to_string())?;
    // Use larger source images for the native window icons. Windows may ignore
    // an ICON_SMALL image that is too small for the current taskbar scaling.
    let small_image = recolor_icon(include_bytes!("../icons/128x128.png"), color, 100)?;
    let big_image = recolor_icon(include_bytes!("../icons/128x128@2x.png"), color, 100)?;
    let small_icon = create_windows_icon(&small_image)?;
    let big_icon = match create_windows_icon(&big_image) {
        Ok(icon) => icon,
        Err(error) => {
            unsafe {
                DestroyIcon(small_icon as _);
            }
            return Err(error);
        }
    };
    let hwnd = window.hwnd().map_err(|error| error.to_string())?;

    unsafe {
        SendMessageW(
            hwnd.0 as _,
            WM_SETICON,
            ICON_SMALL as usize,
            small_icon as isize,
        );
        SendMessageW(
            hwnd.0 as _,
            WM_SETICON,
            ICON_BIG as usize,
            big_icon as isize,
        );

        // Also update the native window class icons. This prevents an installed
        // build launched through Windows Shell from falling back to the EXE icon
        // for its taskbar group while the running window already has a themed icon.
        SetClassLongPtrW(hwnd.0 as _, GCLP_HICONSM, small_icon as isize);
        SetClassLongPtrW(hwnd.0 as _, GCLP_HICON, big_icon as isize);
    }

    let mut icons = state
        .0
        .lock()
        .map_err(|_| "Taskbar icon state is unavailable".to_string())?;
    let previous_small = std::mem::replace(&mut icons.small, small_icon);
    let previous_big = std::mem::replace(&mut icons.big, big_icon);
    drop(icons);

    unsafe {
        if previous_small != 0 {
            DestroyIcon(previous_small as _);
        }
        if previous_big != 0 {
            DestroyIcon(previous_big as _);
        }
    }

    Ok(())
}

#[cfg(not(target_os = "windows"))]
fn set_taskbar_icon(app: &tauri::AppHandle, color: [u8; 3]) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "Main window was not found".to_string())?;
    let icon = recolor_icon(include_bytes!("../icons/128x128.png"), color, 100)?;

    window.set_icon(icon).map_err(|error| error.to_string())
}

fn is_autostart_launch() -> bool {
    std::env::args_os().any(|arg| arg == OsStr::new(AUTOSTART_ARG))
}

fn contains_autostart_arg(args: &[String]) -> bool {
    args.iter().any(|arg| arg == AUTOSTART_ARG)
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

fn hide_tray_preview(app: &tauri::AppHandle, state: &TrayPreviewState) {
    state.0.fetch_add(1, Ordering::SeqCst);

    if let Some(window) = app.get_webview_window(TRAY_PREVIEW_LABEL) {
        let _ = window.hide();
    }
}

fn automatic_tray_preview_position(
    app: &tauri::AppHandle,
) -> Result<PhysicalPosition<i32>, String> {
    let monitor = app
        .primary_monitor()
        .map_err(|error| error.to_string())?
        .ok_or_else(|| "The primary monitor is unavailable".to_string())?;
    let scale_factor = monitor.scale_factor();
    let work_area = monitor.work_area();
    let margin = 12.0 * scale_factor;
    let width = TRAY_PREVIEW_WIDTH * scale_factor;
    let height = TRAY_PREVIEW_HEIGHT * scale_factor;
    let right = f64::from(work_area.position.x)
        + f64::from(work_area.size.width);
    let bottom = f64::from(work_area.position.y)
        + f64::from(work_area.size.height);

    Ok(PhysicalPosition::new(
        (right - width - margin).round() as i32,
        (bottom - height - margin).round() as i32,
    ))
}

#[tauri::command]
fn show_tray_informer(
    app: tauri::AppHandle,
    state: tauri::State<'_, TrayPreviewState>,
) -> Result<u64, String> {
    let generation = state.0.fetch_add(1, Ordering::SeqCst) + 1;
    let position = automatic_tray_preview_position(&app)?;
    let window = app
        .get_webview_window(TRAY_PREVIEW_LABEL)
        .ok_or_else(|| "The tray informer window was not found".to_string())?;

    window
        .emit("tray-preview-show", ())
        .map_err(|error| error.to_string())?;
    window
        .set_position(position)
        .map_err(|error| error.to_string())?;
    window.show().map_err(|error| error.to_string())?;

    Ok(generation)
}

#[tauri::command]
fn hide_tray_informer(
    app: tauri::AppHandle,
    state: tauri::State<'_, TrayPreviewState>,
    generation: u64,
) -> Result<bool, String> {
    if state.0.load(Ordering::SeqCst) != generation {
        return Ok(false);
    }

    if let Some(window) = app.get_webview_window(TRAY_PREVIEW_LABEL) {
        window.hide().map_err(|error| error.to_string())?;
    }

    Ok(true)
}

fn tray_preview_position(
    app: &tauri::AppHandle,
    cursor: PhysicalPosition<f64>,
) -> PhysicalPosition<i32> {
    let monitor = app.monitor_from_point(cursor.x, cursor.y).ok().flatten();
    let scale_factor = monitor
        .as_ref()
        .map(|monitor| monitor.scale_factor())
        .unwrap_or(1.0);
    let preview_width = TRAY_PREVIEW_WIDTH * scale_factor;
    let preview_height = TRAY_PREVIEW_HEIGHT * scale_factor;
    let mut x = cursor.x - preview_width / 2.0;
    let mut y = cursor.y - preview_height - 24.0;

    if let Some(monitor) = monitor {
        let work_area = monitor.work_area();
        let left = f64::from(work_area.position.x);
        let top = f64::from(work_area.position.y);
        let right = left + f64::from(work_area.size.width);
        let bottom = top + f64::from(work_area.size.height);
        let horizontal_margin = 8.0 * scale_factor;
        let vertical_margin = 8.0 * scale_factor;

        if cursor.y < top + f64::from(work_area.size.height) / 2.0 {
            y = cursor.y + 24.0;
        }

        x = x.clamp(
            left + horizontal_margin,
            (right - preview_width - horizontal_margin).max(left + horizontal_margin),
        );
        y = y.clamp(
            top + vertical_margin,
            (bottom - preview_height - vertical_margin).max(top + vertical_margin),
        );
    }

    PhysicalPosition::new(x.round() as i32, y.round() as i32)
}

fn tray_bounds(
    app: &tauri::AppHandle,
    cursor: PhysicalPosition<f64>,
    rect: tauri::Rect,
) -> TrayBounds {
    let scale_factor = app
        .monitor_from_point(cursor.x, cursor.y)
        .ok()
        .flatten()
        .map(|monitor| monitor.scale_factor())
        .unwrap_or(1.0);
    let position = rect.position.to_physical::<i32>(scale_factor);
    let size = rect.size.to_physical::<u32>(scale_factor);
    let margin = 3.0 * scale_factor;

    TrayBounds {
        left: f64::from(position.x) - margin,
        top: f64::from(position.y) - margin,
        right: f64::from(position.x) + f64::from(size.width) + margin,
        bottom: f64::from(position.y) + f64::from(size.height) + margin,
    }
}

fn schedule_tray_preview(
    app: &tauri::AppHandle,
    state: &TrayPreviewState,
    cursor: PhysicalPosition<f64>,
    rect: tauri::Rect,
) {
    let generation = state.0.fetch_add(1, Ordering::SeqCst) + 1;
    let generation_state = state.clone();
    let preview_app = app.clone();
    let preview_position = tray_preview_position(app, cursor);
    let hover_bounds = tray_bounds(app, cursor, rect);

    if let Some(window) = app.get_webview_window("main") {
        let _ = window.emit("tray-preview-requested", ());
    }

    thread::spawn(move || {
        thread::sleep(Duration::from_millis(TRAY_PREVIEW_DELAY_MS));

        if generation_state.0.load(Ordering::SeqCst) != generation {
            return;
        }

        if preview_app
            .cursor_position()
            .map(|position| !hover_bounds.contains(position))
            .unwrap_or(false)
        {
            return;
        }

        let main_thread_state = generation_state.clone();
        let main_thread_app = preview_app.clone();

        let _ = preview_app.run_on_main_thread(move || {
            if main_thread_state.0.load(Ordering::SeqCst) != generation {
                return;
            }

            if let Some(window) = main_thread_app.get_webview_window(TRAY_PREVIEW_LABEL) {
                let _ = window.emit("tray-preview-show", ());
                let _ = window.set_position(preview_position);
                let _ = window.show();
            }
        });

        loop {
            thread::sleep(Duration::from_millis(100));

            if generation_state.0.load(Ordering::SeqCst) != generation {
                return;
            }

            let Ok(cursor_position) = preview_app.cursor_position() else {
                continue;
            };

            if hover_bounds.contains(cursor_position) {
                continue;
            }

            thread::sleep(Duration::from_millis(TRAY_PREVIEW_HIDE_DELAY_MS));

            if generation_state.0.load(Ordering::SeqCst) != generation {
                return;
            }

            if preview_app
                .cursor_position()
                .map(|position| hover_bounds.contains(position))
                .unwrap_or(false)
            {
                continue;
            }

            let fade_app = preview_app.clone();
            let _ = preview_app.run_on_main_thread(move || {
                if let Some(window) = fade_app.get_webview_window(TRAY_PREVIEW_LABEL) {
                    let _ = window.emit("tray-preview-hide", ());
                }
            });

            thread::sleep(Duration::from_millis(TRAY_PREVIEW_FADE_MS));

            if generation_state
                .0
                .compare_exchange(
                    generation,
                    generation + 1,
                    Ordering::SeqCst,
                    Ordering::SeqCst,
                )
                .is_err()
            {
                return;
            }

            let hide_app = preview_app.clone();
            let _ = preview_app.run_on_main_thread(move || {
                if let Some(window) = hide_app.get_webview_window(TRAY_PREVIEW_LABEL) {
                    let _ = window.hide();
                }
            });
            return;
        }
    });
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
fn is_autostart_enabled(app: tauri::AppHandle) -> Result<bool, String> {
    app.autolaunch()
        .is_enabled()
        .map_err(|error| error.to_string())
}

#[tauri::command]
fn set_autostart_enabled(app: tauri::AppHandle, enabled: bool) -> Result<(), String> {
    let manager = app.autolaunch();

    if enabled {
        manager.enable().map_err(|error| error.to_string())
    } else {
        manager.disable().map_err(|error| error.to_string())
    }
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
fn update_taskbar_icon(
    app: tauri::AppHandle,
    #[cfg(target_os = "windows")] state: tauri::State<'_, TaskbarIconState>,
    color: [u8; 3],
) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        return set_taskbar_icon(&app, &state, color);
    }

    #[cfg(not(target_os = "windows"))]
    {
        set_taskbar_icon(&app, color)
    }
}

fn auxiliary_window_position(
    app: &tauri::AppHandle,
    offset_x: f64,
    offset_y: f64,
) -> Option<LogicalPosition<f64>> {
    let window = app.get_webview_window("main")?;
    let scale_factor = window.scale_factor().ok()?;
    let position = window
        .outer_position()
        .ok()?
        .to_logical::<f64>(scale_factor);

    Some(LogicalPosition::new(
        position.x + offset_x,
        position.y + offset_y,
    ))
}

fn clamp_window_coordinate(
    candidate: f64,
    work_area_start: i32,
    work_area_span: u32,
    window_span: u32,
    margin: f64,
) -> i32 {
    let minimum = f64::from(work_area_start) + margin;
    let maximum = (f64::from(work_area_start) + f64::from(work_area_span)
        - f64::from(window_span)
        - margin)
        .max(minimum);

    candidate.clamp(minimum, maximum).round() as i32
}

#[cfg(test)]
mod icon_color_tests {
    use super::outline_color;

    #[test]
    fn creates_a_dark_tint_from_each_theme_color() {
        for color in [
            [11, 219, 4],
            [0, 168, 255],
            [173, 92, 255],
            [255, 0, 194],
            [0, 229, 255],
            [202, 171, 119],
        ] {
            let outline = outline_color(color);
            let luminance = (u16::from(outline[0])
                + u16::from(outline[1])
                + u16::from(outline[2]))
                / 3;

            assert!(luminance < 80);
            assert_ne!(outline[0], outline[1]);
        }
    }
}

#[cfg(test)]
mod window_position_tests {
    use super::clamp_window_coordinate;

    #[test]
    fn keeps_valid_negative_coordinates_unchanged() {
        assert_eq!(
            clamp_window_coordinate(-1000.0, -1920, 1920, 460, 30.0),
            -1000
        );
    }

    #[test]
    fn clamps_both_edges_of_a_left_hand_monitor() {
        assert_eq!(
            clamp_window_coordinate(-2500.0, -1920, 1920, 460, 30.0),
            -1890
        );
        assert_eq!(
            clamp_window_coordinate(-100.0, -1920, 1920, 460, 30.0),
            -490
        );
    }

    #[test]
    fn clamps_the_bottom_edge_of_any_monitor() {
        assert_eq!(
            clamp_window_coordinate(900.0, 0, 1040, 680, 30.0),
            330
        );
        assert_eq!(
            clamp_window_coordinate(-200.0, -1080, 1080, 680, 30.0),
            -710
        );
    }
}

fn settings_window_position(app: &tauri::AppHandle) -> Option<PhysicalPosition<i32>> {
    let main_window = app.get_webview_window("main")?;
    let settings_window = app.get_webview_window("settings")?;
    let main_position = main_window.outer_position().ok()?;
    let main_size = main_window.outer_size().ok()?;
    let main_center_x =
        f64::from(main_position.x) + f64::from(main_size.width) / 2.0;
    let main_center_y =
        f64::from(main_position.y) + f64::from(main_size.height) / 2.0;
    let monitor = app
        .monitor_from_point(main_center_x, main_center_y)
        .ok()
        .flatten()
        .or_else(|| app.primary_monitor().ok().flatten())?;
    let scale_factor = monitor.scale_factor();
    let work_area = monitor.work_area();
    let settings_size = settings_window.outer_size().ok()?;
    let margin = SETTINGS_WINDOW_MARGIN * scale_factor;
    let candidate_x =
        f64::from(main_position.x) + SETTINGS_WINDOW_OFFSET_X * scale_factor;
    let candidate_y =
        f64::from(main_position.y) + SETTINGS_WINDOW_OFFSET_Y * scale_factor;

    Some(PhysicalPosition::new(
        clamp_window_coordinate(
            candidate_x,
            work_area.position.x,
            work_area.size.width,
            settings_size.width,
            margin,
        ),
        clamp_window_coordinate(
            candidate_y,
            work_area.position.y,
            work_area.size.height,
            settings_size.height,
            margin,
        ),
    ))
}

fn position_settings_window(app: &tauri::AppHandle) {
    let Some(window) = app.get_webview_window("settings") else {
        return;
    };
    let Some(position) = settings_window_position(app) else {
        return;
    };

    let _ = window.set_position(position);
}

#[tauri::command]
async fn open_settings_window(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("settings") {
        position_settings_window(&app);
        let _ = window.show();
        let _ = window.set_focus();
        return Ok(());
    }

    let builder = tauri::WebviewWindowBuilder::new(
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
    .prevent_overflow_with_margin(tauri::LogicalSize::new(30.0, 30.0))
    .center();

    builder
        .build()
        .map(|_| position_settings_window(&app))
        .map_err(|error| error.to_string())
}

#[tauri::command]
async fn open_about_window(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("about") {
        if let Some(position) = auxiliary_window_position(&app, 60.0, 40.0) {
            let _ = window.set_position(position);
        }
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
        return Ok(());
    }

    let about_position = auxiliary_window_position(&app, 60.0, 40.0);

    let mut builder = tauri::WebviewWindowBuilder::new(
        &app,
        "about",
        tauri::WebviewUrl::App("about.html".into()),
    )
    .title("About BSL-Timer")
    .inner_size(360.0, 335.0)
    .resizable(false)
    .visible(false)
    .focused(false)
    .decorations(true)
    .skip_taskbar(true)
    .always_on_top(false)
    .prevent_overflow_with_margin(tauri::LogicalSize::new(20.0, 20.0));

    builder = match about_position {
        Some(position) => builder.position(position.x, position.y),
        None => builder.center(),
    };

    builder
        .build()
        .map(|_| ())
        .map_err(|error| error.to_string())
}

#[tauri::command]
async fn open_whats_new_window(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("whats-new") {
        if let Some(position) = auxiliary_window_position(&app, 80.0, 60.0) {
            let _ = window.set_position(position);
        }
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
        return Ok(());
    }

    let whats_new_position = auxiliary_window_position(&app, 80.0, 60.0);

    let mut builder = tauri::WebviewWindowBuilder::new(
        &app,
        "whats-new",
        tauri::WebviewUrl::App("whats-new.html".into()),
    )
    .title("What’s New in BSL-Timer")
    .inner_size(430.0, 380.0)
    .min_inner_size(390.0, 320.0)
    .resizable(true)
    .visible(false)
    .focused(false)
    .decorations(true)
    .skip_taskbar(true)
    .always_on_top(false)
    .prevent_overflow_with_margin(tauri::LogicalSize::new(20.0, 20.0));

    builder = match whats_new_position {
        Some(position) => builder.position(position.x, position.y),
        None => builder.center(),
    };

    builder
        .build()
        .map(|_| ())
        .map_err(|error| error.to_string())
}

#[tauri::command]
async fn open_date_countdown_editor_window(
    app: tauri::AppHandle,
) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(DATE_COUNTDOWN_EDITOR_LABEL) {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
        return Ok(());
    }

    tauri::WebviewWindowBuilder::new(
        &app,
        DATE_COUNTDOWN_EDITOR_LABEL,
        tauri::WebviewUrl::App("date-countdown-editor.html".into()),
    )
    .title("Event")
    .inner_size(460.0, 650.0)
    .min_inner_size(420.0, 540.0)
    .resizable(true)
    .visible(false)
    .focused(false)
    .decorations(true)
    .skip_taskbar(true)
    .always_on_top(false)
    .prevent_overflow_with_margin(tauri::LogicalSize::new(24.0, 24.0))
    .center()
    .build()
    .map(|_| ())
    .map_err(|error| error.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Keep the live window separate from the installed shortcut identity so
    // Windows uses the dynamic WM_SETICON taskbar icon instead of the static app icon.
    #[cfg(target_os = "windows")]
    {
        let runtime_app_id: Vec<u16> = "ru.bsl-world.bsl-timer.runtime"
            .encode_utf16()
            .chain(std::iter::once(0))
            .collect();
        let _ = unsafe { SetCurrentProcessExplicitAppUserModelID(runtime_app_id.as_ptr()) };
    }
    let tray_visual_state = TrayVisualState::default();
    let tray_preview_state = TrayPreviewState::default();
    #[cfg(target_os = "windows")]
    let taskbar_icon_state = TaskbarIconState::default();

    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(AudioEngine::default())
        .manage(tray_visual_state.clone())
        .manage(tray_preview_state.clone());

    #[cfg(target_os = "windows")]
    let builder = builder.manage(taskbar_icon_state);

    builder
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            if !contains_autostart_arg(&args) {
                show_main_window(app);
            }
        }))
        .plugin(
            tauri_plugin_autostart::Builder::new()
                .arg(AUTOSTART_ARG)
                .app_name("BSL-Timer")
                .build(),
        )
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
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
            hide_tray_informer,
            is_autostart_enabled,
            is_audio_output_device_available,
            load_application_desktop_settings_section,
            load_shared_desktop_settings_section,
            list_audio_output_devices,
            list_windows_sounds,
            open_about_window,
            open_date_countdown_editor_window,
            open_settings_window,
            open_whats_new_window,
            play_audio_signal,
            remove_application_desktop_settings_section,
            save_application_desktop_settings_section,
            save_shared_desktop_settings_section,
            set_autostart_enabled,
            set_main_window_transparency,
            show_tray_informer,
            stop_audio_playback,
            update_taskbar_icon,
            update_tray_icon
        ])
        .setup(move |app| {
            let window = app.get_webview_window("main").unwrap();

            if is_autostart_launch() {
                let _ = window.hide();
            }

            let tray_preview_window = tauri::WebviewWindowBuilder::new(
                app,
                TRAY_PREVIEW_LABEL,
                tauri::WebviewUrl::App("tray-preview.html".into()),
            )
            .title("BSL-Timer")
            .inner_size(TRAY_PREVIEW_WIDTH, TRAY_PREVIEW_HEIGHT)
            .resizable(false)
            .visible(false)
            .focused(false)
            .decorations(false)
            .skip_taskbar(true)
            .always_on_top(true)
            .transparent(true)
            .build()?;

            let _ = tray_preview_window.set_ignore_cursor_events(true);

            let open_item = MenuItem::with_id(app, "open", "Open BSL-Timer", true, None::<&str>)?;
            let exit_item = MenuItem::with_id(app, "exit", "Exit", true, None::<&str>)?;
            let tray_menu = Menu::with_items(app, &[&open_item, &exit_item])?;

            let preview_state_for_menu = tray_preview_state.clone();
            let preview_state_for_tray = tray_preview_state.clone();

            TrayIconBuilder::with_id(TRAY_ICON_ID)
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("BSL-Timer")
                .menu(&tray_menu)
                .show_menu_on_left_click(false)
                .on_menu_event(move |app, event| match event.id.as_ref() {
                    "open" => {
                        hide_tray_preview(app, &preview_state_for_menu);
                        show_main_window(app);
                    }
                    "exit" => {
                        hide_tray_preview(app, &preview_state_for_menu);
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.emit("tray-exit-requested", ());
                        }
                    }
                    _ => {}
                })
                .on_tray_icon_event(move |tray, event| match event {
                    TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } => {
                        hide_tray_preview(tray.app_handle(), &preview_state_for_tray);
                        toggle_main_window(tray.app_handle());
                    }
                    TrayIconEvent::Enter { position, rect, .. } => {
                        schedule_tray_preview(
                            tray.app_handle(),
                            &preview_state_for_tray,
                            position,
                            rect,
                        );
                    }
                    TrayIconEvent::Leave { .. } => {}
                    _ => {}
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
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
