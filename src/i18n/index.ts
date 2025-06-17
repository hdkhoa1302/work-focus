import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import các file ngôn ngữ
import enTranslation from './locales/en.json';
import viTranslation from './locales/vi.json';

// Cấu hình i18n
i18n
  .use(LanguageDetector) // Tự động phát hiện ngôn ngữ của trình duyệt
  .use(initReactI18next) // Tích hợp với React
  .init({
    resources: {
      en: {
        translation: enTranslation
      },
      vi: {
        translation: viTranslation
      }
    },
    fallbackLng: 'en', // Ngôn ngữ mặc định nếu không phát hiện được ngôn ngữ của người dùng
    debug: process.env.NODE_ENV === 'development',
    interpolation: {
      escapeValue: false // React đã xử lý XSS
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    }
  });

export default i18n; 