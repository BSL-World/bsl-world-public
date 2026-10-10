# BSL-Timer

BSL-Timer is a compact countdown timer for Windows.

It is designed for everyday situations where a clear and reliable countdown
is more useful than an overloaded organizer: cooking, focused work, exercise,
breaks, meetings, and other time-limited tasks.

## Free edition

BSL-Timer Free includes:

- one countdown timer with hours, minutes, and seconds;
- Start, Pause, Resume, Stop, and Restart actions;
- overdue counting after the timer reaches zero;
- visual overdue indication and an audible signal;
- Always on Top mode;
- multiple color themes;
- System, Light, and Dark window appearance with a matte Hi-End light surface;
- optional Glow effects;
- shared Small, Normal, and Large font-size choices;
- adjustable window transparency and display brightness;
- English and Russian interface languages;
- saved appearance settings and window positions;
- configurable confirmation before closing an active timer;
- configurable startup behavior for active timers;
- Windows system tray integration;
- tray timer preview;
- one persistent countdown to a specified local date and time, with a compact
  collapsible event ribbon, name, description, and optional seconds;
- a custom calendar and clock-face time picker with precise keyboard and mouse
  wheel adjustment;
- a separate resizable dated-event editor with Apply, remembered position, and
  unsaved-change confirmation;
- date, time, and first-day-of-week preferences that remain independent from
  the selected interface language;
- optional Windows autostart;
- one application-wide audio output device for every timer signal, with safe
  fallback to the Windows system default;
- automatic signed application updates.

The Free edition supports one timer and one dated event countdown.

Multiple independent timer tabs and multiple dated event countdowns are Pro
edition features. The Pro edition is maintained as a separate build and is not
currently available for public distribution.

## System requirements

- Windows 10 or Windows 11;
- x64 processor architecture;
- Microsoft Edge WebView2 Runtime.

WebView2 is already present on most supported Windows systems. Windows may
download it automatically if it is missing.

## Installation

Download the current Free installer from the official BSL-World website or
the BSL-World repository and run it.

BSL-Timer installs into the current Windows user profile and does not require
administrator privileges.

Starting with version 0.7.0, BSL-Timer includes an automatic updater. Future
versions can be discovered, downloaded, verified, and installed directly by
the application.

## Current status

The current public stable release is BSL-Timer 0.13.1 Free. A separate Pro build
is maintained for private testing and controlled distribution.

Version 0.7.0 introduced the signed automatic update system. Version 0.7.1
added visible update progress, localized updater errors, and separate Free / Pro
update targets. Version 0.7.2 fixed dynamic taskbar icon color updates in
installed Windows builds. Version 0.8.0 added configurable per-timer end-signal
repeats, signal preview, and simultaneous or queued playback for different
timers. Version 0.9.0 adds Windows system sounds and user audio files, simplifies
signal repetition to a repeat count, and moves What’s New into a normal
resizable window. Version 0.10.0 adds per-timer descriptions, configurable
15, 10, and 5 minute warning signals, independent sound and informer delivery,
and a tray informer that identifies the timer requiring attention.
Version 0.10.1 restores every standard application window to its own last
position and safely adjusts only the coordinates that would place it outside
the nearest monitor work area. Version 0.11.0 adds one application-wide audio
output device setting for end signals, warning signals, and signal preview.
A disconnected or unavailable saved device falls back safely to the Windows
system default. Version 0.12.0 adds persistent countdowns to specified dates
and times, a compact collapsible event ribbon, a custom calendar and clock-face
time picker, and shared regional formats that remain independent from the
interface language.
Version 0.13.0 adds shared font-size choices, moves dated-event editing into a
separate resizable window with Apply and unsaved-change protection, restores
clear theme-tinted icon contours at small Windows sizes, and adds light and
dark window appearances with an option to follow the Windows system theme.
Version 0.13.1 keeps the main timer compact while applying the selected text
size consistently, improves auxiliary-window layout, and closes auxiliary
windows together with the main window.

### Resolved Windows taskbar issue

The installed-build taskbar icon problem was traced to Windows Shell application
identity and resolved in version 0.7.2. See
[`docs/taskbar-icon-investigation.md`](docs/taskbar-icon-investigation.md) for
the completed technical record.

The signed release artifacts, production update path, and real
0.7.1-to-0.7.2 Pro update were also validated. See
[`docs/release-0.7.2.md`](docs/release-0.7.2.md) for the release record.

## Feedback and issues

Project website: [bsl-world.ru](https://bsl-world.ru/)

Repositories:

- [BSL-World on GitVerse](https://gitverse.ru/BSL-World/bsl-world-public)
- [BSL-World on GitHub](https://github.com/BSL-World/bsl-world-public)

Please report reproducible problems through the repository issue tracker. When
reporting a problem, include the BSL-Timer version, Windows version, expected
behavior, actual behavior, and steps to reproduce the issue.

## Development

BSL-Timer is built with Tauri 2, Rust, Vanilla JavaScript, Vite, and WebView2.

Useful commands:

```text
npm install
npm test
npm run tauri-dev
npm run tauri build
```

## License

BSL-Timer is proprietary freeware. It is free to use, but it is not open-source
software. See [LICENSE.md](LICENSE.md) for the complete terms.

Copyright (c) 2026 Vasilyev Alexander / BSL-World. All rights reserved.
