import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { BRAND } from '@/config/brand';

const locales = ['en', 'hu', 'cs', 'de'];

const loadLocaleData = async (locale) => {
  const response = await fetch(`/locales/${locale}/translation.json`);
  if (!response.ok) {
    throw new Error(`Failed to load ${locale} translation.`);
  }
  return response.json();
};

const loadResources = async () => {
  const entries = await Promise.all(
    locales.map(async (locale) => [locale, { translation: await loadLocaleData(locale) }])
  );
  return Object.fromEntries(entries);
};

/**
 * Loads every locale, then initialises i18next.
 *
 * This is a function rather than a top-level `await` because a top-level await
 * in a module is only legal for build targets that support it, and it failed
 * the production build outright — the app could be run in dev but never
 * shipped. main.jsx awaits this before the first render, so components still
 * mount with their strings already in place and no flash of raw keys.
 */
export const initI18n = async () => {
  const resources = await loadResources();

  await i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources,
      fallbackLng: 'en',
      supportedLngs: locales,
      nonExplicitSupportedLngs: true,
      load: 'languageOnly',
      // Verbose i18next logging is a development aid; in a production console
      // it is noise that also advertises the missing keys.
      debug: import.meta.env.DEV,
      interpolation: {
        // Correct for React, not an oversight: React escapes everything it
        // renders as a child, and letting i18next escape as well turns an
        // ampersand in a broker's name into "&amp;" on screen.
        escapeValue: false,
        // Every locale string writes the broker as {{brand}}; this fills it in
        // globally so a rebrand is one line in config/brand.js.
        defaultVariables: { brand: BRAND.name },
      },
      detection: {
        order: ['localStorage', 'navigator'],
        caches: ['localStorage'],
      },
    });

  return i18n;
};

export default i18n;
