//! Per-window Glass surfaces. All native work runs on the owning UI thread.

pub async fn configure_glass_surface(
    window: tauri::WebviewWindow,
    x: f32, y: f32, width: f32, height: f32,
    radius: f32, depth: f32, enabled: bool, rounded: bool, viewport_width: f32, density: Option<f32>,
    button_rects: Option<Vec<[f32;4]>>, pressed_rect: Option<[f32;4]>, pressed_travel: Option<f32>,
    surface_tint: Option<[f32;3]>,
) -> Result<serde_json::Value, String> {
    #[cfg(all(windows, feature = "glass-surface"))]
    {
        let density=density.unwrap_or(1.0);
        let buttons=button_rects.unwrap_or_default();let pressed=pressed_rect.unwrap_or([0.0;4]);let travel=pressed_travel.unwrap_or(0.0);
        let tint=surface_tint.unwrap_or([0.79,0.89,0.93]);
        if tint.iter().any(|v|!v.is_finite()||!(0.0..=1.0).contains(v)){return Err("Invalid surface tint".into());}
        if buttons.len()>64||buttons.iter().flatten().chain(pressed.iter()).any(|v|!v.is_finite()||*v<0.0||*v>4000.0)||!travel.is_finite()||!(0.0..=6.0).contains(&travel){return Err("Invalid control geometry".into());}
        if [x,y,width,height,radius,depth,viewport_width,density].iter().any(|n| !n.is_finite())
            || x < 0.0 || y < 0.0 || !(64.0..=2000.0).contains(&width)
            || !(64.0..=1200.0).contains(&height) || !(0.0..=80.0).contains(&radius)
            || !(0.0..=24.0).contains(&depth) || !(128.0..=4000.0).contains(&viewport_width) || !(0.2..=2.0).contains(&density) {
            return Err("Invalid optics geometry".into());
        }
        let (tx, rx) = std::sync::mpsc::channel();
        let ui_window = window.clone();
        window.run_on_main_thread(move || {
            let result = (|| -> Result<serde_json::Value,String> {
                let handle = ui_window.hwnd().map_err(|e| e.to_string())?.0;
                #[cfg(feature = "composition-preview")]
                if unsafe { bsl_glass_surface_session(handle) } == 0 {
                    let cleared=unsafe { super::bsl_composition_clear(handle) };
                    if cleared<0{return Err(format!("Previous material cleanup failed: {cleared}"));}
                }
                let dpi = ui_window.inner_size().map_err(|e| e.to_string())?.width as f32 / viewport_width;
                let mut cells = 0u32;
                let mut milliseconds = 0f32;
                let slots:Vec<f32>=buttons.iter().flatten().map(|v|v*dpi).collect();let press=pressed.map(|v|v*dpi);
                let result = unsafe { bsl_glass_surface_apply(handle, x*dpi, y*dpi, width*dpi, height*dpi, radius*dpi, depth*dpi, enabled, rounded, density, slots.as_ptr(), buttons.len() as u32, press.as_ptr(), travel*dpi, tint.as_ptr(), &mut cells, &mut milliseconds) };
                if result < 0 { return Err(format!("Native optics failed: 0x{:08X}",result as u32)); }
                Ok(serde_json::json!({"cells":cells,"milliseconds":milliseconds,"dpi":dpi,"enabled":enabled,"hwnd":handle as usize,"session":unsafe{bsl_glass_surface_session(handle)}}))
            })();
            let _ = tx.send(result);
        }).map_err(|e| e.to_string())?;
        return tauri::async_runtime::spawn_blocking(move || rx.recv().map_err(|e| e.to_string())?)
            .await.map_err(|e| e.to_string())?;
    }
    #[cfg(not(all(windows, feature = "glass-surface")))]
    {
        let _ = (window,x,y,width,height,radius,depth,enabled,rounded,viewport_width,density,button_rects,pressed_rect,pressed_travel,surface_tint);
        Err("Optics study is not included in this build".into())
    }
}

#[cfg(all(windows, feature = "glass-surface"))]
extern "C" {
    fn bsl_glass_surface_apply(handle: *mut std::ffi::c_void, x: f32, y: f32, width: f32, height: f32, radius: f32, depth: f32, enabled: bool, rounded: bool, density: f32, buttons: *const f32, button_count: u32, pressed: *const f32, travel: f32, tint: *const f32, cells: *mut u32, milliseconds: *mut f32) -> i32;
    fn bsl_glass_surface_layer(handle: *mut std::ffi::c_void, session: u64, layer: u32, pixels: *const u8, width: u32, height: u32) -> i32;
    fn bsl_glass_surface_session(handle: *mut std::ffi::c_void) -> u64;
    fn bsl_glass_surface_release(handle: *mut std::ffi::c_void, session: u64) -> i32;
    fn bsl_glass_surface_visible(handle: *mut std::ffi::c_void, session: u64, visible: bool) -> i32;
}

pub async fn set_glass_surface_interior(window: tauri::WebviewWindow, png: Vec<u8>, session: Option<u64>) -> Result<(),String> {
    
    if png.len()>4_000_000{return Err("Internal layer is too large".into());}
    let image=tauri::image::Image::from_bytes(&png).map_err(|e|e.to_string())?;
    let pixels=image.rgba().to_vec();let width=image.width();let height=image.height();
    if width>4096||height>4096{return Err("Internal layer dimensions are too large".into());}
    let(tx,rx)=std::sync::mpsc::channel();let ui_window=window.clone();
    window.run_on_main_thread(move||{
        let result=(||->Result<(),String>{let handle=ui_window.hwnd().map_err(|e|e.to_string())?.0;let result=unsafe{bsl_glass_surface_layer(handle,session.unwrap_or(0),1,pixels.as_ptr(),width,height)};if result<0{return Err(format!("Internal layer failed: 0x{:08X}",result as u32));}Ok(())})();let _=tx.send(result);
    }).map_err(|e|e.to_string())?;
    tauri::async_runtime::spawn_blocking(move||rx.recv().map_err(|e|e.to_string())?).await.map_err(|e|e.to_string())?
}

