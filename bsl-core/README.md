# BSL Desktop Core

`@bsl-world/desktop-core` contains product-neutral desktop behavior shared by
BSL-World applications in this monorepository.

Applications consume the package through a local `file:../bsl-core`
dependency. Shared modules must not contain product names, product-specific
storage keys, localized interface text, or product business rules.

Available modules:

- `audio` defines the product-neutral native bridge contract for audio-device
  discovery and playback. The companion Rust crate in `native/audio` performs
  device enumeration, routing, playback, cancellation, and safe fallback to
  the operating-system default output.
- `window` owns monitor selection, independent X/Y correction, margins, and
  reusable window-position persistence.
- `theme` owns canonical theme identifiers, normalization, glow behavior, and
  shared CSS design tokens.
- `i18n` owns locale detection, translation lookup, DOM translation, language
  switching, and fallback behavior while products supply their own strings.
- `regional` owns date, time, and first-day-of-week preferences independently
  from the interface language.
- `settings` defines the native bridge for layered preferences stored in
  `%APPDATA%\BSL-World\desktop-settings.json`. The `shared` scope provides
  BSL-World defaults while `applications` contains optional product-specific
  overrides. Products resolve their own override over the shared value.

The native crate in `native/settings` preserves unrelated sections, migrates
legacy top-level shared sections when they are first read, and writes changes
atomically. Products keep business data and settings that are not shared-core
concerns in their own storage.

`bsl-core` is linked into each product during its normal build. It is not a
separate installed application and does not have its own end-user installer.
