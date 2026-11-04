// Timer-local GPU optical study. No captured desktop image is persisted.
#define WIN32_LEAN_AND_MEAN
#define NOMINMAX
#include <windows.h>
#include <commctrl.h>
#include <dispatcherqueue.h>
#include <dwmapi.h>
#include <d3d11.h>
#include <dxgi1_2.h>
#include <d3dcompiler.h>
#include <windows.ui.composition.interop.h>
#include <winrt/Windows.Foundation.h>
#include <winrt/Windows.System.h>
#include <winrt/Windows.UI.Composition.h>
#include <winrt/Windows.UI.Composition.Desktop.h>
#include <algorithm>
#include <chrono>
#include <cmath>
#include <iostream>
#include <memory>
#include <vector>
#include <unordered_map>
using namespace winrt;
using namespace Windows::UI::Composition;
namespace {
constexpr UINT_PTR timer_id=0x42534C4F;
constexpr UINT capture_pause=WM_APP+0x170,capture_resume=WM_APP+0x171;
constexpr DWORD exclude_capture=0x11;
const char shader[]=R"HLSL(
cbuffer Parameters:register(b0){float2 lens;float2 capture;float2 origin;float radius;float depth;float enabled;float rounded;float2 padding;float2 uiSize;float2 uiOrigin;float2 internalSize;float2 layerPadding;float4 surfaceTint;};
cbuffer ControlParameters:register(b1){float4 buttonRects[64];float4 pressedRect;float4 interaction;};
Texture2D backdrop:register(t0);Texture2D uiLayer:register(t1);Texture2D internalLayer:register(t2);SamplerState linearClamp:register(s0);
Texture2D textMask:register(t3);
struct Vertex{float4 position:SV_Position;float2 uv:TEXCOORD0;};
Vertex vs(uint id:SV_VertexID){Vertex v;v.uv=float2((id<<1)&2,id&2);v.position=float4(v.uv*float2(2,-2)+float2(-1,1),0,1);return v;}
float distanceToFace(float2 p){float2 q=abs(p-lens*.5)-lens*.5+radius;return length(max(q,0))+min(max(q.x,q.y),0)-radius;}
float enterBox(float2 p,float2 d,float2 low,float2 high){
 float2 a=(p-high)/d,b=(p-low)/d;
 float first=max(0,max(a.x,a.y)),last=min(1,min(b.x,b.y));
 return first<=last?first:2;
}
float enterFace(float2 p,float2 d){
 float hit=min(enterBox(p,d,float2(radius,0),float2(lens.x-radius,lens.y)),enterBox(p,d,float2(0,radius),float2(lens.x,lens.y-radius)));
 float aa=dot(d,d);
 [unroll]for(int i=0;i<4;i++){
  float2 center=float2((i&1)?lens.x-radius:radius,(i&2)?lens.y-radius:radius);
  float2 q=p-center;float b=dot(q,d),disc=b*b-aa*(dot(q,q)-radius*radius);
  if(disc>=0){float t=(b-sqrt(disc))/aa;if(t>=0&&t<=1)hit=min(hit,t);}
 }
 return hit;
}
float4 finishSurface(float3 color,float2 p){
 if(uiSize.x>0){
  float2 q=uiOrigin+p;
  // Fixed collars belong to the front lid; the caps travel above them.
  [loop]for(int i=0;i<(int)interaction.y;i++){
   float4 b=buttonRects[i];float corner=b.w*.21;float lip=depth*.27;
   [branch]if(any(q<b.xy-lip)||any(q>b.xy+b.zw+lip))continue;
   float2 delta=abs(q-b.xy-b.zw*.5)-b.zw*.5+corner;
   float d=length(max(delta,0))+min(max(delta.x,delta.y),0)-corner;
   if(d<lip&&d>-depth*.12){
    float side=saturate((q.y-b.y)/b.w);
    float3 mount=lerp(float3(.75,.84,.87),float3(.22,.32,.39),side);
    float outer=1-smoothstep(lip-depth*.07,lip,d);
    color=lerp(color,mount,outer*.75);
   }else if(d<=-depth*.12)color=lerp(color,float3(.16,.22,.26),.17);
  }
  bool clearTop=false;
  if(interaction.x>0&&q.x>=pressedRect.x-1&&q.x<=pressedRect.x+pressedRect.z+1&&q.y>=pressedRect.y&&q.y<=pressedRect.y+pressedRect.w+depth*.42){
   clearTop=q.y<pressedRect.y+interaction.x;q.y-=interaction.x;
  }
  float2 uv=q/uiSize;
  float4 ui=clearTop?float4(0,0,0,0):uiLayer.Sample(linearClamp,uv);color=lerp(color,ui.rgb,ui.a);
  float4 glyph=textMask.Sample(linearClamp,uv);
  float coverage=clearTop?0:glyph.a;
  // Black RGB encodes engraved ink; alpha preserves glyph coverage.
  bool engraved=dot(glyph.rgb,float3(1,1,1))<.03;
  float4 upperCut=textMask.Sample(linearClamp,uv+float2(1,1)/uiSize);
  float4 lowerCut=textMask.Sample(linearClamp,uv-float2(1,1)/uiSize);
  float shadow=dot(upperCut.rgb,float3(1,1,1))<.03?max(0,upperCut.a-coverage):0;
  float highlight=dot(lowerCut.rgb,float3(1,1,1))<.03?max(0,lowerCut.a-coverage):0;
  float relief=saturate(depth/12);
  color=lerp(color,float3(.07,.10,.13),shadow*.18*relief);
  color=lerp(color,float3(.95,.98,1),highlight*.28*relief);
  float luminance=dot(pow(saturate(color),2.2),float3(.2126,.7152,.0722));
  // The mask carries both glyph coverage and the selected palette hue.
  float3 hue=engraved?surfaceTint.rgb:glyph.rgb;
  float3 darkInk=lerp(float3(.055,.060,.065),hue,.16);
  float3 lightInk=lerp(float3(.96,.965,.97),hue,.08);
  float3 ink=luminance>.20?darkInk:lightInk;
  color=lerp(color,ink,coverage);
 }
 return float4(saturate(color),1);
}
float4 ps(Vertex v):SV_Target{
 float extrusion=depth*1.35;
 float2 projection=float2(depth*.65,extrusion);
 // Pixel centers match the captured WebView texels; do not rescale the UI raster.
 float2 p=v.position.xy;
 if(depth<.001)return float4(.82,.12,.18,1);
 // The visible wall is a vertical extrusion of the rounded face contour.
 // Every pixel between the upper and lower contours belongs to material.
 bool wall=distanceToFace(p)>0;
 float2 surfacePoint=p;
 if(wall){
  float hit=enterFace(p,projection);
  if(hit>1)discard;
  surfacePoint=p-projection*hit;
 }
 float inside=-distanceToFace(surfacePoint);
 float t=saturate(inside/max(18,radius*.9));
 float edge=rounded>.5?pow(1-t,1.5):1-t*t*(3-2*t);
 float e=.35;
 float2 normal2=float2(distanceToFace(surfacePoint+float2(e,0))-distanceToFace(surfacePoint-float2(e,0)),distanceToFace(surfacePoint+float2(0,e))-distanceToFace(surfacePoint-float2(0,e)))/(2*e);
 normal2=length(normal2)>.001?normalize(normal2):0;
 float2 baseDisplacement=-(surfacePoint-lens*.5)*(depth/max(padding.y,1))*.003;
 float2 displacement=baseDisplacement-normal2*depth*.65*edge;
 bool fittedDevice=uiSize.x>0;
 float bevelWidth=fittedDevice?depth*.32:min(depth*.16,3*max(padding.y,1));
 bool facet=!wall&&inside<bevelWidth&&(fittedDevice||dot(normal2,projection)>0);
 float seam=1-smoothstep(depth*.025,depth*.075,abs(inside-bevelWidth));
 float rimLight=saturate(dot(normal2,normalize(float2(-.55,-.7))));
 float3 seamColor=lerp(float3(.16,.25,.30),float3(.96,.99,1),rimLight);
 if(facet||wall)displacement=baseDisplacement-normal2*depth*.52;
 float2 samplePosition=origin+surfacePoint+displacement*enabled;
 if(wall)samplePosition=origin+lerp(p,surfacePoint+displacement+(p-surfacePoint)*.35,enabled);
 if(padding.x>1.5&&padding.x<2.5)samplePosition=float2(samplePosition.y,capture.y-samplePosition.x);
 else if(padding.x>2.5&&padding.x<3.5)samplePosition=capture-samplePosition;
 else if(padding.x>3.5)samplePosition=float2(capture.x-samplePosition.y,samplePosition.x);
 float3 color=backdrop.Sample(linearClamp,samplePosition/capture).rgb;
 if(internalSize.x>0&&!wall){float4 electronics=internalLayer.Sample(linearClamp,(uiOrigin+surfacePoint+displacement*.45)/internalSize);color=lerp(color,electronics.rgb,electronics.a);}
 if(wall){
  // Constant inclination along each generatrix: a plane, not a shadow gradient.
  float3 sideNormal=normalize(float3(normal2,.04));
  float viewCos=saturate(dot(sideNormal,normalize(float3(0,.5,1))));
  float reflectance=.04+.96*pow(1-viewCos,5);
  color=lerp(color*lerp(float3(1,1,1),float3(.73,.83,.87),layerPadding.x),float3(.23,.30,.34),saturate(reflectance*.6*layerPadding.x));
  return finishSurface(color,p);
 }
 if(facet){
  // Constant 45-degree inclination across the strip, on every side of the lid.
  if(fittedDevice){
   float3 facetNormal=normalize(float3(normal2,1));
   float illumination=saturate(dot(facetNormal,normalize(float3(-.55,-.7,1))));
   float3 reflected=lerp(float3(.27,.40,.48),float3(.91,.98,1),illumination);
   color=lerp(color*(.72+.20*illumination),reflected,saturate((.18+.20*illumination)*layerPadding.x));
   color=lerp(color,seamColor,seam*.48);
  }else color=lerp(color*lerp(float3(1,1,1),float3(.87,.92,.94),layerPadding.x),float3(.72,.83,.88),.12*layerPadding.x);
  return finishSurface(color,p);
 }
 float2 faceUv=surfacePoint/lens;
 float3 n=normalize(float3(normal2*edge*.9+(surfacePoint-lens*.5)/lens*.13,1));
 float fresnel=.035+.965*pow(1-saturate(n.z),5);
 float3 light=normalize(float3(-.55,-.7,1));
 float broad=exp(-pow((faceUv.x-.15)/.6,2)-pow((faceUv.y+.22)/.8,2));
 float reflection=pow(saturate(dot(n,normalize(light+float3(0,0,1)))),64)*.19;
 color*=lerp(float3(1,1,1),float3(.965,.986,.995),layerPadding.x);
 color=lerp(color,float3(.91,.97,1),saturate((fresnel+reflection+broad*.10)*layerPadding.x));
 color+=pow(1-t,5)*saturate(dot(n,light))*.11*layerPadding.x;
 if(uiSize.x>0){
  // A continuous polished lid lies above the electronics and below fitted controls.
  // Broad reflected light describes the face even far away from its perimeter.
  float diagonal=faceUv.x*.78+faceUv.y*.32;
  float windowReflection=exp(-pow((diagonal-.28)/.30,2));
  float softBand=smoothstep(.20,.23,diagonal)*(1-smoothstep(.40,.43,diagonal));
  float coat=saturate((.08+.13*windowReflection+.18*softBand)*layerPadding.x);
  float3 coverTint=lerp(float3(.91,.94,.96),surfaceTint.rgb,.22);
  color=lerp(color*float3(.95,.955,.96),coverTint,coat);
  float reflectionEdge=exp(-pow((diagonal-.22)/.008,2))*.075;
  color=lerp(color,float3(.96,.99,1),reflectionEdge*layerPadding.x);
  // The inset closed contour is the meeting line of the face and bevel planes.
  color=lerp(color,seamColor,seam*.48);
 }
 return finishSurface(color,p);
})HLSL";
thread_local Windows::System::DispatcherQueueController shared_queue{nullptr};
thread_local unsigned long long next_session=1;
void releaseSurface(HWND window);
struct Optics {
 unsigned long long session=next_session++;
 HWND window{};LONG_PTR original_style=0;DWORD original_affinity=0;
 
