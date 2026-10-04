import React, { createContext, useContext, useState, useEffect } from 'react';
import { SupportedLang } from '../types';
import { TRANSLATIONS, LANGUAGES } from './translations';

interface LanguageContextType {
  lang: SupportedLang;
  setLang: (lang: SupportedLang) => void;
  t: (key: string) => string;
  isRTL: boolean;
  dir: 'rtl' | 'ltr';
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'ar',
  setLang: () => {},
  t: (key: string) => key,
  isRTL: true,
  dir: 'rtl'
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<SupportedLang>(() => {
    const saved = localStorage.getItem('isgha_lang') as SupportedLang;
    if (saved && TRANSLATIONS[saved]) return saved;
    return 'ar';
  });

  const currentOption = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0];
  const isRTL = currentOption.isRTL;
  const dir: 'rtl' | 'ltr' = isRTL ? 'rtl' : 'ltr';

  useEffect(() => {
    document.documentElement.setAttribute('dir', dir);
    document.documentElement.setAttribute('lang', lang);
  }, [dir, lang]);

  const setLang = (newLang: SupportedLang) => {
    setLangState(newLang);
    localStorage.setItem('isgha_lang', newLang);
  };

  const t = (key: string): string => {
    const langDict = TRANSLATIONS[lang] || TRANSLATIONS.ar;
    return langDict[key] || TRANSLATIONS.ar[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, isRTL, dir }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLang = () => useContext(LanguageContext);
