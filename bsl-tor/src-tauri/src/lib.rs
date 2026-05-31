use std::fs;
use std::io::{self, Write};
use std::path::PathBuf;
use std::process::Command;
use tauri::Manager;
use zip::ZipArchive;

#[tauri::command]
fn update_bridges(bridges: String) -> Result<String, String> {
    let processed_bridges: String = bridges
        .lines()
        .filter(|line| !line.trim().is_empty())
        .map(|line| {
            let trimmed = line.trim();
            if trimmed.starts_with("Bridge ") {
                trimmed.to_string()
            } else {
                format!("Bridge {}", trimmed)
            }
        })
        .collect::<Vec<_>>()
        .join("\n");

    let torrc_content = format!(
        "# Enable bridges\nUseBridges 1\n\n\
         # Client transport plugin\n\
         ClientTransportPlugin webtunnel,obfs4 exec C:\\Tor\\pluggable_transports\\lyrebird.exe\n\n\
         # Bridges\n{}\n\n\
         # Logging\nLog notice file C:\\Tor\\Data\\Tor\\notice.log\n",
        processed_bridges
    );

    let torrc_path = PathBuf::from("C:\\Tor\\torrc");
    let mut file = fs::File::create(&torrc_path)
        .map_err(|e| format!("Cannot create torrc: {}", e))?;
    file.write_all(torrc_content.as_bytes())
        .map_err(|e| format!("Cannot write torrc: {}", e))?;

    // Restart Tor service to apply new bridges
    Command::new("sc").args(["stop", "Tor"]).output().ok();
    std::thread::sleep(std::time::Duration::from_secs(3));
    Command::new("sc").args(["start", "Tor"]).output().ok();

    Ok("Bridges updated and Tor service restarted.".to_string())
}

#[tauri::command]
fn close_window(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        window.close().map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn extract_tor(archive_path: &PathBuf) -> Result<(), String> {
    let tor_dir = PathBuf::from("C:\\Tor");
    fs::create_dir_all(&tor_dir).map_err(|e| format!("Failed to create C:\\Tor: {}", e))?;

    let zip_file = fs::File::open(archive_path)
        .map_err(|e| format!("Cannot open archive: {}", e))?;
    let mut archive = ZipArchive::new(zip_file)
        .map_err(|e| format!("Cannot read zip: {}", e))?;

    for i in 0..archive.len() {
        let mut file = archive.by_index(i)
            .map_err(|e| format!("Zip entry error: {}", e))?;
        let name = file.name().to_string();
        let out_path = tor_dir.join(&name);

        if name.ends_with('/') || name.ends_with('\\') {
            fs::create_dir_all(&out_path).map_err(|e| format!("Create dir error: {}", e))?;
        } else {
            if let Some(parent) = out_path.parent() {
                fs::create_dir_all(parent).map_err(|e| format!("Create parent dir error: {}", e))?;
            }
            let mut out_file = fs::File::create(&out_path)
                .map_err(|e| format!("Create file error: {}", e))?;
            io::copy(&mut file, &mut out_file)
                .map_err(|e| format!("Copy error: {}", e))?;
        }
    }

    Ok(())
}

pub fn run_install() {
    let args: Vec<String> = std::env::args().collect();
    let archive_path = if args.len() > 2 {
        PathBuf::from(&args[2])
    } else {
        let exe_dir = std::env::current_exe()
            .ok()
            .and_then(|p| p.parent().map(|p| p.to_path_buf()))
            .unwrap_or_else(|| PathBuf::from("."));
        exe_dir.join("tor.zip")
    };

    if !archive_path.exists() {
        eprintln!("Error: tor.zip not found at {}", archive_path.display());
        std::process::exit(1);
    }

    match extract_tor(&archive_path) {
        Ok(_) => println!("Tor files extracted to C:\\Tor"),
        Err(e) => {
            eprintln!("Error extracting archive: {}", e);
            std::process::exit(1);
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let data_dir = PathBuf::from("C:\\ProgramData\\BSL Tor\\WebView2");
            fs::create_dir_all(&data_dir).ok();

            let _main_window = tauri::WebviewWindowBuilder::new(
                app,
                "main",
                tauri::WebviewUrl::App("index.html".into()),
            )
            .title("BSL Tor Installer")
            .inner_size(800.0, 600.0)
            .data_directory(data_dir)
            .build()?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![update_bridges, close_window])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}