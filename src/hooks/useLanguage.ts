import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';

type Language = 'en' | 'vi';

export const useLanguage = () => {
  const { t } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState<Language>(
    (localStorage.getItem('i18nextLng') as Language) || 'en'
  );

  // Cập nhật state khi ngôn ngữ thay đổi
  useEffect(() => {
    const handleLanguageChanged = () => {
      setCurrentLanguage((i18n.language as Language) || 'en');
    };

    i18n.on('languageChanged', handleLanguageChanged);

    return () => {
      i18n.off('languageChanged', handleLanguageChanged);
    };
  }, []);

  // Thay đổi ngôn ngữ
  const changeLanguage = (language: Language) => {
    i18n.changeLanguage(language);
    localStorage.setItem('i18nextLng', language);
  };

  return {
    t,
    language: currentLanguage,
    changeLanguage,
    languages: [
      { code: 'en', name: 'English' },
      { code: 'vi', name: 'Tiếng Việt' }
    ]
  };
};

export default useLanguage; 