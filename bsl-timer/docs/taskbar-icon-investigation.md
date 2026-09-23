# Dynamic Windows taskbar icon investigation

## Status

Open development issue.

The dynamic taskbar icon follows the active timer theme correctly when BSL-Timer
runs through `npm run tauri dev`.

In the installed production build, Windows may continue to display the static
packaged application icon on the taskbar instead of the runtime recolored icon.

This issue does not affect the timer, tray icon, updater, or application
operation. It is a Windows taskbar / shell presentation problem.

## Intended behavior

The taskbar icon should use the color theme of the active timer.

The overdue state has higher priority than the normal theme color.

Changing the active timer or its theme should update the taskbar icon without
restarting the application.

## Current implementation

The Windows-specific implementation is in:

`src-tauri/src/lib.rs`

The runtime path currently:

1. recolors the bundled PNG source image;
2. converts the RGBA image into a native Windows `HICON` with `CreateIcon`;
3. obtains the main window `HWND`;
4. sends both `WM_SETICON / ICON_SMALL` and `WM_SETICON / ICON_BIG`;
5. updates the window-class icons with `SetClassLongPtrW` using
   `GCLP_HICONSM` and `GCLP_HICON`;
6. retains the current native icon handles in `TaskbarIconState`;
7. destroys the previous native icon handles after replacement.

The implementation deliberately uses larger PNG sources for the native window
icons because Windows may ignore a small icon source at some taskbar scaling
settings.

## Confirmed observation

The important split is:

- development run: dynamic taskbar icon update works;
- installed production build: the taskbar can continue to use the packaged EXE
  icon.

Because the same runtime logic works in development, the remaining problem is
likely not the recoloring algorithm itself.

## Working hypothesis

The unresolved area is Windows Shell identity and taskbar grouping in the
installed application.

The next investigation should focus on the relationship between:

- the installed executable identity;
- the shortcut created by the installer;
- Windows AppUserModelID / taskbar grouping;
- the actual main-window `HWND` and window class;
- the icon selected by Explorer for the installed application group;
- differences between launching the development executable directly and
  launching the installed application through Windows Shell.

This is a hypothesis, not a confirmed root cause.

## What should not be repeated blindly

The current code already updates:

- `WM_SETICON` for small and large icons;
- the native window-class small and large icons.

Future work should first determine why Windows Shell still prefers the packaged
icon in the installed build before adding another icon-replacement layer.

## Suggested next diagnostic session

When work resumes:

1. reproduce the issue with the current installed production build;
2. record how the application was launched: Start menu, desktop shortcut,
   executable directly, or autostart;
3. inspect the installed shortcut and executable identity;
4. compare taskbar behavior when launching the installed EXE directly versus
   through its shortcut;
5. inspect AppUserModelID / shell grouping behavior;
6. verify that the runtime `HWND` receiving `WM_SETICON` is the window whose
   taskbar group Windows is displaying;
7. only then change the native implementation.

## Related releases

- 0.6.0 introduced the dynamic taskbar icon.
- 0.6.2 reworked the Windows runtime taskbar icon update path.
- 0.6.4 finalized packaged Windows icon resources.
- 0.7.1 leaves this issue open under `[Unreleased]` in `CHANGELOG.md`.

## Decision

Do not remove the runtime dynamic-icon implementation.

Keep the issue documented and defer further changes until a focused Windows
Shell / installed-build investigation is performed.
