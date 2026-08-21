# BSL-Timer

BSL-Timer is a compact countdown timer for Windows.

The application is designed for everyday situations where one clear and
reliable timer is more useful than an overloaded organizer: cooking, focused
work, exercise, breaks, meetings, and other time-limited tasks.

## Free edition

BSL-Timer Free includes:

- one countdown timer with hours, minutes, and seconds;
- Start, Pause, Resume, Stop, and Restart actions;
- overdue counting after the timer reaches zero;
- visual overdue indication and an audible signal;
- Always on Top mode;
- Green, Blue, Purple, and Tan LCD color themes;
- a locally bundled DSEG7 Classic electronic display font;
- adjustable window transparency and display brightness;
- English and Russian interface languages;
- saved appearance settings and window positions;
- configurable confirmation before closing an active timer;
- configurable Ask, Resume, or Reset behavior for an active timer at startup.

The Free edition supports one timer. Multiple independent timer tabs are a Pro
edition feature. The Pro edition is currently under development and is not yet
available for purchase.

## System requirements

- Windows 10 or Windows 11;
- x64 processor architecture;
- Microsoft Edge WebView2 Runtime.

WebView2 is already present on most supported Windows systems. Windows may
download it automatically if it is missing.

## Installation

1. Download the latest Free installer from the Gitverse release page.
2. Run `bsl-timer_0.3.0-beta.1_free_x64-setup.exe`.
3. Follow the installer instructions.
4. Start BSL-Timer from Start.

The current beta installer is not digitally signed. Windows SmartScreen may
therefore display a warning. Download releases only from the official BSL-World
repository.

## Current status

Version `0.3.0-beta.1` is the first public Free beta release. Core timer
functionality is ready for everyday use, but the application is still being
tested and improved.

Planned features include:

- selectable Windows and custom notification sounds;
- selectable audio output device;
- additional interface languages;
- additional timer and event types;
- system tray and startup support for future alarms and dated events;
- Microsoft Store distribution;
- the Pro edition with multiple independent timer tabs.

## Feedback and issues

Project website: [bsl-world.ru](https://bsl-world.ru/)

Repository: [BSL-World on Gitverse](https://gitverse.ru/BSL-World/bsl-world-public)

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

Copyright (c) 2026 Alexander Vasiliev / BSL-World. All rights reserved.
