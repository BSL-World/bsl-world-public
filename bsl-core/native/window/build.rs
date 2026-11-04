fn main() {
    #[cfg(all(windows, feature = "glass-surface"))]
    {
        cc::Build::new().cpp(true).std("c++17").flag("/EHsc")
            .define("UNICODE", None).define("_UNICODE", None)
            .file("src/glass_surface.cpp").compile("bsl_glass_surface");
        for library in ["windowsapp", "CoreMessaging", "user32", "comctl32", "d3d11", "dxgi", "d3dcompiler", "dwmapi"] {
            println!("cargo:rustc-link-lib={library}");
        }
        println!("cargo:rerun-if-changed=src/glass_surface.cpp");
    }
    #[cfg(all(windows, feature = "composition-preview"))]
    {
        cc::Build::new().cpp(true).std("c++17").flag("/EHsc")
            .define("UNICODE", None).define("_UNICODE", None)
            .file("src/composition.cpp").compile("bsl_glass_composition");
        for library in ["windowsapp", "CoreMessaging", "user32", "d2d1", "comctl32"] {
            println!("cargo:rustc-link-lib={library}");
        }
        println!("cargo:rerun-if-changed=src/composition.cpp");
    }
}
