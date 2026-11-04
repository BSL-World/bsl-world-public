# Optional Glass surface contract

JS package 0.7.0; native window crate 0.8.0. Windows D3D11/Desktop Duplication
are required by the optional `glass-surface` feature. Default materials remain
unchanged when that feature is not enabled.

Products import `createGlassSurface` from `glass` and opt into `glass.css`.
They provide host, geometry, IPC callbacks, selectors, interior SVG, colors and
product events. Core contains no Timer labels, storage keys, layout or alarms.
The first integrated consumer is Timer; no second shipped consumer is claimed.

Native policy remains in the product: validate the target window and forward
configure/capture/interior/visibility/release operations to `native/window::glass`.
Use the session returned by configure for later calls. State is isolated per HWND;
stale sessions cannot control a replacement surface. Up to 64 control mounts are
accepted. Native destruction and explicit release clean up the owned renderer and
restore owned window flags/capture affinity. The optional legacy composition
preview coordinates material cleanup when both native features are compiled.

The JS adapter owns one surface per document. It stages UI and ink captures as
an atomic pair, reuses matching masks and interior layers, observes product DOM
and geometry, and forwards pointer/keyboard press feedback. Call `dispose()` on
teardown; suspended capture waits are cancelled, listeners/observers are removed,
and the native session is released. Callbacks must report actual native failures.
Product text can be excluded from the adaptive ink selector when it must retain
an explicit state color.

Validation: JS tests cover atomic publication/cache reuse, press interaction
while capture is pending, cancellation during disposal, document ownership,
independent documents and invalid contracts. The Timer consumer has a native
single-window development run accepted by the user. Native multi-window and
more-than-three-control rendering remain outside that acceptance; do not infer
their certification from JS tests or a successful compilation.
