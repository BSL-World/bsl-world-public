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
2. implement the final planned feature after its requirements are described.

The second feature is intentionally not specified here; no behavior or scope
should be inferred before the product requirement is provided.
