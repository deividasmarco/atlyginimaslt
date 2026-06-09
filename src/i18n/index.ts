import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import lt from './lt.json';
import en from './en.json';

i18n.use(initReactI18next).init({
  resources: {
    lt: { translation: lt },
    en: { translation: en },
  },
  lng: 'lt',
  fallbackLng: 'lt',
  interpolation: { escapeValue: false },
  compatibilityJSON: 'v3',
});

export default i18n;
