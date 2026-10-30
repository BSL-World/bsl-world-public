# Changelog

All notable changes to BSL-Timer are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.5] - 2026-10-27

### Fixed

- Restore live informer time updates for 15, 10 and 5 minute warnings,
  completion and repeated overdue reminders, while keeping the displayed
  timer and click target unchanged by other timers. Version 1.0.4 corrected
  zero-valued overdue reminders but left their displayed time static.

## [1.0.4] - 2026-10-27

### Fixed

- Show elapsed overdue time instead of zero in repeated end-signal informers.

### Changed

- Use the playful Russian overdue status label «Просрачено».

## [1.0.3] - 2026-10-25

### Fixed

- Open the displayed timer tab when clicking an informer, including overdue
  reminders; keep reminder data tied to its timer during background ticks.
- Prevent duplicate Windows instances when simultaneous launches encounter the
  first process before its IPC window exists. Register the guard first, wait
  briefly for IPC, and exit the secondary process even if IPC is unavailable.
- Preserve the earlier date-countdown time-visibility and duration-wheel fixes
  in the release notes.


## [1.0.2] - 2026-10-17

### Fixed

- Make mouse-wheel adjustment of hours follow the same direction as minutes
  and seconds, preserving nonnegative hours and cyclic minute/second values.

## [1.0.1] - 2026-10-14

### Added

- Added a per-event option to hide hours and minutes in dated countdowns while
  keeping the number of days visible. The existing seconds option is retained
  when time is hidden, and older saved events keep their previous display.

## [1.0.0] - 2026-10-11

### Changed

- Complete the planned feature set with the first 1.0 release, preserving
  existing timer data, dated events, preferences, and edition-specific updates.
- Update the embedded BSL Desktop Core package to 0.5.0 for shared typography
  and content-based window measurement.

### Fixed

- Obtain window heights from natural DOM layout without changing visible page
  styles or relying on animation frames while a WebView is hidden.
- Convert content geometry using the measured CSS/native pixel ratio, including
  WebView zoom and resize acknowledgement, without accumulating rounding errors.
- Reserve both event-picker variants, validation space and all four action slots.
- Derive one compact action-button width from actual caption measurements and
  reduce horizontal padding without reducing the font size.
- Keep the informer geometry unchanged during second ticks and wait for its
  content to be ready before showing automatic notifications.
- Give every action button the same compact geometry across application windows.
- Fit About, What's New and the event editor to their intrinsic content without
  scrolling, wait for WebView client resizing, and verify the final visible bounds.
- Scale all application text, fields, buttons and spacing together with both
  window dimensions using shared BSL Desktop Core typography metrics.
- Scale the main numeric display more gently while preserving panel padding
  in idle, running, paused, validation and overdue states.
- Fit auxiliary windows using inner dimensions and measured minimum sizes,
  and position tray informers using their actual window size.


## [0.13.1] - 2026-10-10

### Fixed

- Kept the main timer content vertically balanced and resized the main window
  for the selected font size and event-ribbon state.
- Unified regular interface text sizes across the main, Settings, About, and
  dated-event windows while making the event calendar more compact and keeping
  every editor action visible at the Large text size.
- Closed auxiliary windows when the main window is closed or hidden to the
  notification area.

## [0.13.0] - 2026-10-09

### Added

- Added a shared `System`, `Light`, and `Dark` window-appearance preference for
  BSL-World desktop applications.
- Added a Hi-End-inspired light surface with matte-metal panels, restrained
  borders, and independent accent colors across every BSL-Timer window.
- Added shared `Small`, `Normal`, and `Large` font-size choices that change
  application typography without scaling window geometry or controls.
- Added an Apply action to the dated-event editor so changes can be saved
  without closing the editor.

### Changed

- Moved appearance-mode normalization, system-theme tracking, and shared
  surface tokens into `@bsl-world/desktop-core` for reuse by future products.
- Moved the dated-event editor into a normal resizable application window with
  its own native title bar, remembered position, and multi-monitor correction.
- Keep the dated-event editor open when other windows are clicked and request
  confirmation before discarding unsaved changes through Close, Cancel, or
  Escape.
- Reworded the Russian What’s New entry for dated events.

### Fixed

- Fixed named-value substitution in localized messages so event deletion
  confirmations display the actual event name.
- Rebuilt the Windows icon assets with a clear dark theme-tinted outline at
  16–64 pixel sizes and applied the same contour logic to dynamic tray and
  taskbar icons in every color theme.

## [0.12.0] - 2026-10-08

### Added

