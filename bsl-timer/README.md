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
- optional Glow effects;
- adjustable window transparency and display brightness;
- English and Russian interface languages;
- saved appearance settings and window positions;
- configurable confirmation before closing an active timer;
- configurable startup behavior for active timers;
- Windows system tray integration;
- tray timer preview;
- optional Windows autostart;
- automatic signed application updates.

The Free edition supports one timer.

Multiple independent timer tabs are a Pro edition feature. The Pro edition is
currently under development and is not available for public distribution.

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

The current stable release is BSL-Timer 0.7.1 Free.

Version 0.7.0 introduced the signed automatic update system. Version 0.7.1
added visible update progress, localized updater errors, and separate Free / Pro
update targets.

Development continues with user-interface improvements, additional countdown
features, and the future Pro edition.

### Known development issue

Dynamic Windows taskbar icon recoloring works in `npm run tauri dev`, but the
installed production build may continue to show the packaged application icon.
The runtime icon code is retained for future investigation. See
[`docs/taskbar-icon-investigation.md`](docs/taskbar-icon-investigation.md) for
the current technical record.

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
