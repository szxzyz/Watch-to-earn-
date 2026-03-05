import React, { createContext, useContext, useState, ReactNode } from 'react';

type Language = 'en' | 'ru';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    home: 'Home',
    menu: 'Menu',
    my_uid: 'My UID',
    language: 'Language',
    english: 'English',
    russian: 'Russian',
    legal_info: 'Legal Info',
    terms_conditions: 'Terms & Conditions',
    privacy_policy: 'Privacy Policy',
    acceptable_use: 'Acceptable Use',
    close: 'Close',
    copied: 'Copied!',
    app_language: 'App Language',
    earn: 'Earn',
    tasks: 'Tasks',
    wallet: 'Wallet',
    withdraw: 'Withdraw',
    balance: 'Balance',
  },
  ru: {
    home: 'Главная',
    menu: 'Меню',
    my_uid: 'Мой UID',
    language: 'Язык',
    english: 'Английский',
    russian: 'Русский',
    legal_info: 'Правовая информация',
    terms_conditions: 'Условия использования',
    privacy_policy: 'Политика конфиденциальности',
    acceptable_use: 'Правила использования',
    close: 'Закрыть',
    copied: 'Скопировано!',
    app_language: 'Язык приложения',
    earn: 'Заработать',
    tasks: 'Задания',
    wallet: 'Кошелек',
    withdraw: 'Вывод',
    balance: 'Баланс',
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('language');
    return (saved === 'en' || saved === 'ru') ? saved as Language : 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
  };

  const t = (key: string) => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
