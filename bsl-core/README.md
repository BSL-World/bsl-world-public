# BSL Desktop Core

`@bsl-world/desktop-core` contains product-neutral desktop behavior shared by
BSL-World applications in this monorepository.

Applications consume the package through a local `file:../bsl-core`
dependency. Shared modules must not contain product names, product-specific
storage keys, localized interface text, or product business rules.

The first active module is `@bsl-world/desktop-core/audio`. Its JavaScript
API defines the product-neutral native bridge contract for audio-device
discovery and playback. The companion Rust crate in `native/audio` performs
device enumeration, routing, playback, cancellation, and safe fallback to
the operating-system default output.