- Added a separate compact event ribbon for countdowns to a specific local
  date and time, hidden until the first event is created.
- Added persistent event names, descriptions, targets, and optional
  second-by-second display, with one event in Free and multiple events in Pro.
- Added family-wide date, time, and first-day-of-week preferences that remain
  independent from the BSL-Timer interface language.
- Added a live date and time format preview to Settings.
- Added a custom calendar with horizontal month navigation and a clock-face
  time picker with five-minute marks plus exact keyboard and wheel adjustment.
- Added a remembered control for collapsing and restoring the event ribbon.

### Changed

- Moved localization infrastructure, canonical themes and CSS tokens, and
  reusable window-position behavior into `@bsl-world/desktop-core`.
- Connected BSL-Timer to the shared versioned BSL-World desktop settings store.
- Split shared defaults from optional per-application overrides so future
  BSL-World products can inherit common preferences or keep their own values.

## [0.11.0] - 2026-10-05

### Added

- Added one application-wide audio output device setting for end signals,
  warning signals, and signal preview in both Free and Pro editions.
- Added native output-device discovery so the complete Windows playback-device
  list is available without microphone permission or WebView2 media access.
- Connected BSL-Timer to the shared `@bsl-world/desktop-core` audio layer so
  future BSL-World desktop products use the same routing and fallback logic.
- Moved signal generation, file decoding, routing, and cancellation into the
  shared native desktop audio engine.

### Fixed

- Fall back safely to the Windows system default output and notify the user
  when a saved audio device is disconnected, removed, or unavailable.
- Keep the current native audio stream open between signals to reduce playback
  startup delay and avoid expected stream-lifecycle diagnostics in the console.

## [0.10.1] - 2026-10-04

### Fixed

- Restore every standard application window to its last position, then adjust
  only the coordinates needed to keep it inside the nearest monitor work area
  with a margin, including desktop layouts with negative monitor coordinates.

## [0.10.0] - 2026-10-03

### Added

- Added independent 15, 10, and 5 minute warning-signal switches for every
  timer, disabled by default.
- Added a short built-in BSL-Timer warning sound that is distinct from the
  final countdown-complete signal.
- Added run-aware warning scheduling: each enabled threshold fires once,
  resets on a new countdown, survives pause and resume, and never fires
  retroactively after session restoration.
- Added independent Sound and Informer delivery switches for every warning
  threshold and for countdown completion.
- Added an automatic tray informer that identifies the triggering timer,
  remains visible during playback and for three seconds afterward, and fades
  out smoothly.
- Added an optional three-line description for every timer, shown in its tray
  informer and as a tab hover tooltip.

### Fixed

- Clarified that end-signal settings apply to the selected timer.

### Planned

- Create an original built-in BSL-World sound collection when production time is available.

## [0.9.0] - 2026-10-02

### Added

- Added Windows system sounds as selectable per-timer end signals.
- Added a native file picker for choosing a user audio file from its original location.

### Changed

- Simplified signal repetition to one unambiguous setting: the number of additional repeats after the first playback.
- Changed What’s New from a modal dialog into a normal, resizable application window.

### Fixed

- Fall back to the built-in BSL-Timer signal when a selected Windows or user audio file is missing, unreadable, or cannot be decoded.
- Make signal preview play the selected sound once instead of following the timer's saved repeat sequence.
- Size the What’s New window to its localized content where the available monitor work area permits it, while retaining scrolling as a small-screen fallback.
- Keep the standalone What’s New window out of the Windows taskbar, matching the other auxiliary application windows.
- Increase the About window height so localized text and links remain visible.

## [0.8.0] - 2026-09-29

### Added

- Added per-timer end-signal settings with repeat-count and repeat-duration modes.
- Added configurable start-to-start intervals between signal playbacks.
- Added live signal preview from the Settings window.
- Added application-wide control for simultaneous or queued signals from different timers.
- Added a localized What’s New dialog that can be dismissed separately for each release and reopened from the About window.

### Changed

- Aligned edition capability flags so sound settings, sound sources, output-device selection, and presets are not restricted to Pro; multiple timer tabs remain the only Pro-only capability.
- Reworked the end-signal path into separate settings, scheduling, playback, and orchestration components so future sound sources and output-device selection can use the same pipeline.
- Standardized mouse-wheel adjustment so downward wheel movement increases focused numeric fields while normal page scrolling remains available outside them.

### Fixed

- Corrected the English author name in the About window to `Vasilyev Alexander`.

### Known issues

- On some multi-monitor layouts, the About window can still open on the primary monitor while the main BSL-Timer window is on another monitor.

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
