# Changelog

## [Unreleased]

## [0.7.2] - 2026-11-08

Native window companion: 0.8.2.

- Restrict Glass backdrop exclusion to Desktop Duplication, keeping the finished
  surface visible in GDI and Windows Graphics Capture recordings. Restore the
  preceding DDA exclusion on release; retain screenshot freeze/resume behavior.
- DDA-based recording still requires a different capture backend for live Glass.

## [0.7.1] - 2026-11-04

Native window companion: 0.8.1.

- Cancel Glass capture passes on material changes, clear masks immediately and
  serialize native configure/show/release operations across surface generations.
- Bound frontend and WebView2 capture waits; discard late callbacks for retired
  sessions and allow a fresh capture after recovery. Cover suspended masks,
  timeouts, delayed configuration and press feedback with regression tests.

## [0.7.0] - 2026-11-02

- Add optional product-neutral Glass surface JS/CSS exports and native window
  0.8.0 with the `glass-surface` feature. Keep the default material path unchanged.
- Isolate native state per window and session, support up to 64 control mounts,
  publish UI/ink pairs atomically, cache capture geometry and release owned state.
- Add capture/disposal/ownership tests. Timer supplies the first consumer; a
  second shipped application and native multi-window lifecycle are not certified.

- Record the approved Glass/theme contract and BSL-Clock integration handoff,
  including intensity preview/persistence, native capture compatibility, and limits.

## [0.6.1] - 2026-10-28

### Added

- Glass neutral text contrast preference, independent of material and accents.
- Rounded clear-rim profiles and a restrained neutral body-reflection token.

## [0.6.0] - 2026-10-28

### Added

- Explicit Glass appearance independent of the accent palette and Glow.
- Neutral clear-glass surface, edge, relief, and text-outline tokens.
- A native window companion for switching between clear Glass and the existing
  Windows blur without changing window interaction. Visual tuning is provisional.

## [0.5.0] - 2026-10-11

### Added

- Export shared typography metrics and CSS tokens for coordinated text,
  field, action-button, spacing, and window scaling.
- Export the `layout` module for natural DOM measurement, action-button caption
  measurement, and conversion between CSS geometry and native window pixels.
- Cover content fitting at independent monitor DPI and WebView zoom levels.

### Fixed

- Measure content without changing visible page styles or depending on frames
  in hidden windows.
- Preserve content bounds and panel padding when native and CSS pixels differ.
