//! Timer command policy and compatibility bridge. Rendering belongs to desktop-core.
use bsl_desktop_window::glass;
fn check_main(window:&tauri::WebviewWindow)->Result<(),String>{
 if window.label()!="main"{return Err("Glass is restricted to the main window".into());}Ok(())
}
#[tauri::command]
pub async fn set_glass_optics(
    window: tauri::WebviewWindow,
    x: f32, y: f32, width: f32, height: f32,
    radius: f32, depth: f32, enabled: bool, rounded: bool, viewport_width: f32, density: Option<f32>,
    button_rects: Option<Vec<[f32;4]>>, pressed_rect: Option<[f32;4]>, pressed_travel: Option<f32>,
    surface_tint: Option<[f32;3]>,
) -> Result<serde_json::Value, String> {
 check_main(&window)?;
 glass::configure_glass_surface(window,x,y,width,height,radius,depth,enabled,rounded,viewport_width,density,button_rects,pressed_rect,pressed_travel,surface_tint).await
}
#[tauri::command]
pub async fn set_glass_device_internal(window:tauri::WebviewWindow,png:Vec<u8>,session:Option<u64>)->Result<(),String>{
 check_main(&window)?;glass::set_glass_surface_interior(window,png,session).await
}
#[tauri::command]
pub async fn capture_glass_device_ui(window:tauri::WebviewWindow,layer:Option<u32>,session:Option<u64>)->Result<serde_json::Value,String>{
 check_main(&window)?;glass::capture_glass_surface_ui(window,layer,session).await
}
#[tauri::command]
pub async fn set_glass_device_visible(window:tauri::WebviewWindow,visible:bool,session:Option<u64>)->Result<(),String>{
 check_main(&window)?;glass::set_glass_surface_visible(window,visible,session).await
}
#[tauri::command]
pub async fn release_glass_device(window:tauri::WebviewWindow,session:Option<u64>)->Result<(),String>{
 check_main(&window)?;glass::release_glass_surface(window,session).await
}

#[cfg(all(windows, feature = "glass-device"))]
pub fn launch(app: &mut tauri::App) -> Result<(),Box<dyn std::error::Error>> {
    use tauri::Manager;
    if std::env::var_os("BSL_GLASS_OPTICS_STUDY").is_none() { return Ok(()); }
    let probe = app.get_webview_window("main").ok_or("Study window is missing")?;
    bsl_desktop_window::apply_window_appearance(&probe,"glass",50)?;
    probe.set_title("BSL-Timer — Glass")?;
    let exit_handle = app.handle().clone();
    probe.on_window_event(move |event| {
        if matches!(event,tauri::WindowEvent::CloseRequested {..}) { exit_handle.exit(0); }
    });
    probe.set_focus()?;
    Ok(())
}
