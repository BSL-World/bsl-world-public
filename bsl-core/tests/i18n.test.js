import assert from 'node:assert/strict';
import test from 'node:test';

import { createI18n } from '../utils/i18n.js';

function createMemoryStorage(savedLocale = null) {
  const values = new Map();

  if (savedLocale) {
    values.set('locale', savedLocale);
  }

  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value)
  };
}

const locales = {
  en: { localeName: 'English', greeting: 'Hello' },
  ru: { localeName: 'Русский', greeting: 'Привет' }
};

test('detects a supported saved locale', () => {
  const i18n = createI18n({
    locales,
    defaultLocale: 'en',
    storageKey: 'locale',
    storage: createMemoryStorage('ru'),
    navigatorLanguage: () => 'en-US'
  });

  assert.equal(i18n.getLocale(), 'ru');
  assert.equal(i18n.t('greeting'), 'Привет');
});

test('uses the browser language and falls back to the default', () => {
  const russian = createI18n({
    locales,
    defaultLocale: 'en',
    storageKey: 'locale',
    storage: createMemoryStorage(),
    navigatorLanguage: () => 'ru-RU'
  });
  const unsupported = createI18n({
    locales,
    defaultLocale: 'en',
    storageKey: 'locale',
    storage: createMemoryStorage(),
    navigatorLanguage: () => 'sv-SE'
  });

  assert.equal(russian.getLocale(), 'ru');
  assert.equal(unsupported.getLocale(), 'en');
  assert.equal(unsupported.t('missing.key'), 'missing.key');
});
