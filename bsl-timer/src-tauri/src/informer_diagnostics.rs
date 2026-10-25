//! Temporary informer instrumentation. Enabled only in explicitly marked builds.
use std::{
    fs,
    io::Write,
    sync::Mutex,
    time::{SystemTime, UNIX_EPOCH},
};
use tauri::Manager;

static LOG_LOCK: Mutex<()> = Mutex::new(());

pub fn enabled() -> bool {
    option_env!("BSL_TIMER_INFORMER_DIAGNOSTICS") == Some("1")
}

pub fn record(app: &tauri::AppHandle, source: &str, event: &str, details: serde_json::Value) {
    if !enabled() {
        return;
    }
    // Query window state before acquiring the file lock: a worker may need
    // the UI thread, which can itself be writing a diagnostic record.
    let window = app.get_webview_window("tray-preview");
    let window_state = window.as_ref().map(|w| {
        serde_json::json!({
            "visible": w.is_visible().ok(),
            "position": w.outer_position().ok().map(|p| [p.x, p.y]),
            "size": w.outer_size().ok().map(|s| [s.width, s.height])
        })
    });
    // Diagnostics must never interrupt showing or hiding the informer.
    let _ = (|| -> Result<(), Box<dyn std::error::Error>> {
        let _guard = LOG_LOCK
            .lock()
            .map_err(|_| "diagnostic log lock poisoned")?;
        let directory = app.path().app_local_data_dir()?;
        fs::create_dir_all(&directory)?;
        let path = directory.join("informer-diagnostic.jsonl");
        if fs::metadata(&path)
            .map(|m| m.len() > 10 * 1024 * 1024)
            .unwrap_or(false)
        {
            let previous = directory.join("informer-diagnostic.previous.jsonl");
            if previous.exists() {
                fs::remove_file(&previous)?;
            }
            fs::rename(&path, &previous)?;
        }
        let timestamp_ms = SystemTime::now().duration_since(UNIX_EPOCH)?.as_millis();
        let row = serde_json::json!({
            "timestamp_ms": timestamp_ms, "pid": std::process::id(),
            "version": app.package_info().version.to_string(),
            "source": source, "event": event, "details": details,
            "informer_window": window_state
        });
        let mut file = fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(path)?;
        writeln!(file, "{}", row)?;
        Ok(())
    })();
}

pub fn operation(
    app: &tauri::AppHandle,
    event: &str,
    generation: u64,
    result: Result<(), String>,
) -> Result<(), String> {
    record(
        app,
        "native",
        event,
        serde_json::json!({
            "generation": generation, "ok": result.is_ok(), "error": result.as_ref().err()
        }),
    );
    result
}

#[tauri::command]
pub fn informer_diagnostics_enabled() -> bool {
    enabled()
}

#[tauri::command]
pub fn log_informer_diagnostic(
    app: tauri::AppHandle,
    window: tauri::WebviewWindow,
    event: String,
    details: serde_json::Value,
) {
    if !enabled() || !matches!(window.label(), "main" | "tray-preview") {
        return;
    }
    if event.len() > 100 || details.to_string().len() > 8192 {
        return;
    }
    record(&app, window.label(), &event, details);
}
