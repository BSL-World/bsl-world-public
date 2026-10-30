# Glass and theme integration handoff

Updated 2026-10-28 after the user's visual approval in BSL-Timer.
Next intended consumer: BSL-Clock (`bsl-clock`). This document and
[`../../bsl-standard.md`](../../bsl-standard.md) are the starting point for a new chat.

## Approved model

- Appearance is one mutually exclusive choice: System / Light / Dark / Glass.
  Glass + Dark and Glass + Light are not modes. System resolves only to Light/Dark.
- The six independent accent IDs are `green`, `blue`, `purple`, `magenta`,
  `neon-cyan`, `tan`. Their canonical colors remain in `styles/themes.css`.
  Do not derive or redefine colors from screenshots.
- Glow is an independent on/off switch. In Glass its intensity is 0–300%.
  100% means the final approved level, including the last 25% increase;
  do not apply another increase when integrating. Above 100%, brightness and
  halo radii grow. Glow off keeps the stored intensity for later use.
- Interface language, regional formats, typography, palette, appearance, and
  Glow remain independent. Support RU/EN and Small/Normal/Large.

## Approved material and geometry

The body is colorless, clear optical glass/acrylic with real desktop/windows
visible through it. No wallpaper screenshot painted inside the app, no smoke,
grey body fill, milkiness, background analysis, or automatic contrast sampling.
The user accepted a small real native blur after fully clear surfaces looked
like floating frames. The current Gaussian sigma is 0.75, scaled for DPI.

Rounded convex rims resemble a clear bead of molten glass, not straight cut
facets. Both main rims have uniform neutral profiles, crisp dark-grey 1 CSS px
contours (`#454b50`), and thin inner highlights. Avoid blurred/sprayed contours,
angular/conic color changes, and diagonal reflection bands across the body.
Retain only restrained top reflection and edge relief. Preserve product layout.

The numeric display is a distinct industrial module: thin frame, 2 px corner
radius, no sculpted rounded rim. These Timer dimensions are a reference, not
mandatory Clock layout. Its housing rim was reduced by 2 px in earlier trials;
use the final reference values, not those earlier intermediate designs.

The user explicitly approved a transparent saturated light-blue header
`rgb(70 175 255 / 35%)`. This is a header treatment, not tint in the glass body
and not a replacement accent palette. Ordinary light control labels have a
crisp dark 1 px outline. The optional dark label contrast retains its light
outline. Labels, fields, and tabs must remain legible on white and busy backgrounds.

Glow looks like colored light inside and near the transparent edges/readout,
not an opaque colored surface. Keep crisp contours under the halo. Tan keeps
graphite digits and its canonical warm backlight; in Glass the beige display
fill is omitted to preserve transparency. Other Tan appearances keep their
existing display background.

The accepted product adapter is frozen at
[`references/timer-glass-2026-10-28.css`](references/timer-glass-2026-10-28.css).
It is a documentation reference with Timer selectors, not a shared stylesheet
to import unchanged. Extract genuinely reusable rules to core when connecting
Clock; map Clock geometry in its own adapter. Do not restart visual exploration
or copy the earlier rejected diagonal/grey/gradient-rim trials.

## Existing core implementation

- JS/CSS package: `@bsl-world/desktop-core`, local `file:../bsl-core` dependency.
  Current working package version 0.6.1; not a published release.
- `utils/theme.js`: `createThemeController`, canonical IDs and independent Glow.
- `utils/appearance.js`: appearance resolution, `applyGlassTextTone`,
  `normalizeGlassGlowIntensity`, `applyGlassGlowIntensity`, and settings equality.
- `styles/appearance.css`: neutral material, relief/text-outline tokens,
  `--bsl-glass-edge-glow`, `--bsl-glass-display-glow`, `--bsl-glass-emission`,
  `--bsl-glass-control-outline`. `styles/themes.css` supplies accent/inner-light RGB.
- Root attributes: `data-appearance`, `data-appearance-mode`, `data-theme`,
  `data-glow="on|off"`, `data-glass-text-tone="light|dark"`, `data-font-size`.
  Rounded surfaces use `data-bsl-glass-relief="rounded"`.
- `applyGlassGlowIntensity` sets `--bsl-glass-glow-strength` to percentage/100
  and `--bsl-glass-glow-spread` to 1 + max(0, percentage - 100)/100.
  Missing/invalid values default to 100; finite values round and clamp to 0–300.
  Intensity must not change palette or independently enable Glow.
- Native companion `native/window`, crate `bsl-desktop-window` 0.7.0:
  `apply_window_appearance(window, mode, transparency)`.

## Persistence and live preview

Native shared settings live in `%APPDATA%\BSL-World\desktop-settings.json`.
Use core settings APIs; preserve unrelated sections. Shared section `appearance`
contains `mode`, `glassTextTone`, `glassGlowIntensity`. Missing intensity in
older settings migrates logically to 100 without requiring a destructive rewrite.

The working Timer adapter is `../bsl-timer/src/appearance-mode-settings.js`.
Caches: `bsl-world.appearance-mode`, `bsl-world.glass-text-tone`,
`bsl-world.glass-glow-intensity`. The adapter applies preview values immediately
and propagates storage events to open main/informer windows. Apply persists the
shared section; Cancel restores committed values. A new consumer needs the
same transaction behavior, not only the CSS slider.

