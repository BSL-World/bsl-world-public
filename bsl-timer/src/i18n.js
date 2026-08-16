import en from './locales/en.json';
import ru from './locales/ru.json';

const locales = { en, ru };
const defaultLocale = 'en';
const storageKey = 'bsl-timer.locale';

function detectLocale() {
  const savedLocale = localStorage.getItem(storageKey);

  if (savedLocale && locales[savedLocale]) {
    return savedLocale;
  }

  const browserLocale = navigator.language.toLowerCase().split('-')[0];
  return locales[browserLocale] ? browserLocale : defaultLocale;
}

function resolveTranslation(locale, key) {
  return key
    .split('.')
    .reduce((value, part) => value?.[part], locales[locale]);
}

let currentLocale = detectLocale();

export function t(key) {
  return (
    resolveTranslation(currentLocale, key)
    ?? resolveTranslation(defaultLocale, key)
    ?? key
  );
}

export function getLocale() {
  return currentLocale;
}

export function getSupportedLocales() {
  return Object.entries(locales).map(([code, messages]) => ({
    code,
    name: messages.localeName
  }));
}

export function applyTranslations(root = document) {
  document.documentElement.lang = currentLocale;

  root.querySelectorAll('[data-i18n]').forEach((element) => {
    element.textContent = t(element.dataset.i18n);
  });

  root.querySelectorAll('[data-i18n-title]').forEach((element) => {
    element.title = t(element.dataset.i18nTitle);
  });

  root.querySelectorAll('[data-i18n-aria-label]').forEach((element) => {
    element.setAttribute(
      'aria-label',
      t(element.dataset.i18nAriaLabel)
    );
  });
}

export function setLocale(locale) {
  if (!locales[locale]) {
    return false;
  }

  currentLocale = locale;
  localStorage.setItem(storageKey, locale);
  applyTranslations();

  window.dispatchEvent(
    new CustomEvent('bsl-timer:locale-changed', {
      detail: { locale }
    })
  );

  return true;
}