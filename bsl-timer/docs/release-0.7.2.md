# BSL-Timer 0.7.2 release record

## Status

BSL-Timer 0.7.2 was completed, published, and validated in production on
September 24-25, 2026.

The release delivered two independent engineering results:

1. the signed automatic update path is operational for edition-specific Free
   and Pro builds;
2. the installed Windows application now displays dynamically recolored taskbar
   icons that follow the active timer theme.

## Release contents

Version 0.7.2:

- fixes dynamic taskbar icon colors in installed Windows builds;
- assigns a separate runtime AppUserModelID before the main window is created;
- retains the native `WM_SETICON` and window-class icon update path;
- makes the overdue panel, display, and status respond consistently to the Glow
  setting, including the Tan LCD theme.

The public release is BSL-Timer 0.7.2 Free. A separate Pro build is maintained
for private testing and controlled distribution.

## Published infrastructure

The release uses one public Tauri updater manifest with three Windows targets:

- `windows-x86_64` for backward-compatible Free updates;
- `windows-x86_64-free` for Free updates;
- `windows-x86_64-pro` for Pro updates.

The Free and Pro installers were built separately, signed with the updater key,
stored under edition-specific names, and published through the controlled
BSL-World download gateway. Previous 0.7.1 installers remain available for
upgrade testing and rollback scenarios.

The release source and documentation are represented by commit `60428d7` in
both the GitVerse and GitHub mirrors.

## Production validation

The following checks passed:

- Free 0.7.2 installed and identified itself as the Free edition;
- Pro 0.7.2 installed and identified itself as the Pro edition;
- edition restrictions behaved correctly;
- existing user state survived edition replacement and update scenarios;
- the installed taskbar icon followed theme changes and the overdue state;
- overdue Glow behavior worked consistently, including Tan LCD;
- the public updater manifest matched the prepared release manifest byte for
  byte;
- both installer files delivered through the public gateway matched the local
  signed release artifacts;
- Pro 0.7.1 discovered, downloaded, verified, and installed Pro 0.7.2 through
  the production automatic updater;
- the updated application restarted as version 0.7.2 Pro with user data intact.

This completes the real release path rather than only confirming a local build.

## Public communication points

Materials for the product page, release article, and Telegram story can state
that:

- BSL-Timer can update itself through signed packages;
- Free and Pro builds receive the correct edition-specific artifact;
- download progress, installation status, and localized failures are shown in
  the application;
- the taskbar icon changes color together with the active timer theme;
- the overdue state has visual priority;
- the production updater and the installed-build taskbar behavior were both
  verified in real use.

The public download button must point to BSL-Timer 0.7.2 Free. Pro is not a
public download.

## Remaining work before the planned feature set is complete

Two product stages remain:

1. redraw the raster master icon as vector artwork in Inkscape using Bézier
   paths, producing clean boundaries and reliable exports for icon sizes down to
   64x64;
2. implement the expanded end-of-countdown signal subsystem planned for 0.8.0.

The signal subsystem must provide a configurable number of signal plays and an
interval between them; selection among built-in BSL-World sounds, Windows
system sounds, and a user file chosen with the native file picker; sound
preview; and explicit audio output device selection. Output-device selection is
lower in implementation priority but remains a mandatory product requirement
and a cross-product BSL-World desktop standard.

The approved design stores signal settings per timer and provides two repetition
modes: a number of additional repeats after the first signal, or a time period
during which repeats continue. Intervals are measured between playback start
times. User files are played from their original locations with a bundled-signal
fallback when unavailable. Concurrent signals from different timers are
allowed by default and can be disabled, in which case signals are queued.

Every feature, including sound settings and presets, is available in both Free
and Pro. The only functional Pro distinction is the ability to create more than
one timer tab; Free remains limited to one tab. Exact interval defaults, the
guaranteed base-format list, and the bundled fallback sound remain
implementation details to finalize.
