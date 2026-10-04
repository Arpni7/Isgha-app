import React, { useState } from 'react';
import { LanguageProvider, useLang } from './i18n/LanguageContext';
import { Header } from './components/Header';
import { HeroSection } from './components/HeroSection';
import { ListenScreen } from './components/ListenScreen';
import { ResultsScreen } from './components/ResultsScreen';
import { FatwaScreen } from './components/FatwaScreen';
import { SkepticScreen } from './components/SkepticScreen';
import { HistoryScreen } from './components/HistoryScreen';
import { LanguageModal } from './components/LanguageModal';
import { Extraction } from './types';
import { Shield, BookOpen, Heart } from 'lucide-react';

function AppContent() {
  const { t } = useLang();
  const [currentTab, setCurrentTab] = useState<'home' | 'listen' | 'results' | 'fatwa' | 'skeptic' | 'history'>('home');
  const [activeExtraction, setActiveExtraction] = useState<Extraction | null>(null);
  const [activeFatwaTopic, setActiveFatwaTopic] = useState<string>('');
  const [activeFatwaId, setActiveFatwaId] = useState<string | undefined>(undefined);
  const [langModalOpen, setLangModalOpen] = useState(false);

  const handleSelectTab = (tab: 'home' | 'listen' | 'fatwa' | 'skeptic' | 'history') => {
    setCurrentTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleExtractionSuccess = (data: Extraction) => {
    setActiveExtraction(data);
    setCurrentTab('results');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleQuickQuestion = (q: string) => {
    setActiveFatwaTopic(q);
    setCurrentTab('fatwa');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAskAboutThis = (topic: string) => {
    setActiveFatwaTopic(`ما هي الأحكام والفوائد الشرعية المتعلقة بـ: ${topic}؟`);
    setCurrentTab('fatwa');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenSkepticWithTopic = (topic: string, fatwaId?: string) => {
    setActiveFatwaTopic(topic);
    setActiveFatwaId(fatwaId);
    setCurrentTab('skeptic');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900">
      {/* 3-Zone Navigation Top Bar */}
      <Header
        currentTab={currentTab === 'results' ? 'listen' : currentTab}
        onSelectTab={handleSelectTab}
        onOpenLangModal={() => setLangModalOpen(true)}
      />

      {/* Main Viewport Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6">
        {currentTab === 'home' && (
          <HeroSection
            onSelectTab={handleSelectTab}
            onQuickQuestion={handleQuickQuestion}
          />
        )}

        {currentTab === 'listen' && (
          <ListenScreen
            onSuccess={handleExtractionSuccess}
            onBack={() => setCurrentTab('home')}
          />
        )}

        {currentTab === 'results' && activeExtraction && (
          <ResultsScreen
            data={activeExtraction}
            onBack={() => setCurrentTab('listen')}
            onAskAboutThis={handleAskAboutThis}
          />
        )}

        {currentTab === 'fatwa' && (
          <FatwaScreen
            initialQuestion={activeFatwaTopic}
            onOpenSkepticWithTopic={handleOpenSkepticWithTopic}
            onBack={() => setCurrentTab('home')}
          />
        )}

        {currentTab === 'skeptic' && (
          <SkepticScreen
            initialTopic={activeFatwaTopic || 'حجية السنة النبوية ومنهج حفظ الحديث الشريف'}
            fatwaId={activeFatwaId}
            onBack={() => setCurrentTab('home')}
          />
        )}

        {currentTab === 'history' && (
          <HistoryScreen
            onOpenExtraction={(item) => {
              setActiveExtraction(item);
              setCurrentTab('results');
            }}
            onOpenFatwa={(q) => {
              setActiveFatwaTopic(q);
              setCurrentTab('fatwa');
            }}
            onStartNew={() => setCurrentTab('home')}
            onBack={() => setCurrentTab('home')}
          />
        )}
      </main>

      {/* Language Switcher Modal */}
      <LanguageModal
        isOpen={langModalOpen}
        onClose={() => setLangModalOpen(false)}
      />

      {/* Clean Editorial Footer */}
      <footer className="border-t border-slate-200 bg-white py-8 px-4 text-center space-y-3">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800 text-sm">{t('app_name')}</span>
            <span>·</span>
            <span>{t('app_sub')}</span>
          </div>

          <p className="text-slate-400">
            خدمة إسلامية موجهة لخدمة القرآن الكريم والسنة النبوية ونشر العلم الشرعي المؤصل
          </p>

          <div className="flex items-center gap-4 text-slate-500">
            <button
              onClick={() => setLangModalOpen(true)}
              className="hover:text-emerald-800 transition-colors cursor-pointer"
            >
              {t('change_lang')}
            </button>
            <span>·</span>
            <button
              onClick={() => handleSelectTab('history')}
              className="hover:text-emerald-800 transition-colors cursor-pointer"
            >
              {t('nav_history')}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}
