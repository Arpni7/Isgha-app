import React, { useState } from 'react';
import { useLang } from '../i18n/LanguageContext';
import { Extraction } from '../types';
import { translateExtraction, listenTransform } from '../api';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Volume2,
  Copy,
  Check,
  Globe,
  Loader2,
  Bookmark,
  Share2,
  Quote,
  CheckCircle2,
  Sparkles,
  FileText,
  Baby,
  HeartHandshake,
  ListOrdered,
  AlertCircle
} from 'lucide-react';

interface ResultsScreenProps {
  data: Extraction;
  onBack: () => void;
  onAskAboutThis: (topic: string) => void;
}

export const ResultsScreen: React.FC<ResultsScreenProps> = ({ data: initialData, onBack, onAskAboutThis }) => {
  const { t, isRTL } = useLang();
  const [data, setData] = useState<Extraction>(initialData);
  const [isTranslating, setIsTranslating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'benefits' | 'verses' | 'hadiths' | 'original'>('all');
  const [transformLoading, setTransformLoading] = useState<'child' | 'newmuslim' | 'practical' | null>(null);
  const [activeTransformation, setActiveTransformation] = useState<{ mode: string; title: string; content: string } | null>(null);
  const [transformCopied, setTransformCopied] = useState(false);
  const [transformError, setTransformError] = useState('');

  const languages = [
    { code: 'ar', label: 'العربية' },
    { code: 'en', label: 'English' },
    { code: 'fr', label: 'Français' },
    { code: 'ur', label: 'اردو' },
    { code: 'tr', label: 'Türkçe' },
    { code: 'id', label: 'Indonesia' },
  ];

  const handleTranslate = async (langCode: string) => {
    if (langCode === data.language) return;
    setIsTranslating(true);
    try {
      const updated = await translateExtraction(data.id, langCode);
      setData(updated);
    } catch (err) {
      console.error('Translation error:', err);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleCopy = () => {
    const textToCopy = `📌 ${data.title}\n\n📖 ${t('summary')}:\n${data.summary}\n\n🌟 ${t('benefits')}:\n${data.benefits.map((b, i) => `${i + 1}. ${b}`).join('\n')}\n\n📜 ${t('hadiths_title')}:\n${data.hadiths.map((h) => `«${h.text}»\n[${h.source} - ${h.narrator}]`).join('\n\n')}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleTransform = async (mode: 'child' | 'newmuslim' | 'practical') => {
    setTransformLoading(mode);
    setTransformError('');
    try {
      const result = await listenTransform(data.id, mode, data.language || 'ar');
      setActiveTransformation(result);
    } catch (err: any) {
      setTransformError(err.message || 'تعذر إعداد الصياغة، يرجى المحاولة لاحقاً');
    } finally {
      setTransformLoading(null);
    }
  };

  const formattedDate = new Date(data.created_at).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-4">
      {/* Top action row */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
        >
          {isRTL ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
          <span>{t('back')}</span>
        </button>

        <div className="flex items-center gap-2">
          {/* Translation selector */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
            <Globe className="w-3.5 h-3.5 text-slate-500 mx-1" />
            {languages.map((l) => (
              <button
                key={l.code}
                onClick={() => handleTranslate(l.code)}
                disabled={isTranslating}
                className={`px-2 py-0.5 text-xs rounded transition-colors cursor-pointer ${
                  (data.language || 'ar') === l.code
                    ? 'bg-white font-bold text-emerald-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>

          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors shadow-xs"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? t('copied') : t('copy_results')}</span>
          </button>
        </div>
      </div>

      {isTranslating && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-center gap-2 text-xs text-amber-900 font-medium">
          <Loader2 className="w-4 h-4 animate-spin text-amber-700" />
          <span>{t('translating')}</span>
        </div>
      )}

      {/* Main Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-snug">
            {data.title}
          </h1>
          <div className="text-xs text-slate-500 shrink-0">
            <span>{formattedDate}</span>
          </div>
        </div>

        {/* Section: Summary */}
        <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200/60 space-y-2">
          <h3 className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
            <Quote className="w-3.5 h-3.5 text-emerald-700" />
            <span>{t('summary')}</span>
          </h3>
          <p className="text-sm leading-relaxed text-slate-800 font-medium">
            {data.summary}
          </p>
        </div>

        {/* Action Bar (Adaptations & Fatwa Jump) */}
        <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 w-full sm:w-auto">
            خيارات وتطبيقات:
          </span>

          <button
            onClick={() => handleTransform('child')}
            disabled={transformLoading !== null}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors shadow-2xs ${
              activeTransformation?.mode === 'child'
                ? 'bg-blue-50 border-blue-300 text-blue-900 font-bold'
                : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
            }`}
          >
            <Baby className="w-3.5 h-3.5 text-blue-600" />
            <span>{transformLoading === 'child' ? t('tr_loading') : t('act_child')}</span>
          </button>

          <button
            onClick={() => handleTransform('newmuslim')}
            disabled={transformLoading !== null}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors shadow-2xs ${
              activeTransformation?.mode === 'newmuslim'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
            }`}
          >
            <HeartHandshake className="w-3.5 h-3.5 text-emerald-700" />
            <span>{transformLoading === 'newmuslim' ? t('tr_loading') : t('act_newmuslim')}</span>
          </button>

          <button
            onClick={() => handleTransform('practical')}
            disabled={transformLoading !== null}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors shadow-2xs ${
              activeTransformation?.mode === 'practical'
                ? 'bg-amber-50 border-amber-300 text-amber-900 font-bold'
                : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
            }`}
          >
            <ListOrdered className="w-3.5 h-3.5 text-amber-600" />
            <span>{transformLoading === 'practical' ? t('tr_loading') : t('act_practical')}</span>
          </button>

          <button
            onClick={() => onAskAboutThis(data.title)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-xs ms-auto"
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-300" />
            <span>{t('ask_about_this')}</span>
          </button>
        </div>
      </div>

      {/* Transform Error Notice */}
      {transformError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <span>{transformError}</span>
        </div>
      )}

      {/* Active Transformation Card (Child, Non-Muslim, Practical Steps) */}
      {activeTransformation && (
        <div className="bg-white rounded-2xl border-2 border-emerald-600/30 p-6 sm:p-8 shadow-sm space-y-4 animate-in fade-in duration-300">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              {activeTransformation.mode === 'child' ? (
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700">
                  <Baby className="w-4 h-4" />
                </div>
              ) : activeTransformation.mode === 'newmuslim' ? (
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-800">
                  <HeartHandshake className="w-4 h-4" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-800">
                  <ListOrdered className="w-4 h-4" />
                </div>
              )}
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {activeTransformation.title}
                </h3>
                <span className="text-[11px] text-slate-400">
                  {activeTransformation.mode === 'child'
                    ? t('tr_child_title')
                    : activeTransformation.mode === 'newmuslim'
                    ? t('tr_newmuslim_title')
                    : t('tr_practical_title')}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(activeTransformation.content);
                  setTransformCopied(true);
                  setTimeout(() => setTransformCopied(false), 2000);
                }}
                className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors font-medium cursor-pointer"
              >
                {transformCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{transformCopied ? t('copied') : 'نسخ الصياغة'}</span>
              </button>
              <button
                onClick={() => setActiveTransformation(null)}
                className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer px-2 py-1"
              >
                إغلاق
              </button>
            </div>
          </div>

          <div className="text-sm sm:text-base leading-relaxed text-slate-800 font-sans whitespace-pre-wrap selection:bg-emerald-100 bg-slate-50/80 p-5 rounded-xl border border-slate-200/70">
            {activeTransformation.content}
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg max-w-md">
        <button
          onClick={() => setActiveTab('all')}
          className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
            activeTab === 'all' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          الكل
        </button>
        <button
          onClick={() => setActiveTab('benefits')}
          className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
            activeTab === 'benefits' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          {t('benefits')} ({data.benefits.length})
        </button>
        <button
          onClick={() => setActiveTab('hadiths')}
          className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
            activeTab === 'hadiths' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          {t('hadiths_title')} ({data.hadiths.length})
        </button>
        <button
          onClick={() => setActiveTab('verses')}
          className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
            activeTab === 'verses' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          {t('verses_title')} ({data.verses.length})
        </button>
        {data.original_text && (
          <button
            onClick={() => setActiveTab('original')}
            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              activeTab === 'original' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t('original_transcript_tab')}
          </button>
        )}
      </div>

      {/* Section 1: Benefits */}
      {(activeTab === 'all' || activeTab === 'benefits') && data.benefits.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-700" />
            <span>{t('benefits')}</span>
          </h2>
          <div className="space-y-3">
            {data.benefits.map((benefit, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/60"
              >
                <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-900 text-xs font-bold flex items-center justify-center shrink-0">
                  {idx + 1}
                </span>
                <p className="text-sm text-slate-800 leading-relaxed font-medium">
                  {benefit}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 2: Prophetic Hadiths */}
      {(activeTab === 'all' || activeTab === 'hadiths') && data.hadiths.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-600" />
            <span>{t('hadiths_title')}</span>
          </h2>

          <div className="space-y-4">
            {data.hadiths.map((hadith, idx) => (
              <div
                key={idx}
                className="p-5 rounded-xl bg-amber-50/40 border border-amber-200/70 space-y-3"
              >
                <div className="text-base sm:text-lg font-quran text-slate-900 leading-loose text-center sm:text-start px-2 py-1">
                  «{hadith.text}»
                </div>

                {/* Zero-Pill clean unboxed metadata with subtle typographic separators */}
                <div className="pt-2 border-t border-amber-200/50 flex flex-wrap items-center gap-2 text-xs text-amber-950/80">
                  {hadith.narrator && (
                    <>
                      <span>{t('narrator_label')} {hadith.narrator}</span>
                      <span aria-hidden="true" className="text-amber-400">·</span>
                    </>
                  )}
                  <span>{t('source_label')} {hadith.source}</span>
                  {hadith.grade && (
                    <>
                      <span aria-hidden="true" className="text-amber-400">·</span>
                      <span className="font-semibold text-emerald-800">
                        {t('grade_label')} {hadith.grade}
                      </span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 3: Quranic Verses */}
      {(activeTab === 'all' || activeTab === 'verses') && data.verses.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-800" />
            <span>{t('verses_title')}</span>
          </h2>

          <div className="space-y-4">
            {data.verses.map((verse, idx) => (
              <div
                key={idx}
                className="p-5 rounded-xl bg-emerald-50/30 border border-emerald-200/70 space-y-3"
              >
                <div className="text-lg sm:text-xl font-quran text-slate-900 leading-loose text-center px-4 py-2 bg-white/70 rounded-lg border border-emerald-100">
                  ﴿ {verse.arabic} ﴾
                </div>
                <div className="text-xs text-emerald-900 font-semibold text-end">
                  {verse.reference}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section: Original Transcribed Text */}
      {(activeTab === 'all' || activeTab === 'original') && data.original_text && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-700" />
              <span>{t('original_transcript_tab')}</span>
            </h2>
            <button
              onClick={() => {
                navigator.clipboard.writeText(data.original_text || '');
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer transition-colors font-medium"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? t('copied') : 'نسخ النص'}</span>
            </button>
          </div>
          <div className="p-4 sm:p-5 rounded-xl bg-slate-50 border border-slate-200 text-sm sm:text-base leading-relaxed text-slate-800 font-sans whitespace-pre-wrap selection:bg-emerald-100">
            {data.original_text}
          </div>
        </div>
      )}

      {/* Section 4: Sources */}
      {data.sources.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs space-y-2">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            {t('sources_title')}
          </h3>
          <div className="flex flex-wrap gap-2 text-xs text-slate-700">
            {data.sources.map((src, idx) => (
              <span key={idx} className="bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200/70">
                {src}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
