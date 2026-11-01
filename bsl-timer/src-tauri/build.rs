fn main() {
    #[cfg(all(windows, feature = "glass-device"))]
    {
        cc::Build::new().cpp(true).std("c++17").flag("/EHsc")
            .define("UNICODE", None).define("_UNICODE", None)
            .file("src/glass_optics.cpp").compile("bsl_timer_glass_optics");
        for library in ["windowsapp", "CoreMessaging", "user32", "comctl32", "d3d11", "dxgi", "d3dcompiler", "dwmapi"] {
            println!("cargo:rustc-link-lib={library}");
        }
        println!("cargo:rerun-if-changed=src/glass_optics.cpp");
    }
    tauri_build::build()
}
