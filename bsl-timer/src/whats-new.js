export const WHATS_NEW_VERSION = '0.13.0';
export const WHATS_NEW_DISMISSED_VERSION_STORAGE_KEY =
  'bsl-timer.whats-new.dismissed-version';
export function shouldShowWhatsNew(
  version = WHATS_NEW_VERSION,
  storage = globalThis.localStorage
) {
  return storage.getItem(
    WHATS_NEW_DISMISSED_VERSION_STORAGE_KEY
  ) !== version;
}

export function dismissWhatsNew(
  version = WHATS_NEW_VERSION,
  storage = globalThis.localStorage
) {
  storage.setItem(
    WHATS_NEW_DISMISSED_VERSION_STORAGE_KEY,
    version
  );
}

export function allowWhatsNewAgain(
  version = WHATS_NEW_VERSION,
  storage = globalThis.localStorage
) {
  if (
    storage.getItem(WHATS_NEW_DISMISSED_VERSION_STORAGE_KEY)
    === version
  ) {
    storage.removeItem(
      WHATS_NEW_DISMISSED_VERSION_STORAGE_KEY
    );
  }
}
