# Changelog

All notable changes to BSL-Timer are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0-beta.4] - 2026-08-17

### Added

- Window transparency control with live preview.
- Timer display brightness control with live preview.
- Persistent appearance settings.
- Restoration of the main window position between application launches.
- Restoration of the Settings window position between openings and
  application launches.

### Changed

- Increased the maximum window transparency to 90 percent.
- Kept the Settings window inside the nearest monitor work area.
- Added a safe margin between the Settings window, screen edges, and taskbar.
- Applied the saved color theme before the first interface render.

### Fixed

- Fixed Ok and Cancel buttons not closing the Settings window.
- Fixed the native close button not closing the Settings window.
- Fixed Settings controls touching or being clipped by the lower window edge.
- Fixed the Settings window opening partially outside the visible screen area.
- Fixed the default Green theme briefly flashing during application startup.

## [0.2.0-beta.3] - 2026-08-16

### Added

- Compact main window layout.
- Direct timer start with the Enter key.

### Changed

- Reduced title bar, timer display, controls, spacing, and window dimensions.
- Balanced the timer panel within the available window height.
- Decoupled timer startup from asynchronous signal preparation.

### Fixed

- Fixed a bug where pressing Enter changed the controls to the running state
  without starting the countdown.
- Fixed clipped and uneven spacing around the timer panel.

## [0.2.0-beta.2] - 2026-08-15

### Added

- Green, Blue, Tan LCD, and Purple color themes.
- Locally bundled DSEG7 Classic display font.

### Changed

- Improved contrast for the Tan LCD theme.
- Increased clarity and color intensity for the Purple theme.
- Increased the Settings window height.

## [0.2.0-beta.1] - 2026-08-15

### Added

- Independent timer engine with idle, running, paused, and overdue states.
- English and Russian interface localization.
- Settings window with Ok, Apply, and Cancel actions.
- Edition-aware application structure for future Free and paid versions.
- Separate modules for timer logic, signals, themes, localization, and editions.

### Changed

- Reworked the main window into a single-timer interface.
- Replaced oversized text controls with a compact custom title bar.
- Moved application preferences into the Settings window.

### Fixed

- Restored reliable Settings window opening and closing.
- Restored the production build with separate main and Settings entry points.

## [0.2.0-alpha.1] - 2026-08-14

### Added

- Initial installable single-timer prototype.
- Start, Pause, Resume, Stop, and Restart controls.
- Overdue counting with visual warning and sound notification.
- Always-on-top support.
- Acrylic blur and transparent custom window chrome.
- NSIS installer for Windows.