 Compositor compositor{nullptr};
 Windows::UI::Composition::Desktop::DesktopWindowTarget target{nullptr};
 ContainerVisual root{nullptr};SpriteVisual pane{nullptr};
 CompositionRoundedRectangleGeometry clip{nullptr};
 com_ptr<ID3D11Device> device;com_ptr<ID3D11DeviceContext> context;
 com_ptr<IDXGIOutputDuplication> duplication;com_ptr<IDXGIOutput1> capture_output;DXGI_OUTPUT_DESC output{};
 com_ptr<IDXGISwapChain1> swapchain;com_ptr<ID3D11RenderTargetView> destination;
 com_ptr<ID3D11Texture2D> background;com_ptr<ID3D11ShaderResourceView> source;
 com_ptr<ID3D11Texture2D> ui_texture,internal_texture;com_ptr<ID3D11ShaderResourceView> ui_source,internal_source;
 com_ptr<ID3D11Texture2D> text_texture;com_ptr<ID3D11ShaderResourceView> text_source;
 std::vector<unsigned char> text_pixels,pending_ui_pixels;
 unsigned text_width=0,text_height=0,pending_ui_width=0,pending_ui_height=0;
 bool adaptive_ui=false;
 std::vector<unsigned char> ui_pixels,internal_pixels;
 unsigned ui_width=0,ui_height=0,internal_width=0,internal_height=0;
 bool visible=true,show_after_frame=false;
 float surface_tint[3]={.79f,.89f,.93f};
 com_ptr<ID3D11VertexShader> vertex;com_ptr<ID3D11PixelShader> pixel;
 com_ptr<ID3D11Buffer> constants;com_ptr<ID3D11SamplerState> sampler;
 com_ptr<ID3D11Buffer> control_constants;
 float button_rects[256]={},pressed_rect[4]={},pressed_travel=0;unsigned button_count=0;
 unsigned window_width=0,window_height=0,pane_width=0,pane_height=0,texture_width=0,texture_height=0;
 float x=0,y=0,w=1,h=1,radius=25,depth=12,density=1;
 bool enabled=true,rounded=true,dirty=true,paused=false,has_frame=false,needs_reset=false;
 ULONGLONG paused_until=0,retry_after=0;
 bool screenshot_mode=false,screenshot_keys=false;
 DWORD screenshot_clipboard=0;ULONGLONG screenshot_deadline=0;
 void screenshotMode(bool active){
  if(active==screenshot_mode)return;
  if(active){paused=true;check_bool(SetWindowDisplayAffinity(window,0));DwmFlush();screenshot_clipboard=GetClipboardSequenceNumber();screenshot_deadline=GetTickCount64()+60000;}
  else{check_bool(SetWindowDisplayAffinity(window,exclude_capture));DwmFlush();duplication=nullptr;check_hresult(capture_output->DuplicateOutput(device.get(),duplication.put()));has_frame=false;paused=false;paused_until=GetTickCount64()+150;dirty=true;}
  screenshot_mode=active;
 }
 void screenshotKeys(){
  const bool manual=(GetAsyncKeyState(VK_F8)&0x8000)&&(GetForegroundWindow()==window||screenshot_mode);
  const bool capture=(GetAsyncKeyState(VK_SNAPSHOT)&0x8000)||
   (((GetAsyncKeyState(VK_LWIN)|GetAsyncKeyState(VK_RWIN))&0x8000)&&(GetAsyncKeyState(VK_SHIFT)&0x8000)&&(GetAsyncKeyState('S')&0x8000));
  const bool keys=manual||capture;
  if(keys&&!screenshot_keys)screenshotMode(manual?!screenshot_mode:true);
  screenshot_keys=keys;
  if(screenshot_mode&&((GetAsyncKeyState(VK_ESCAPE)&0x8000)||GetTickCount64()>screenshot_deadline||GetClipboardSequenceNumber()!=screenshot_clipboard))screenshotMode(false);
 }
 explicit Optics(HWND hwnd):window(hwnd){
  original_style=GetWindowLongPtrW(window,GWL_EXSTYLE);GetWindowDisplayAffinity(window,&original_affinity);
  if(!Windows::System::DispatcherQueue::GetForCurrentThread()){
   DispatcherQueueOptions options{sizeof(options),DQTYPE_THREAD_CURRENT,DQTAT_COM_STA};
   check_hresult(CreateDispatcherQueueController(options,reinterpret_cast<ABI::Windows::System::IDispatcherQueueController**>(put_abi(shared_queue))));
  }
  compositor=Compositor();
  SetWindowLongPtrW(window,GWL_EXSTYLE,GetWindowLongPtrW(window,GWL_EXSTYLE)|WS_EX_NOREDIRECTIONBITMAP);
  check_hresult(compositor.as<ABI::Windows::UI::Composition::Desktop::ICompositorDesktopInterop>()->CreateDesktopWindowTarget(window,true,reinterpret_cast<ABI::Windows::UI::Composition::Desktop::IDesktopWindowTarget**>(put_abi(target))));
  root=compositor.CreateContainerVisual();target.Root(root);
  pane=compositor.CreateSpriteVisual();root.Children().InsertAtTop(pane);
  clip=compositor.CreateRoundedRectangleGeometry();pane.Clip(compositor.CreateGeometricClip(clip));
  createDevice();compileShaders();
  check_bool(SetWindowDisplayAffinity(window,exclude_capture));DwmFlush();
  duplication=nullptr;check_hresult(capture_output->DuplicateOutput(device.get(),duplication.put()));
  check_bool(SetWindowSubclass(window,windowProc,timer_id,reinterpret_cast<DWORD_PTR>(this)));
  check_bool(SetTimer(window,timer_id,16,nullptr)!=0);
 }
 ~Optics() noexcept {try{
  if(IsWindow(window)){KillTimer(window,timer_id);RemoveWindowSubclass(window,windowProc,timer_id);SetWindowDisplayAffinity(window,original_affinity);SetWindowLongPtrW(window,GWL_EXSTYLE,(GetWindowLongPtrW(window,GWL_EXSTYLE)&~WS_EX_NOREDIRECTIONBITMAP)|(original_style&WS_EX_NOREDIRECTIONBITMAP));}
  if(target)target.Root(nullptr);
 }catch(...){} }
 void createDevice(){
  com_ptr<IDXGIFactory1> factory;check_hresult(CreateDXGIFactory1(__uuidof(IDXGIFactory1),factory.put_void()));
  HMONITOR monitor=MonitorFromWindow(window,MONITOR_DEFAULTTONEAREST);
  com_ptr<IDXGIAdapter1> selected;com_ptr<IDXGIOutput> selected_output;
  for(UINT a=0;!selected;++a){
   com_ptr<IDXGIAdapter1> adapter;if(factory->EnumAdapters1(a,adapter.put())==DXGI_ERROR_NOT_FOUND)break;
   for(UINT o=0;;++o){com_ptr<IDXGIOutput> candidate;if(adapter->EnumOutputs(o,candidate.put())==DXGI_ERROR_NOT_FOUND)break;DXGI_OUTPUT_DESC description{};check_hresult(candidate->GetDesc(&description));if(description.Monitor==monitor){selected=adapter;selected_output=candidate;output=description;break;}}
  }
  if(!selected)throw_hresult(DXGI_ERROR_NOT_FOUND);
  D3D_FEATURE_LEVEL level{};check_hresult(D3D11CreateDevice(selected.get(),D3D_DRIVER_TYPE_UNKNOWN,nullptr,D3D11_CREATE_DEVICE_BGRA_SUPPORT,nullptr,0,D3D11_SDK_VERSION,device.put(),&level,context.put()));
  capture_output=selected_output.as<IDXGIOutput1>();check_hresult(capture_output->DuplicateOutput(device.get(),duplication.put()));
 }
 void compileShaders(){
  com_ptr<ID3DBlob> vs_code,ps_code,error;
  auto build=[&](const char* entry,const char* profile,com_ptr<ID3DBlob>& code){HRESULT hr=D3DCompile(shader,sizeof(shader)-1,"glass-optics",nullptr,nullptr,entry,profile,D3DCOMPILE_ENABLE_STRICTNESS|D3DCOMPILE_OPTIMIZATION_LEVEL3,0,code.put(),error.put());if(FAILED(hr)){if(error)std::cerr<<static_cast<const char*>(error->GetBufferPointer());check_hresult(hr);}error=nullptr;};
  build("vs","vs_4_0",vs_code);build("ps","ps_4_0",ps_code);
  check_hresult(device->CreateVertexShader(vs_code->GetBufferPointer(),vs_code->GetBufferSize(),nullptr,vertex.put()));
  check_hresult(device->CreatePixelShader(ps_code->GetBufferPointer(),ps_code->GetBufferSize(),nullptr,pixel.put()));
  D3D11_BUFFER_DESC desc{};desc.ByteWidth=96;desc.Usage=D3D11_USAGE_DEFAULT;desc.BindFlags=D3D11_BIND_CONSTANT_BUFFER;
  check_hresult(device->CreateBuffer(&desc,nullptr,constants.put()));
  desc.ByteWidth=1056;check_hresult(device->CreateBuffer(&desc,nullptr,control_constants.put()));
  D3D11_SAMPLER_DESC sample{};sample.Filter=D3D11_FILTER_MIN_MAG_MIP_LINEAR;sample.AddressU=sample.AddressV=sample.AddressW=D3D11_TEXTURE_ADDRESS_CLAMP;sample.MaxLOD=D3D11_FLOAT32_MAX;
  check_hresult(device->CreateSamplerState(&sample,sampler.put()));
 }
 void uploadLayer(unsigned layer){
  auto& texture=layer==2?text_texture:(layer==1?internal_texture:ui_texture);auto& view=layer==2?text_source:(layer==1?internal_source:ui_source);
  auto& pixels=layer==2?text_pixels:(layer==1?internal_pixels:ui_pixels);unsigned width=layer==2?text_width:(layer==1?internal_width:ui_width),height=layer==2?text_height:(layer==1?internal_height:ui_height);
  view=nullptr;texture=nullptr;if(pixels.empty()||!width||!height)return;
  D3D11_TEXTURE2D_DESC desc{};desc.Width=width;desc.Height=height;desc.MipLevels=desc.ArraySize=1;desc.Format=DXGI_FORMAT_R8G8B8A8_UNORM;desc.SampleDesc.Count=1;desc.Usage=D3D11_USAGE_IMMUTABLE;desc.BindFlags=D3D11_BIND_SHADER_RESOURCE;
  D3D11_SUBRESOURCE_DATA initial{pixels.data(),width*4,0};check_hresult(device->CreateTexture2D(&desc,&initial,texture.put()));check_hresult(device->CreateShaderResourceView(texture.get(),nullptr,view.put()));dirty=true;
 }
 void sizeResources(){
  RECT bounds{};check_bool(GetClientRect(window,&bounds));unsigned ww=unsigned(bounds.right),wh=unsigned(bounds.bottom);root.Size({float(ww),float(wh)});
  window_width=ww;window_height=wh;
  const float solid_height=h+depth*1.35f;
  const float solid_width=w+depth*.65f;
  unsigned pw=unsigned(std::ceil(solid_width)),ph=unsigned(std::ceil(solid_height));
  if(pw!=pane_width||ph!=pane_height){
   context->OMSetRenderTargets(0,nullptr,nullptr);destination=nullptr;
   if(swapchain)check_hresult(swapchain->ResizeBuffers(2,pw,ph,DXGI_FORMAT_B8G8R8A8_UNORM,0));
   else{
    com_ptr<IDXGIAdapter> adapter;check_hresult(device.as<IDXGIDevice>()->GetAdapter(adapter.put()));com_ptr<IDXGIFactory2> factory;check_hresult(adapter->GetParent(__uuidof(IDXGIFactory2),factory.put_void()));
    DXGI_SWAP_CHAIN_DESC1 desc{};desc.Width=pw;desc.Height=ph;desc.Format=DXGI_FORMAT_B8G8R8A8_UNORM;desc.SampleDesc.Count=1;desc.BufferUsage=DXGI_USAGE_RENDER_TARGET_OUTPUT;desc.BufferCount=2;desc.SwapEffect=DXGI_SWAP_EFFECT_FLIP_SEQUENTIAL;desc.AlphaMode=DXGI_ALPHA_MODE_PREMULTIPLIED;desc.Scaling=DXGI_SCALING_STRETCH;
    check_hresult(factory->CreateSwapChainForComposition(device.get(),&desc,nullptr,swapchain.put()));
    ICompositionSurface surface{nullptr};
    check_hresult(compositor.as<ABI::Windows::UI::Composition::ICompositorInterop>()->CreateCompositionSurfaceForSwapChain(swapchain.get(),reinterpret_cast<ABI::Windows::UI::Composition::ICompositionSurface**>(put_abi(surface))));
    auto brush=compositor.CreateSurfaceBrush(surface);brush.Stretch(CompositionStretch::Fill);pane.Brush(brush);
   }
   com_ptr<ID3D11Texture2D> buffer;check_hresult(swapchain->GetBuffer(0,__uuidof(ID3D11Texture2D),buffer.put_void()));check_hresult(device->CreateRenderTargetView(buffer.get(),nullptr,destination.put()));pane_width=pw;pane_height=ph;
  }
  pane.Offset({std::round(x),std::round(y),0});pane.Size({float(pw),float(ph)});clip.Size({float(pw),float(ph)});clip.CornerRadius({0,0});
 }
 bool copyBackdrop(){
  com_ptr<IDXGIResource> frame;DXGI_OUTDUPL_FRAME_INFO info{};
  HRESULT hr=duplication->AcquireNextFrame(0,&info,frame.put());
  if(hr==DXGI_ERROR_WAIT_TIMEOUT)return false;
  if(hr==DXGI_ERROR_ACCESS_LOST){duplication=nullptr;return false;}
  check_hresult(hr);
  try{
   if(!paused&&GetTickCount64()>=paused_until){
    auto texture=frame.as<ID3D11Texture2D>();D3D11_TEXTURE2D_DESC description{};texture->GetDesc(&description);
    if(!background||texture_width!=description.Width||texture_height!=description.Height){
     source=nullptr;background=nullptr;description.Usage=D3D11_USAGE_DEFAULT;description.BindFlags=D3D11_BIND_SHADER_RESOURCE;description.CPUAccessFlags=0;description.MiscFlags=0;
     check_hresult(device->CreateTexture2D(&description,nullptr,background.put()));check_hresult(device->CreateShaderResourceView(background.get(),nullptr,source.put()));texture_width=description.Width;texture_height=description.Height;
    }
    context->CopyResource(background.get(),texture.get());has_frame=true;dirty=true;
   }
  }catch(...){duplication->ReleaseFrame();throw;}
  check_hresult(duplication->ReleaseFrame());return true;
 }
 void render(){
  if(paused||!visible)return;
  const auto now=GetTickCount64();
  if(now<retry_after)return;
  if(needs_reset||MonitorFromWindow(window,MONITOR_DEFAULTTONEAREST)!=output.Monitor){
   if(context)context->ClearState();pane.Brush(nullptr);destination=nullptr;swapchain=nullptr;source=nullptr;background=nullptr;ui_source=nullptr;ui_texture=nullptr;internal_source=nullptr;internal_texture=nullptr;duplication=nullptr;capture_output=nullptr;vertex=nullptr;pixel=nullptr;constants=nullptr;sampler=nullptr;context=nullptr;device=nullptr;
   text_source=nullptr;text_texture=nullptr;control_constants=nullptr;
   pane_width=pane_height=texture_width=texture_height=0;has_frame=false;createDevice();compileShaders();uploadLayer(0);uploadLayer(1);uploadLayer(2);sizeResources();dirty=true;needs_reset=false;
  }
  if(!duplication){
   HRESULT restored=capture_output->DuplicateOutput(device.get(),duplication.put());
   if(FAILED(restored)){retry_after=now+1000;return;}
   dirty=true;
  }
  copyBackdrop();
  if(paused||GetTickCount64()<paused_until||!has_frame||!dirty||!destination)return;
  POINT location{};check_bool(ClientToScreen(window,&location));
  float values[24]={w,h,float(texture_width),float(texture_height),float(location.x-output.DesktopCoordinates.left)+std::round(x),float(location.y-output.DesktopCoordinates.top)+std::round(y),radius,depth,enabled?1.f:0.f,rounded?1.f:0.f,float(output.Rotation),radius/(rounded?25.f:14.f),float(ui_width),float(ui_height),std::round(x),std::round(y),float(internal_width),float(internal_height),density,0,surface_tint[0],surface_tint[1],surface_tint[2],1};context->UpdateSubresource(constants.get(),0,nullptr,values,0,0);
  float controlValues[264]={};std::copy(button_rects,button_rects+256,controlValues);std::copy(pressed_rect,pressed_rect+4,controlValues+256);controlValues[260]=std::round(pressed_travel);controlValues[261]=float(button_count);context->UpdateSubresource(control_constants.get(),0,nullptr,controlValues,0,0);
  ID3D11RenderTargetView* rtv=destination.get();const float clear[4]={0,0,0,0};context->ClearRenderTargetView(rtv,clear);context->OMSetRenderTargets(1,&rtv,nullptr);D3D11_VIEWPORT viewport{0,0,float(pane_width),float(pane_height),0,1};context->RSSetViewports(1,&viewport);
  context->IASetInputLayout(nullptr);context->IASetPrimitiveTopology(D3D11_PRIMITIVE_TOPOLOGY_TRIANGLELIST);context->VSSetShader(vertex.get(),nullptr,0);context->PSSetShader(pixel.get(),nullptr,0);
  ID3D11ShaderResourceView* views[4]={source.get(),ui_source.get(),internal_source.get(),adaptive_ui?text_source.get():nullptr};ID3D11Buffer* buffers[2]={constants.get(),control_constants.get()};ID3D11SamplerState* sam=sampler.get();context->PSSetShaderResources(0,4,views);context->PSSetConstantBuffers(0,2,buffers);context->PSSetSamplers(0,1,&sam);context->Draw(3,0);
  views[0]=views[1]=views[2]=views[3]=nullptr;context->PSSetShaderResources(0,4,views);check_hresult(swapchain->Present(1,0));dirty=false;
  if(show_after_frame){pane.Opacity(1);show_after_frame=false;}
 }
 static LRESULT CALLBACK windowProc(HWND hwnd,UINT message,WPARAM wparam,LPARAM lparam,UINT_PTR,DWORD_PTR data){
  auto* self=reinterpret_cast<Optics*>(data);
  try{
   if(message==WM_TIMER&&wparam==timer_id){if(self->visible)self->screenshotKeys();self->render();return 0;}
   if(message==WM_MOVE){self->dirty=true;self->render();}
   if(message==capture_pause){self->paused=true;SetWindowDisplayAffinity(hwnd,0);DwmFlush();return 0;}
   if(message==capture_resume){SetWindowDisplayAffinity(hwnd,exclude_capture);DwmFlush();self->duplication=nullptr;check_hresult(self->capture_output->DuplicateOutput(self->device.get(),self->duplication.put()));self->has_frame=false;self->paused=false;self->paused_until=GetTickCount64()+150;self->dirty=true;return 0;}
   if(message==WM_NCDESTROY){KillTimer(hwnd,timer_id);RemoveWindowSubclass(hwnd,windowProc,timer_id);self->window=nullptr;auto result=DefSubclassProc(hwnd,message,wparam,lparam);releaseSurface(hwnd);return result;}
  }catch(hresult_error const& error){self->needs_reset=true;self->retry_after=GetTickCount64()+1000;std::cerr<<"Optics frame: "<<to_string(error.message())<<"\n";}
  return DefSubclassProc(hwnd,message,wparam,lparam);
 }
};
thread_local std::unordered_map<HWND,std::unique_ptr<Optics>> surfaces;
Optics* findSurface(HWND window){auto entry=surfaces.find(window);return entry==surfaces.end()?nullptr:entry->second.get();}
void releaseSurface(HWND window){surfaces.erase(window);}
}
extern "C" HRESULT bsl_glass_surface_layer(void* handle,unsigned long long expected_session,unsigned layer,const unsigned char* pixels,unsigned width,unsigned height)noexcept{
 try{auto* optics=findSurface(static_cast<HWND>(handle));if(!optics)return E_PENDING;if(expected_session&&optics->session!=expected_session)return E_ABORT;if(layer>4||!pixels||!width||!height||width>4096||height>4096)return E_INVALIDARG;
  auto& s=*optics;
  if(layer==3){s.pending_ui_pixels.assign(pixels,pixels+size_t(width)*height*4);s.pending_ui_width=width;s.pending_ui_height=height;return S_OK;}
  unsigned target=layer==4?0:layer;
  auto& data=target==2?s.text_pixels:(target==1?s.internal_pixels:s.ui_pixels);data.assign(pixels,pixels+size_t(width)*height*4);
  if(target==2){s.text_width=width;s.text_height=height;}else if(target==1){s.internal_width=width;s.internal_height=height;}else{s.ui_width=width;s.ui_height=height;}
  if(layer==0)s.adaptive_ui=false;
  if(layer==4)s.adaptive_ui=!s.text_pixels.empty();
  if(target==2){
   s.adaptive_ui=true;
   if(!s.pending_ui_pixels.empty()){s.ui_pixels.swap(s.pending_ui_pixels);s.pending_ui_pixels.clear();s.ui_width=s.pending_ui_width;s.ui_height=s.pending_ui_height;s.uploadLayer(0);}
  }
  s.uploadLayer(target);s.render();return S_OK;
 }catch(...){return to_hresult();}
}
extern "C" HRESULT bsl_glass_surface_visible(void* handle,unsigned long long expected_session,bool visible)noexcept{
 try{
  auto* optics=findSurface(static_cast<HWND>(handle));if(!optics)return S_OK;if(expected_session&&optics->session!=expected_session)return E_ABORT;
  auto& s=*optics;
  if(!visible){s.visible=false;s.show_after_frame=false;s.pane.Opacity(0);s.screenshot_mode=false;s.paused=false;check_bool(SetWindowDisplayAffinity(s.window,0));return S_OK;}
  if(!s.visible){
   check_bool(SetWindowDisplayAffinity(s.window,exclude_capture));DwmFlush();
   s.duplication=nullptr;check_hresult(s.capture_output->DuplicateOutput(s.device.get(),s.duplication.put()));s.has_frame=false;
   s.show_after_frame=true;s.pane.Opacity(0);
  }
  s.visible=true;s.dirty=true;s.render();return S_OK;
 }catch(...){return to_hresult();}
}
extern "C" HRESULT bsl_glass_surface_apply(void* handle,float x,float y,float w,float h,float radius,float depth,bool enabled,bool rounded,float density,const float* buttons,unsigned button_count,const float* pressed,float travel,const float* tint,unsigned* count,float* milliseconds)noexcept{
 const auto began=std::chrono::steady_clock::now();
 try{
  HWND window=static_cast<HWND>(handle);if(!IsWindow(window))return E_INVALIDARG;
  if(button_count>64||!pressed||!tint||(button_count&&!buttons))return E_INVALIDARG;
  auto& optics=surfaces[window];if(!optics){
   auto old_style=GetWindowLongPtrW(window,GWL_EXSTYLE);DWORD old_affinity=0;GetWindowDisplayAffinity(window,&old_affinity);
   try{optics=std::make_unique<Optics>(window);}catch(...){SetWindowLongPtrW(window,GWL_EXSTYLE,old_style);SetWindowDisplayAffinity(window,old_affinity);surfaces.erase(window);throw;}
  }
  auto& state=*optics;state.x=x;state.y=y;state.w=w;state.h=h;state.radius=radius;state.depth=depth;state.enabled=enabled;state.rounded=rounded;state.density=density;state.dirty=true;
  std::copy(tint,tint+3,state.surface_tint);
  std::fill(state.button_rects,state.button_rects+256,0.f);if(button_count)std::copy(buttons,buttons+button_count*4,state.button_rects);std::copy(pressed,pressed+4,state.pressed_rect);state.button_count=button_count;state.pressed_travel=travel;
  state.sizeResources();state.render();*count=1;*milliseconds=std::chrono::duration<float,std::milli>(std::chrono::steady_clock::now()-began).count();return S_OK;
 }catch(hresult_error const& error){std::cerr<<"Optics setup: "<<to_string(error.message())<<"\n";return error.code();}catch(...){return to_hresult();}
}

extern "C" HRESULT bsl_glass_surface_release(void* handle,unsigned long long expected_session)noexcept{
 try{auto* surface=findSurface(static_cast<HWND>(handle));if(surface&&expected_session&&surface->session!=expected_session)return E_ABORT;releaseSurface(static_cast<HWND>(handle));return S_OK;}catch(...){return to_hresult();}
}

extern "C" unsigned long long bsl_glass_surface_session(void* handle)noexcept {auto* surface=findSurface(static_cast<HWND>(handle));return surface?surface->session:0;}
