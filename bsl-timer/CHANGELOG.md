# Changelog

All notable changes to BSL-Timer are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned

- Correct the author name order in the About window to `Vasilyev Alexander`.
- Activate and focus the About window when it opens, positioning it beside the main window when possible.
- Redraw the master application icon as vector artwork in Inkscape using Bézier paths, then regenerate crisp icon assets for sizes down to 64x64.

## [0.7.2] - 2026-09-24

### Fixed

- Fixed dynamic Windows taskbar icon color updates in installed builds by assigning a separate runtime AppUserModelID before the main window is created.
- Made the overdue timer panel, display, and status respond consistently to the Glow setting, including the Tan LCD theme.

## [0.7.1] - 2026-09-22

### Added

- Visible download progress and installation status for automatic updates.
- Localized updater failure messages shown directly in the application.
- Separate updater targets for Free and Pro builds.

### Changed

- Updater checks now identify the application edition so Free and Pro releases can use separate signed artifacts.

## [0.7.0] - 2026-09-20

### Added

- Automatic update checks using Tauri Updater.
- Localized Update / Later confirmation dialog.
- Signed Windows updater artifacts.
- Verification of downloaded updates using the embedded public signing key.
- Integration with the BSL-World controlled download infrastructure.

### Changed

- BSL-Timer can now discover, download, verify, and install a newer version without requiring the user to download the installer manually.

## [0.6.4] - 2026-09-14

### Changed

- Finalized the packaged Windows application icon resources.
- Updated installer and application icon assets for more consistent Windows presentation.

## [0.6.2] - 2026-09-13

### Changed

- Reworked the Windows runtime taskbar icon update path.
- Refined native Windows icon replacement handling used by dynamic taskbar icons.

## [0.6.0] - 2026-09-06

### Added

- Per-timer color themes.
- Independent Glow setting.
- Blue, Violet, Magenta, Neon Cyan, Green, and Tan LCD visual palettes.
- Dynamic Windows taskbar icon based on the active timer theme.

### Changed

- Theme and Glow settings are stored separately for each timer.
- Switching timer tabs immediately applies that timer's appearance.

## [0.5.0] - 2026-09-04

### Added

- Windows autostart support.
- Settings control for starting BSL-Timer together with Windows.

## [0.4.0] - 2026-08-30

### Added

- Full system tray integration.
- Configurable behavior for the main window close button.
- Themed tray status icon.
- Optional pulsing indication for overdue timers.
- Timer preview shown when hovering over the tray icon.

### Changed

- The main window can be shown or hidden from the tray.
- Application exit behavior was refined for running timers.

## [0.3.0] - 2026-08-23

### Added

- About window with the application version, edition, author information,
  and links to BSL-World.ru, the BSL-Timer product page, and GitHub.
- Neon Cyan color theme with matching main, Settings, and About window
  styling.
- Shared position restoration and work-area validation for all application
  windows.
- Complete keyboard navigation for timer controls and confirmation dialogs
  using arrow keys, Tab, Shift+Tab, Enter, and Space.
- State-aware Alt+S, Alt+P, and Alt+R timer shortcuts that work independently
  of the active keyboard layout.
- Keyboard shortcut hints and accessibility metadata for timer actions.

### Changed

- Replaced Resume with Restore in startup recovery dialogs to distinguish
  session restoration from resuming a paused timer.
- Refined the About icon, window size, initial offset, and link layout.
- Made auxiliary windows independently draggable and position-aware.
- Removed separate taskbar buttons for the Settings and About windows.
- Moved keyboard focus to the relevant timer action when the application
  opens or the timer state changes.

### Fixed

- Focused and restored the existing main window when BSL-Timer is launched
  while another instance is already running.
- Prevented the main, Settings, and About windows from reopening outside the
  nearest monitor work area or behind the Windows taskbar.
- Preserved the last coordinates of auxiliary windows even when they were
  closed partially or completely outside the visible screen area.
- Restored the Always on Top state between application launches.
- Prevented About content, its native title, and the Ok button from being
  clipped by the window bounds.
- Fixed the Start button appearing selected at launch without receiving
  actual keyboard focus.
- Fixed timer controls losing keyboard focus after starting, stopping, or
  reaching the overdue state.
- Fixed Enter activating the primary confirmation action instead of the
  currently focused button.

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
