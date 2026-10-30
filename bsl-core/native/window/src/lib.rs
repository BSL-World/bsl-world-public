use tauri::{Runtime, WebviewWindow};

/// Apply the family window material without changing opacity of text or controls.
pub fn apply_window_appearance<R: Runtime>(
    window: &WebviewWindow<R>,
    mode: &str,
    transparency: u8,
) -> Result<(), String> {
    if !matches!(mode, "system" | "light" | "dark" | "glass") {
        return Err("Unsupported window appearance".into());
    }
    #[cfg(windows)]
    {
        #[cfg(feature = "composition-preview")]
        {
            let handle = window.hwnd().map_err(|e| e.to_string())?.0;
            if mode == "glass" {
                window_vibrancy::clear_blur(window).map_err(|e| e.to_string())?;
                let sigma = std::env::var("BSL_GLASS_BLUR_SIGMA").ok()
                    .and_then(|value| value.parse::<f32>().ok()).unwrap_or(0.75);
                if !sigma.is_finite() || !(0.0..=8.0).contains(&sigma) {
                    return Err("Glass blur sigma must be between 0 and 8".into());
                }
                let result = unsafe { bsl_composition_apply(handle, sigma) };
                if result < 0 {
                    let _ = unsafe { bsl_composition_clear(handle) };
                    let _ = window_vibrancy::clear_blur(window);
                    return Err(format!("Glass composition failed: 0x{:08X}", result as u32));
                }
                eprintln!("Glass native composition active: sigma={sigma}");
                return Ok(());
            }
            let result = unsafe { bsl_composition_clear(handle) };
            if result < 0 { return Err(format!("Glass cleanup failed: {result}")); }
        }
        if mode == "glass" {
            window_vibrancy::clear_blur(window).map_err(|error| error.to_string())
        } else {
            let alpha = (((100 - transparency.min(90)) as f64 / 100.0) * 255.0).round() as u8;
            window_vibrancy::apply_blur(window, Some((18, 18, 18, alpha)))
                .map_err(|error| error.to_string())
        }
    }
    #[cfg(not(windows))]
    {
        let _ = (window, transparency);
        Ok(())
    }
}

#[cfg(all(windows, feature = "composition-preview"))]
extern "C" {
    fn bsl_composition_apply(handle: *mut std::ffi::c_void, sigma: f32) -> i32;
    fn bsl_composition_clear(handle: *mut std::ffi::c_void) -> i32;
}
