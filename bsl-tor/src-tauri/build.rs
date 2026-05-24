fn main() {
    // Request administrator privileges via manifest
    if std::env::var("CARGO_CFG_TARGET_OS").unwrap() == "windows" {
        std::env::set_var(
            "TAURI_WINDOWS_EXECUTABLE_MANIFEST",
            "requireAdministrator"
        );
    }
    tauri_build::build()
}