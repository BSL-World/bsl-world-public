# Changelog

## [Unreleased]

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
