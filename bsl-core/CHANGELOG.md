# Changelog

## [Unreleased]

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
