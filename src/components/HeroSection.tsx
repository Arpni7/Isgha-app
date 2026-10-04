import React from 'react';
import { useLang } from '../i18n/LanguageContext';
import { Volume2, BookOpen, ShieldCheck, History, ArrowRight, ArrowLeft, Sparkles, CheckCircle2 } from 'lucide-react';
import heroListenImg from '../assets/images/hero_listen_hadith_1790799079877.jpg';
import heroFatwaImg from '../assets/images/hero_fatwa_scholar_1790799088948.jpg';

interface HeroSectionProps {
  onSelectTab: (tab: 'home' | 'listen' | 'fatwa' | 'skeptic' | 'history') => void;
  onQuickQuestion: (q: string) => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onSelectTab, onQuickQuestion }) => {
  const { t, isRTL } = useLang();
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  const quickQuestions = [
    'ما حكم صيام يوم عاشوراء ومراتبه؟',
    'كيف تكون طهارة الوضوء الصحيحة كما وردت في السنة؟',
    'ما فضل قراءة سورة الكهف يوم الجمعة؟',
    'ما حكم صلاة الجماعة في المسجد للرجال؟',
    'أحكام قصر وجمع الصلاة للمسافر'
  ];

  return (
    <div className="space-y-10 py-4">
      {/* Intro Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3 pt-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/60 text-emerald-800 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
          <span>{t('tagline')}</span>
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
          {t('welcome')}
        </h1>
        <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto">
          {t('intro')}
        </p>
      </div>

      {/* Primary 2-Column Hero Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
        {/* Card 1: Listen & Extract */}
        <div
          onClick={() => onSelectTab('listen')}
          className="group relative bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md hover:border-emerald-700/40 transition-all duration-200 overflow-hidden cursor-pointer flex flex-col"
        >
          <div className="relative h-48 sm:h-52 w-full overflow-hidden bg-slate-100">
            <img
              src={heroListenImg}
              alt="Listen & Extract Islamic Knowledge"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/30 to-transparent" />
            <div className="absolute top-4 start-4">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/90 backdrop-blur-xs text-emerald-900 text-xs font-bold shadow-xs">
                <Volume2 className="w-3.5 h-3.5 text-emerald-700" />
                <span>{t('listen')}</span>
              </span>
            </div>
          </div>

          <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-slate-900 group-hover:text-emerald-800 transition-colors">
                {t('listen')}
              </h2>
              <p className="text-slate-600 text-sm leading-relaxed">
                {t('listen_desc')}
              </p>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
              <div className="flex items-center gap-1.5 text-emerald-800">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>تسجيل صوتي · رفع ملفات · نصوص</span>
              </div>
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-800 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 transition-transform">
                <span>{t('start_now')}</span>
                <ArrowIcon className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Ask Fatwa */}
        <div
          onClick={() => onSelectTab('fatwa')}
          className="group relative bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md hover:border-emerald-700/40 transition-all duration-200 overflow-hidden cursor-pointer flex flex-col"
        >
          <div className="relative h-48 sm:h-52 w-full overflow-hidden bg-slate-100">
            <img
              src={heroFatwaImg}
              alt="Scholarly Islamic Fatwa and Evidence"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/30 to-transparent" />
            <div className="absolute top-4 start-4">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/90 backdrop-blur-xs text-emerald-900 text-xs font-bold shadow-xs">
                <BookOpen className="w-3.5 h-3.5 text-emerald-700" />
                <span>{t('fatwa')}</span>
              </span>
            </div>
          </div>

          <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-slate-900 group-hover:text-emerald-800 transition-colors">
                {t('fatwa')}
              </h2>
              <p className="text-slate-600 text-sm leading-relaxed">
                {t('fatwa_desc')}
              </p>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
              <div className="flex items-center gap-1.5 text-emerald-800">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>القرآن · السنة · كبار العلماء</span>
              </div>
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-800 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 transition-transform">
                <span>{t('start_now')}</span>
                <ArrowIcon className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary 2-Column Section: Skeptic & History */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-5xl mx-auto">
        <div
          onClick={() => onSelectTab('skeptic')}
          className="bg-white p-5 rounded-xl border border-slate-200/90 hover:border-emerald-700/40 hover:shadow-xs transition-all cursor-pointer flex items-start gap-4"
        >
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-800 flex items-center justify-center shrink-0 border border-amber-200/60">
            <ShieldCheck className="w-5 h-5 text-amber-700" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900">{t('skeptic_card_title')}</h3>
            <p className="text-xs text-slate-500 leading-relaxed">{t('skeptic_card_desc')}</p>
          </div>
        </div>

        <div
          onClick={() => onSelectTab('history')}
          className="bg-white p-5 rounded-xl border border-slate-200/90 hover:border-emerald-700/40 hover:shadow-xs transition-all cursor-pointer flex items-start gap-4"
        >
          <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-800 flex items-center justify-center shrink-0 border border-slate-200/60">
            <History className="w-5 h-5 text-slate-700" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900">{t('history_card_title')}</h3>
            <p className="text-xs text-slate-500 leading-relaxed">{t('history_card_desc')}</p>
          </div>
        </div>
      </div>

      {/* Quick Questions Section */}
      <div className="max-w-5xl mx-auto bg-white rounded-xl border border-slate-200/80 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-emerald-800" />
            <span>{t('popular_questions')}</span>
          </h3>
          <span className="text-xs text-slate-500">اختر سؤالاً للاستفتاء الفوري</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {quickQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => onQuickQuestion(q)}
              className="text-xs text-slate-700 hover:text-emerald-900 bg-slate-50 hover:bg-emerald-50/80 border border-slate-200/80 hover:border-emerald-300 rounded-lg px-3 py-2 transition-colors cursor-pointer text-start"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Scholarly & Ethical Disclaimer */}
      <div className="max-w-4xl mx-auto p-4 rounded-xl bg-amber-50/60 border border-amber-200/60 text-center">
        <p className="text-xs text-amber-900/90 leading-relaxed">
          {t('disclaimer_home')}
        </p>
      </div>
    </div>
  );
};