pub async fn capture_glass_surface_ui(window: tauri::WebviewWindow, layer: Option<u32>, session: Option<u64>) -> Result<serde_json::Value,String> {
    use webview2_com::{CapturePreviewCompletedHandler,Microsoft::Web::WebView2::Win32::COREWEBVIEW2_CAPTURE_PREVIEW_IMAGE_FORMAT_PNG};
    use windows::Win32::System::Com::{StructuredStorage::CreateStreamOnHGlobal,STATSTG,STATFLAG_NONAME,STREAM_SEEK_SET};
    
    let layer=layer.unwrap_or(0);
    if ![0,2,3,4].contains(&layer){return Err("Invalid UI layer".into());}
    let handle=window.hwnd().map_err(|e|e.to_string())?.0 as usize;
    let(tx,rx)=std::sync::mpsc::channel();
    window.with_webview(move|webview|{
        let failed=tx.clone();
        let setup=(||->windows::core::Result<()>{unsafe{
            let expected_session=session.unwrap_or_else(||bsl_glass_surface_session(handle as *mut std::ffi::c_void));
            let stream=CreateStreamOnHGlobal(windows::Win32::Foundation::HGLOBAL::default(),true)?;
            let read_stream=stream.clone();
            let completed=CapturePreviewCompletedHandler::create(Box::new(move|status|{
                let result=(||->Result<serde_json::Value,String>{
                    status.map_err(|e|e.to_string())?;
                    let mut stat=STATSTG::default();read_stream.Stat(&mut stat,STATFLAG_NONAME).map_err(|e|e.to_string())?;
                    if stat.cbSize>8_000_000{return Err("UI capture is too large".into());}
                    read_stream.Seek(0,STREAM_SEEK_SET,None).map_err(|e|e.to_string())?;
                    let mut png=vec![0u8;stat.cbSize as usize];let mut read=0;
                    read_stream.Read(png.as_mut_ptr().cast(),png.len() as u32,Some(&mut read)).ok().map_err(|e|e.to_string())?;png.truncate(read as usize);
                    let image=tauri::image::Image::from_bytes(&png).map_err(|e|e.to_string())?;
                    let result=bsl_glass_surface_layer(handle as *mut std::ffi::c_void,expected_session,layer,image.rgba().as_ptr(),image.width(),image.height());
                    if result<0{return Err(format!("UI layer failed: 0x{:08X}",result as u32));}
                    Ok(serde_json::json!({"width":image.width(),"height":image.height(),"bytes":read}))
                })();let _=tx.send(result);Ok(())
            }));
            webview.controller().CoreWebView2()?.CapturePreview(COREWEBVIEW2_CAPTURE_PREVIEW_IMAGE_FORMAT_PNG,&stream,&completed)?;
            Ok(())
        }})();
        if let Err(error)=setup{let _=failed.send(Err(error.to_string()));}
    }).map_err(|e|e.to_string())?;
    tauri::async_runtime::spawn_blocking(move||rx.recv_timeout(std::time::Duration::from_secs(5)).map_err(|e|format!("Glass UI capture did not complete: {e}"))?).await.map_err(|e|e.to_string())?
}

pub async fn set_glass_surface_visible(window:tauri::WebviewWindow,visible:bool,session:Option<u64>)->Result<(),String>{
    let(tx,rx)=std::sync::mpsc::channel();let ui_window=window.clone();
    window.run_on_main_thread(move||{let result=(||->Result<(),String>{let handle=ui_window.hwnd().map_err(|e|e.to_string())?.0;let result=unsafe{bsl_glass_surface_visible(handle,session.unwrap_or(0),visible)};if result<0{return Err(format!("Visibility failed: {result}"));}Ok(())})();let _=tx.send(result);}).map_err(|e|e.to_string())?;
    tauri::async_runtime::spawn_blocking(move||rx.recv().map_err(|e|e.to_string())?).await.map_err(|e|e.to_string())?
}


/// Also released automatically on HWND destruction. Explicit disposal restores owned window state.
pub async fn release_glass_surface(window:tauri::WebviewWindow,session:Option<u64>)->Result<(),String>{
 let(tx,rx)=std::sync::mpsc::channel();let target=window.clone();
 window.run_on_main_thread(move||{let result=(||->Result<(),String>{let handle=target.hwnd().map_err(|e|e.to_string())?.0;let result=unsafe{bsl_glass_surface_release(handle,session.unwrap_or(0))};if result<0{return Err(format!("Surface cleanup failed: {result}"));}Ok(())})();let _=tx.send(result);}).map_err(|e|e.to_string())?;
 tauri::async_runtime::spawn_blocking(move||rx.recv().map_err(|e|e.to_string())?).await.map_err(|e|e.to_string())?
}

#[cfg(feature = "composition-preview")]
pub(super) unsafe fn is_attached(handle:*mut std::ffi::c_void)->bool {bsl_glass_surface_session(handle)!=0}
