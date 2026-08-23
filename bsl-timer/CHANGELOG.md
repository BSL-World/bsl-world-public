# Changelog

All notable changes to BSL-Timer are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.3.0-beta.2] - 2026-08-23

### Added

- About window with the application version, edition, author information,
  and links to BSL-World.ru, the BSL-Timer product page, and GitHub.
- Neon Cyan color theme with matching main, Settings, and About window
  styling.
- Shared position restoration and work-area validation for all application
  windows.

### Changed

- Replaced Resume with Restore in startup recovery dialogs to distinguish
  session restoration from resuming a paused timer.
- Refined the About icon, window size, initial offset, and link layout.
- Made auxiliary windows independently draggable and position-aware.
- Removed separate taskbar buttons for the Settings and About windows.

### Fixed

- Focused and restored the existing main window when BSL-Timer is launched
  while another instance is already running.
- Prevented the main, Settings, and About windows from reopening outside the
  nearest monitor work area or behind the Windows taskbar.
- Preserved the last coordinates of auxiliary windows even when they were
  closed partially or completely outside the visible screen area.
- Prevented About content, its native title, and the Ok button from being
  clipped by the window bounds.

## [0.3.0-beta.1] - 2026-08-21

### Added

- Versioned event instance model for future timer tabs and event types.
- Session storage abstraction for restoring event instances.
- Automated tests for timer state restoration and session persistence.
- Working timer tabs with independent countdown state.
- Inline timer tab naming and renaming.
- Timer tab restoration between application launches.
- Free edition messaging for the single-timer limit.
- Default markers and reset actions for appearance controls.
- Localized in-app confirmation for closing an active timer tab.
- Overflow navigation controls for long timer tab lists.
- Configurable confirmation before closing active timers.
- Configurable Ask, Resume, and Reset behavior for active timers at startup.
- Explicit edition selection for Free and Pro release builds.

### Changed

- Added timer engine state export and restoration support.
- Made all color themes officially available in the Free edition.
- Increased the main window height to accommodate the timer tab bar.
- Focused the Start button after confirming a timer tab name.
- Kept Settings actions visible while its content scrolls independently.

### Fixed

- Prevented the fallback timer font from flashing during application startup
  by preloading the locally bundled DSEG7 Classic font.
- Replaced the clipped browser confirmation shown when closing an active tab.
- Fixed Settings actions being clipped after adding appearance defaults.
- Closed the Settings window together with the confirmed application exit.

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