The Timer control is in its theme/Glow settings card, visible only in Glass.
Slider and numeric input are synchronized, range 0–300, step 1, unit percent.
Disable both while Glow is off/loading. Do not apply an empty in-progress numeric
edit; normalize on completion. Preview must not overwrite the committed value.

## Native Windows implementation and capture fix

The current backend is opt-in: core feature `composition-preview`; Timer feature
`native-glass-preview`. It builds C++/WinRT through MSVC/Windows SDK and `cc` 1.2.64.
Without the feature the previous default native material path remains.

Call the backend on the host UI thread (COM/DispatcherQueue/Composition objects
must not cross threads). Timer's async command uses `run_on_main_thread` and
returns the result without blocking the same UI thread. Serialize material
transitions; Timer reference `src/window-material.js` prevents an older slow
request from restoring the wrong material after rapid switches.

`native/window/src/composition.cpp` hosts a clipped Composition layer beneath
WebView2. A source SpriteVisual with BackdropBrush feeds a CompositionVisualSurface
with explicit local SourceSize; its SurfaceBrush feeds Gaussian blur. Keep this
intermediate surface. Direct BackdropBrush -> Gaussian worked visually but turned
black in full virtual-desktop captures on a secondary monitor with negative X.
Opacity 0.999, forcing active appearance, and changing blur border/quality did not fix it.
The intermediate surface fixed PrtScn/ShareX and full GDI capture on the user's machine.
There are no screen-capture APIs, screenshot key hooks, or pixel readback in rendering.

Update size/clips on WM_SIZE/WM_DPICHANGED; remove the layer/subclass and restore
changed window styles when leaving Glass. The layer must not steal focus or clicks.
Startup sigma is controlled by temporary `BSL_GLASS_BLUR_SIGMA` (0..8, default 0.75);
this is a development setting, not the Glow intensity control.

Windows 10 currently uses undocumented ACCENT_ENABLE_HOSTBACKDROP (5) via
SetWindowCompositionAttribute and WS_EX_NOREDIRECTIONBITMAP. Documented Windows 11
DWMWA_USE_HOSTBACKDROPBRUSH is not a drop-in Win10 replacement. Do not advertise
this as a verified universal Windows/Linux backend. Test unsupported effects,
transparency settings, driver/device loss, and fallback before broad release.

## Right-edge rounding fix

Observed live: HWND client width 326, DPR ~1.14, DOM width 286.842102 CSS px,
which paints ~327 physical px. This clipped the right outer contour.
The Timer Glass adapter reserves 2 CSS px with `width:calc(100% - 2px)`.
Afterward left and right contour pixels both matched `#454b50`.
Keep a small safe allowance or solve the native/DOM rounding when porting;
do not thicken just the right border or change global non-Glass sizing.
Use core layout's measured native/CSS ratio, not monitor DPI alone.

## Evidence and remaining release work

User approved the material, label outlines, uniform crisp rims, blue header,
Glow and its user intensity control. The user also confirmed the capture fix
with a personal PrtScn screenshot. Native checks: Windows 10 Pro 19045.6466,
WebView2, multiple monitors including negative coordinates, white/busy/dark
backgrounds. Repeated PrtScn/ShareX and full virtual-desktop GDI capture succeeded.

Timer checks: Pro frontend build; opt-in native compilation; default cargo check
from the native integration stage; 108 unit/regression tests; 864 browser-matrix
cases covering RU/EN, Free/Pro, font sizes, six palettes, Glow on/off, label tone,
control bounds, Apply/Cancel, countdown/overdue updates, and preservation of
System/Light/Dark. Browser bridge is mocked: this is not full native verification.
Level 300 rendered a wider halo, level 0 removed emission; Informer responded.

Still required: full native appearance-switch/DPI/monitor matrix, Windows/driver
coverage, CPU/GPU measurements, clean failure recovery, auxiliary-window material
parity, extraction of remaining Timer geometry/overdue selectors from generic core,
new version/release notes/installers/signing/install/update checks. Current core
CSS still contains Timer-specific overdue selectors; do not treat this as a fully
finished product-neutral component library.

No new distribution, publication, commit, or push was performed for this handoff.
Working Timer source version is 1.0.7 with later accepted development changes;
use a new synchronized version for the next distribution, not a reused 1.0.7 installer.
Installed application was not replaced. The running native dev candidate is
`../bsl-timer/src-tauri/target/glass-capture-preview/bsl-timer.exe` and requires Vite.

Detailed history: `../bsl-timer/docs/glass-preview.ru.md` and
`../bsl-timer/docs/glass-native-backdrop.ru.md`; backups/screenshots/UI harnesses
are under `../bsl-timer/.task-backups/` (`glass-edge-fix-2026-10-28`,
`glass-glow-slider-2026-10-28`, `glass-core-handoff-2026-10-28`).
These historical files contain rejected and superseded iterations; this handoff
describes the accepted state. Keep Defender enabled; do not revive the old
workflow passing live CSS/JS expressions through Node command-line arguments.
