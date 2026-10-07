import { createI18n } from '@bsl-world/desktop-core/i18n';

import en from './locales/en.json';
import ru from './locales/ru.json';

const i18n = createI18n({
  locales: { en, ru },
  defaultLocale: 'en',
  storageKey: 'bsl-timer.locale',
  eventName: 'bsl-timer:locale-changed'
});

export const applyTranslations = i18n.applyTranslations;
export const getLocale = i18n.getLocale;
export const getSupportedLocales = i18n.getSupportedLocales;
export const setLocale = i18n.setLocale;
export const t = i18n.t;
