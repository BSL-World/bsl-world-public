#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#include <dispatcherqueue.h>
#include <initguid.h>
#include <d2d1effects.h>
#include <windows.ui.composition.interop.h>
#include <windows.graphics.effects.interop.h>
#include <winrt/Windows.Foundation.h>
#include <winrt/Windows.Foundation.Collections.h>
#include <winrt/Windows.Graphics.Effects.h>
#include <winrt/Windows.System.h>
#include <winrt/Windows.UI.Composition.h>
#include <winrt/Windows.UI.Composition.Desktop.h>
#include <cmath>
#include <memory>
#include <unordered_map>
#include <commctrl.h>
#include <string>

using namespace winrt;
using namespace Windows::Foundation;
using namespace Windows::Graphics::Effects;
using namespace Windows::UI::Composition;
using ABI::Windows::Graphics::Effects::IGraphicsEffectD2D1Interop;
using ABI::Windows::Graphics::Effects::GRAPHICS_EFFECT_PROPERTY_MAPPING;

struct BlurEffect : implements<BlurEffect, IGraphicsEffect, IGraphicsEffectSource, IGraphicsEffectD2D1Interop> {
    float amount;
    hstring name{L"Blur"};
    CompositionEffectSourceParameter input{L"desktop"};
    explicit BlurEffect(float value) : amount(value) {}
    hstring Name() const { return name; }
    void Name(hstring const& value) { name = value; }
    HRESULT __stdcall GetEffectId(GUID* value) noexcept override { *value = CLSID_D2D1GaussianBlur; return S_OK; }
    HRESULT __stdcall GetNamedPropertyMapping(LPCWSTR, UINT* index, GRAPHICS_EFFECT_PROPERTY_MAPPING* mapping) noexcept override {
        *index = 0; *mapping = ABI::Windows::Graphics::Effects::GRAPHICS_EFFECT_PROPERTY_MAPPING_DIRECT; return S_OK;
    }
    HRESULT __stdcall GetPropertyCount(UINT* count) noexcept override { *count = 3; return S_OK; }
    HRESULT __stdcall GetProperty(UINT index, ABI::Windows::Foundation::IPropertyValue** value) noexcept override {
        try {
            IPropertyValue property{nullptr};
            if (index == 0) property = PropertyValue::CreateSingle(amount).as<IPropertyValue>();
            else if (index == 1) property = PropertyValue::CreateUInt32(D2D1_GAUSSIANBLUR_OPTIMIZATION_BALANCED).as<IPropertyValue>();
            else if (index == 2) property = PropertyValue::CreateUInt32(D2D1_BORDER_MODE_HARD).as<IPropertyValue>();
            else return E_INVALIDARG;
            *value = reinterpret_cast<ABI::Windows::Foundation::IPropertyValue*>(detach_abi(property));
            return S_OK;
        } catch (...) { return to_hresult(); }
    }
    HRESULT __stdcall GetSourceCount(UINT* count) noexcept override { *count = 1; return S_OK; }
    HRESULT __stdcall GetSource(UINT index, ABI::Windows::Graphics::Effects::IGraphicsEffectSource** value) noexcept override {
        if (index != 0) return E_INVALIDARG;
        auto source = input.as<IGraphicsEffectSource>();
        *value = reinterpret_cast<ABI::Windows::Graphics::Effects::IGraphicsEffectSource*>(detach_abi(source));
        return S_OK;
    }
};


