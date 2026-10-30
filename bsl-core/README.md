# BSL Desktop Core

`@bsl-world/desktop-core` contains product-neutral desktop behavior shared by
BSL-World applications in this monorepository.

Applications consume the package through a local `file:../bsl-core`
dependency. Shared modules must not contain product names, product-specific
storage keys, localized interface text, or product business rules.

Available modules:

- `audio` defines the product-neutral native bridge contract for audio-device
  discovery and playback. The companion Rust crate in `native/audio` performs
  device enumeration, routing, playback, cancellation, and safe fallback to
  the operating-system default output.
- The native companion crate in `native/window` applies clear Glass or the
  existing blurred window background on Windows. Products supply a window,
  appearance mode, and transparency; no capture or background analysis is used.
- `window` owns monitor selection, independent X/Y correction, margins, and
  reusable window-position persistence.
- `theme` owns canonical accent-theme identifiers, normalization, glow
  behavior, and shared CSS design tokens.
- `appearance` owns the separate family-wide `system`, `light`, `dark`, and `glass`
  window-surface preference, system-theme resolution, live operating-system
  change tracking, and shared matte-metal and clear-glass surface tokens. Glass does not follow
  the system light/dark preference and keeps its body colorless; the approved Windows prototype adds a small native blur. Products must not
  couple window appearance to their accent palette or interface language.
- `i18n` owns locale detection, translation lookup, DOM translation, language
  switching, and fallback behavior while products supply their own strings.
- `regional` owns date, time, and first-day-of-week preferences independently
  from the interface language.
- `typography` owns the shared `Small`, `Normal`, and `Large` font-size values,
  validation, comparison, shared UI/display scales, and window-size calculation.
  Import `typography.css` and express text, fields, controls and spacing in `rem`
  so all dimensions follow the same root scale. `scaleInterfaceSize` converts
  a product's Normal window dimensions into logical window units. Large numeric
  readouts may use the gentler `displayScale`. Native OS title bars follow the
  operating system's own text and DPI settings.
- `layout` measures natural DOM contents without modifying the visible page,
  derives a common action-button width from product-provided labels, and converts
  CSS geometry to physical window pixels. Use the measured native/CSS ratio;
  monitor DPI alone does not account for WebView text zoom.
- `settings` defines the native bridge for layered preferences stored in
  `%APPDATA%\BSL-World\desktop-settings.json`. The `shared` scope provides
  BSL-World defaults while `applications` contains optional product-specific
  overrides. Products resolve their own override over the shared value.

The native crate in `native/settings` preserves unrelated sections, migrates
legacy top-level shared sections when they are first read, and writes changes
atomically. Products keep business data and settings that are not shared-core
concerns in their own storage.

`bsl-core` is linked into each product during its normal build. It is not a
separate installed application and does not have its own end-user installer.

## Start here for the next product

For BSL-Clock and subsequent desktop products, read the
[approved Glass/theme integration handoff](docs/glass-integration.md) and
[BSL-World Standard](../bsl-standard.md) before designing appearance controls.
The handoff records the accepted clear material, canonical palette/Glow separation,
0–300% intensity control, native capture fix, DPI edge allowance, source entry points,
reference adapter, tests, and explicitly unverified release/platform work.

The original handoff described uncommitted runtime changes. Their preserved
source is recorded in repository history on 2026-10-30; this recovery does not
create an installer or publish a package.
The native Composition backend remains opt-in (`composition-preview`).
