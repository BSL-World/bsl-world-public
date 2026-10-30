fn main() {
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
