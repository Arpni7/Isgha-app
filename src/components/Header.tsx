import React from 'react';
import { useLang } from '../i18n/LanguageContext';
import { Globe, BookOpen, Volume2, HelpCircle, ShieldCheck, History as HistoryIcon } from 'lucide-react';

interface HeaderProps {
  currentTab: 'home' | 'listen' | 'fatwa' | 'skeptic' | 'history';
  onSelectTab: (tab: 'home' | 'listen' | 'fatwa' | 'skeptic' | 'history') => void;
  onOpenLangModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({ currentTab, onSelectTab, onOpenLangModal }) => {
  const { t, lang } = useLang();

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Single text element wordmark */}
        <button
          onClick={() => onSelectTab('home')}
          className="text-left rtl:text-right flex items-center gap-2 group cursor-pointer"
        >
          <div className="w-8 h-8 rounded-lg bg-emerald-800 text-amber-200 flex items-center justify-center font-bold text-lg shadow-sm">
            إ
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold tracking-tight text-slate-900 group-hover:text-emerald-800 transition-colors">
              {t('app_name')}
            </span>
            <span className="text-[11px] text-slate-500 font-medium -mt-1 hidden sm:inline">
              {t('app_sub')}
            </span>
          </div>
        </button>

        {/* Zone 2: Clean 4-5 text navigation links */}
        <nav className="hidden md:flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => onSelectTab('home')}
            className={`px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer rounded-md ${
              currentTab === 'home'
                ? 'text-emerald-800 bg-emerald-50/70 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
            }`}
          >
            {t('nav_home')}
          </button>

          <button
            onClick={() => onSelectTab('listen')}
            className={`px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer rounded-md flex items-center gap-1.5 ${
              currentTab === 'listen'
                ? 'text-emerald-800 bg-emerald-50/70 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
            }`}
          >
            <Volume2 className="w-4 h-4 text-emerald-700 opacity-80" />
            <span>{t('nav_listen')}</span>
          </button>

          <button
            onClick={() => onSelectTab('fatwa')}
            className={`px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer rounded-md flex items-center gap-1.5 ${
              currentTab === 'fatwa'
                ? 'text-emerald-800 bg-emerald-50/70 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
            }`}
          >
            <BookOpen className="w-4 h-4 text-emerald-700 opacity-80" />
            <span>{t('nav_fatwa')}</span>
          </button>

          <button
            onClick={() => onSelectTab('skeptic')}
            className={`px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer rounded-md flex items-center gap-1.5 ${
              currentTab === 'skeptic'
                ? 'text-emerald-800 bg-emerald-50/70 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-700 opacity-80" />
            <span>{t('nav_skeptic')}</span>
          </button>

          <button
            onClick={() => onSelectTab('history')}
            className={`px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer rounded-md flex items-center gap-1.5 ${
              currentTab === 'history'
                ? 'text-emerald-800 bg-emerald-50/70 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
            }`}
          >
            <HistoryIcon className="w-4 h-4 text-emerald-700 opacity-80" />
            <span>{t('nav_history')}</span>
          </button>
        </nav>

        {/* Zone 3: 1-2 primary actions (Language Switcher) */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenLangModal}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200/80 rounded-lg transition-colors cursor-pointer border border-slate-200"
            title={t('change_lang')}
          >
            <Globe className="w-3.5 h-3.5 text-emerald-800" />
            <span className="uppercase font-semibold tracking-wider">{lang}</span>
          </button>
        </div>
      </div>

      {/* Mobile navigation tab bar */}
      <div className="md:hidden flex items-center justify-around border-t border-slate-200 bg-white px-2 py-1 text-xs">
        <button
          onClick={() => onSelectTab('home')}
          className={`py-1.5 px-2 font-medium flex flex-col items-center gap-0.5 ${
            currentTab === 'home' ? 'text-emerald-800 font-bold' : 'text-slate-500'
          }`}
        >
          <span>{t('nav_home')}</span>
        </button>
        <button
          onClick={() => onSelectTab('listen')}
          className={`py-1.5 px-2 font-medium flex flex-col items-center gap-0.5 ${
            currentTab === 'listen' ? 'text-emerald-800 font-bold' : 'text-slate-500'
          }`}
        >
          <span>{t('listen')}</span>
        </button>
        <button
          onClick={() => onSelectTab('fatwa')}
          className={`py-1.5 px-2 font-medium flex flex-col items-center gap-0.5 ${
            currentTab === 'fatwa' ? 'text-emerald-800 font-bold' : 'text-slate-500'
          }`}
        >
          <span>{t('fatwa')}</span>
        </button>
        <button
          onClick={() => onSelectTab('skeptic')}
          className={`py-1.5 px-2 font-medium flex flex-col items-center gap-0.5 ${
            currentTab === 'skeptic' ? 'text-emerald-800 font-bold' : 'text-slate-500'
          }`}
        >
          <span>{t('nav_skeptic')}</span>
        </button>
        <button
          onClick={() => onSelectTab('history')}
          className={`py-1.5 px-2 font-medium flex flex-col items-center gap-0.5 ${
            currentTab === 'history' ? 'text-emerald-800 font-bold' : 'text-slate-500'
          }`}
        >
          <span>{t('nav_history')}</span>
        </button>
      </div>
    </header>
  );
};
