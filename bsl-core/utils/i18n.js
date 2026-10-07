function getStorage(storage) {
  return storage ?? globalThis.localStorage ?? null;
}

function getDocument(document_) {
  return document_ ?? globalThis.document ?? null;
}

function getEventTarget(eventTarget) {
  return eventTarget ?? globalThis.window ?? null;
}

function resolveTranslation(locales, locale, key) {
  return key
    .split('.')
    .reduce((value, part) => value?.[part], locales[locale]);
}

export function createI18n({
  locales,
  defaultLocale,
  storageKey,
  eventName,
  storage = null,
  document: document_ = null,
  eventTarget = null,
  navigatorLanguage = () => globalThis.navigator?.language ?? ''
}) {
  if (!locales?.[defaultLocale]) {
    throw new Error('The default locale must be present in locales');
  }

  function detectLocale() {
    const savedLocale = getStorage(storage)?.getItem(storageKey);

    if (savedLocale && locales[savedLocale]) {
      return savedLocale;
    }

    const browserLocale = navigatorLanguage()
      .toLowerCase()
      .split('-')[0];

    return locales[browserLocale] ? browserLocale : defaultLocale;
  }

  let currentLocale = detectLocale();

  function t(key) {
    return (
      resolveTranslation(locales, currentLocale, key)
      ?? resolveTranslation(locales, defaultLocale, key)
      ?? key
    );
  }

  function getLocale() {
    return currentLocale;
  }

  function getSupportedLocales() {
    return Object.entries(locales).map(([code, messages]) => ({
      code,
      name: messages.localeName
    }));
  }

  function applyTranslations(root = getDocument(document_)) {
    if (!root) {
      return;
    }

    const ownerDocument = root.ownerDocument ?? root;

    if (ownerDocument.documentElement) {
      ownerDocument.documentElement.lang = currentLocale;
    }

    root.querySelectorAll('[data-i18n]').forEach((element) => {
      element.textContent = t(element.dataset.i18n);
    });

    root.querySelectorAll('[data-i18n-title]').forEach((element) => {
      element.title = t(element.dataset.i18nTitle);
    });

    root.querySelectorAll('[data-i18n-placeholder]').forEach((element) => {
      element.setAttribute(
        'placeholder',
        t(element.dataset.i18nPlaceholder)
      );
    });

    root.querySelectorAll('[data-i18n-aria-label]').forEach((element) => {
      element.setAttribute(
        'aria-label',
        t(element.dataset.i18nAriaLabel)
      );
    });
  }

  function setLocale(locale) {
    if (!locales[locale]) {
      return false;
    }

    currentLocale = locale;
    getStorage(storage)?.setItem(storageKey, locale);
    applyTranslations();

    const target = getEventTarget(eventTarget);

    if (target && eventName) {
      target.dispatchEvent(new CustomEvent(eventName, {
        detail: { locale }
      }));
    }

    return true;
  }

  return Object.freeze({
    applyTranslations,
    getLocale,
    getSupportedLocales,
    setLocale,
    t
  });
}