namespace {
constexpr UINT_PTR subclass_id = 0x42534C47;

struct Backdrop {
    HWND window;
    bool changed_style = false;
    Windows::UI::Composition::Desktop::DesktopWindowTarget target{nullptr};
    ContainerVisual root{nullptr};
    CompositionRoundedRectangleGeometry geometry{nullptr};
    CompositionEffectBrush brush{nullptr};
    SpriteVisual source_visual{nullptr};
    CompositionVisualSurface source_surface{nullptr};
    void resize() {
        RECT rect{};
        if (!GetClientRect(window, &rect)) return;
        const Windows::Foundation::Numerics::float2 size{float(rect.right),float(rect.bottom)};
        root.Size(size);
        source_visual.Size(size);
        source_surface.SourceSize(size);
        geometry.Size(size);
        float dpi = float(GetDpiForWindow(window)) / 96.0f;
        geometry.CornerRadius({14.0f*dpi,14.0f*dpi});
    }
    ~Backdrop() {
        if (window && IsWindow(window)) {
            RemoveWindowSubclass(window, subclass_proc, subclass_id);
            if (changed_style) {
                auto style = GetWindowLongPtrW(window,GWL_EXSTYLE);
                SetWindowLongPtrW(window,GWL_EXSTYLE,style & ~LONG_PTR(WS_EX_NOREDIRECTIONBITMAP));
            }
        }
        if (target) target.Root(nullptr);
    }
    static LRESULT CALLBACK subclass_proc(HWND window,UINT message,WPARAM wparam,LPARAM lparam,UINT_PTR,DWORD_PTR data) {
        auto self = reinterpret_cast<Backdrop*>(data);
        try {
            if (message == WM_SIZE || message == WM_DPICHANGED) self->resize();
            if (message == WM_NCDESTROY) {
                RemoveWindowSubclass(window,subclass_proc,subclass_id);
                self->window = nullptr;
                self->target.Root(nullptr);
            }
        } catch (...) {}
        return DefSubclassProc(window,message,wparam,lparam);
    }
};

struct Context {
    Windows::System::DispatcherQueueController owned_queue{nullptr};
    Compositor compositor{nullptr};
    std::unordered_map<HWND,std::unique_ptr<Backdrop>> windows;
    Context() {
        init_apartment(apartment_type::single_threaded);
        if (!Windows::System::DispatcherQueue::GetForCurrentThread()) {
            DispatcherQueueOptions options{sizeof(options),DQTYPE_THREAD_CURRENT,DQTAT_COM_STA};
            check_hresult(CreateDispatcherQueueController(options,
                reinterpret_cast<ABI::Windows::System::IDispatcherQueueController**>(put_abi(owned_queue))));
        }
        compositor = Compositor();
    }
};
// Every call comes from the host UI thread. COM objects never cross threads.
thread_local std::unique_ptr<Context> context;

void host_accent(HWND window) {
    struct Accent { int state, flags; DWORD color; int animation; } accent{5,0,0,0};
    struct Attribute { int attribute; void* data; SIZE_T size; } attribute{19,&accent,sizeof(accent)};
    using SetAttribute = BOOL(WINAPI*)(HWND,Attribute*);
    auto setter = reinterpret_cast<SetAttribute>(GetProcAddress(GetModuleHandleW(L"user32.dll"),"SetWindowCompositionAttribute"));
    if (!setter) throw_hresult(E_NOTIMPL);
    check_bool(setter(window,&attribute));
}
}

extern "C" HRESULT bsl_composition_apply(void* handle,float sigma) noexcept {
    try {
        HWND window = static_cast<HWND>(handle);
        if (!IsWindow(window) || !std::isfinite(sigma) || sigma < 0 || sigma > 8) return E_INVALIDARG;
        if (!context) context = std::make_unique<Context>();
        host_accent(window);
        auto found = context->windows.find(window);
        if (found != context->windows.end()) {
            found->second->brush.Properties().InsertScalar(L"Blur.BlurAmount",sigma*float(GetDpiForWindow(window))/96.0f);
            found->second->resize();
            return S_OK;
        }
        auto state = std::make_unique<Backdrop>();
        state->window = window;
        const auto previous = GetWindowLongPtrW(window,GWL_EXSTYLE);
        state->changed_style = (previous & WS_EX_NOREDIRECTIONBITMAP) == 0;
        if (state->changed_style) SetWindowLongPtrW(window,GWL_EXSTYLE,previous | WS_EX_NOREDIRECTIONBITMAP);
        auto compositor = context->compositor;
        check_hresult(compositor.as<ABI::Windows::UI::Composition::Desktop::ICompositorDesktopInterop>()
            ->CreateDesktopWindowTarget(window,false,
                reinterpret_cast<ABI::Windows::UI::Composition::Desktop::IDesktopWindowTarget**>(put_abi(state->target))));
        state->root = compositor.CreateContainerVisual();
        state->target.Root(state->root);
                // Give the effect a local surface with explicit bounds. Direct backdrop
        // effects can turn black in virtual-desktop GDI captures on Windows 10.
        // This stays inside Composition; no desktop capture or pixel readback.
        state->source_visual = compositor.CreateSpriteVisual();
        state->source_visual.Brush(compositor.CreateBackdropBrush());
        state->root.Children().InsertAtBottom(state->source_visual);
        state->source_surface = compositor.CreateVisualSurface();
        state->source_surface.SourceVisual(state->source_visual);
        auto effect = make<BlurEffect>(sigma*float(GetDpiForWindow(window))/96.0f);
        auto factory = compositor.CreateEffectFactory(effect,{L"Blur.BlurAmount"});
        state->brush = factory.CreateBrush();
        state->brush.SetSourceParameter(L"desktop",compositor.CreateSurfaceBrush(state->source_surface));
        auto pane = compositor.CreateSpriteVisual();
        pane.RelativeSizeAdjustment({1,1});
        pane.Brush(state->brush);
        state->geometry = compositor.CreateRoundedRectangleGeometry();
        pane.Clip(compositor.CreateGeometricClip(state->geometry));
        state->source_visual.Clip(compositor.CreateGeometricClip(state->geometry));
        state->root.Children().InsertAtTop(pane);
        state->resize();
        check_bool(SetWindowSubclass(window,Backdrop::subclass_proc,subclass_id,reinterpret_cast<DWORD_PTR>(state.get())));
        context->windows.emplace(window,std::move(state));
        return S_OK;
    } catch (...) { return to_hresult(); }
}

extern "C" HRESULT bsl_composition_clear(void* handle) noexcept {
    try {
        if (context) context->windows.erase(static_cast<HWND>(handle));
        return S_OK;
    } catch (...) { return to_hresult(); }
}

