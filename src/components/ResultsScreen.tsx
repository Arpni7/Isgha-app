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
  AlertCircle,
  VolumeX,
  Pause,
  Play,
  Sliders,
  Search,
  ChevronDown,
  ChevronUp,
  Layers
} from 'lucide-react';
import { useSpeechPlayer } from '../utils/useSpeechPlayer';
import { AudioSettingsModal } from './AudioSettingsModal';
import { NoArabicVoiceModal } from './NoArabicVoiceModal';
import { FactVerificationModal } from './FactVerificationModal';
import { ShareBenefitModal } from './ShareBenefitModal';
import { adaptBenefit } from '../api';
import { MainTopic } from '../types';

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

  // Arabic TTS audio controller
  const speech = useSpeechPlayer();
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [activeSpeechTarget, setActiveSpeechTarget] = useState<'summary' | 'transform' | null>(null);

  React.useEffect(() => {
    return () => {
      speech.stop();
    };
  }, []);

  const toggleSpeakSummary = () => {
    if (speech.isPlaying && activeSpeechTarget === 'summary') {
      speech.stop();
      setActiveSpeechTarget(null);
    } else {
      speech.stop();
      setActiveSpeechTarget('summary');
      speech.play(`${data.title}. ${data.summary}`);
    }
  };

  const toggleSpeakTransform = () => {
    if (speech.isPlaying && activeSpeechTarget === 'transform') {
      speech.stop();
      setActiveSpeechTarget(null);
    } else {
      speech.stop();
      setActiveSpeechTarget('transform');
      speech.play(activeTransformation?.content || '');
    }
  };

  // 1. Fact Verification State (Requirement 1)
  const [verificationModalOpen, setVerificationModalOpen] = useState(false);
  const [verificationStatement, setVerificationStatement] = useState('');

  // 2. Share Benefit State (Requirement 5)
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareBenefitText, setShareBenefitText] = useState('');
  const [shareBenefitSource, setShareBenefitSource] = useState('');

  // 3. Benefit Adaptation State (Requirement 3: ماذا تريد أن تفعل بهذه المعلومة؟)
  const [adaptedBenefits, setAdaptedBenefits] = useState<
    Record<string, { mode: string; title: string; content: string; loading?: boolean }>
  >({});
  const [openActionMenuFor, setOpenActionMenuFor] = useState<string | null>(null);
  const [translateSubmenuFor, setTranslateSubmenuFor] = useState<string | null>(null);
  const [adaptedCopied, setAdaptedCopied] = useState<string | null>(null);
  const [speakingAdaptedBenefit, setSpeakingAdaptedBenefit] = useState<string | null>(null);

  // 4. Topic Organization View Mode (Requirement 2)
  const [viewMode, setViewMode] = useState<'topics' | 'flat'>('topics');

  // Compute topics if not already structured
  const topicsList: MainTopic[] = React.useMemo(() => {
    if (data.topics && Array.isArray(data.topics) && data.topics.length > 0) {
      return data.topics;
    }
    if (!data.benefits || data.benefits.length === 0) return [];
    if (data.benefits.length <= 2) {
      return [{ title: 'الفوائد والدروس المستخلصة', benefits: data.benefits }];
    }
    const mid = Math.ceil(data.benefits.length / 2);
    return [
      {
        title: 'الموضوع الأول: الفضائل والأسس الإيمانية',
        benefits: data.benefits.slice(0, mid)
      },
      {
        title: 'الموضوع الثاني: التوجيهات والتطبيقات العملية',
        benefits: data.benefits.slice(mid)
      }
    ];
  }, [data.topics, data.benefits]);

  const handleAdaptBenefit = async (benefit: string, mode: string, targetLang?: string) => {
    setOpenActionMenuFor(null);
    setTranslateSubmenuFor(null);
    if (mode === 'share') {
      setShareBenefitText(benefit);
      setShareBenefitSource(data.sources && data.sources.length > 0 ? data.sources[0] : '');
      setShareModalOpen(true);
      return;
    }
    if (mode === 'verify') {
      setVerificationStatement(benefit);
      setVerificationModalOpen(true);
      return;
    }

    setAdaptedBenefits((prev) => ({
      ...prev,
      [benefit]: { mode, title: '', content: '', loading: true }
    }));

    try {
      const langToUse = mode === 'translate' ? (targetLang || 'en') : (data.language || 'ar');
      const res = await adaptBenefit(benefit, mode, data.title, langToUse);
      setAdaptedBenefits((prev) => ({
        ...prev,
        [benefit]: { mode: res.mode, title: res.title, content: res.content, loading: false }
      }));
    } catch (err: any) {
      setAdaptedBenefits((prev) => ({
        ...prev,
        [benefit]: {
          mode,
          title: 'تعذر التكييف',
          content: 'حدث خطأ أثناء تكييف الفائدة، يرجى المحاولة لاحقاً.',
          loading: false
        }
      }));
    }
  };

  const toggleSpeakAdapted = (benefitKey: string, text: string) => {
    if (speech.isPlaying && speakingAdaptedBenefit === benefitKey) {
      speech.stop();
      setSpeakingAdaptedBenefit(null);
    } else {
      speech.stop();
      setSpeakingAdaptedBenefit(benefitKey);
      speech.play(text);
    }
  };

  const handleCopyAdapted = (benefitKey: string, text: string) => {
    navigator.clipboard.writeText(text);
    setAdaptedCopied(benefitKey);
    setTimeout(() => setAdaptedCopied(null), 2000);
  };

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

          {/* Global Fact Verification Button */}
          <button
            onClick={() => {
              setVerificationStatement(data.summary ? data.summary.slice(0, 160) : data.title);
              setVerificationModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/90 rounded-lg cursor-pointer transition-colors shadow-2xs"
            title="التحقق من معلومة أو مسألة في المحاضرة"
          >
            <Search className="w-3.5 h-3.5 text-emerald-700" />
            <span>تحقق من المعلومة 🔎</span>
          </button>

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
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
              <Quote className="w-3.5 h-3.5 text-emerald-700" />
              <span>{t('summary')}</span>
            </h3>

            {/* Read-aloud with Saudi Arabic voice */}
            {'speechSynthesis' in window && (
              <div className="flex items-center gap-1">
                <button
                  onClick={toggleSpeakSummary}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
                    speech.isPlaying && activeSpeechTarget === 'summary'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-200/80 shadow-2xs'
                  }`}
                  title={
                    speech.isPlaying && activeSpeechTarget === 'summary'
                      ? 'إيقاف الاستماع'
                      : 'استماع للملخص بصوت سعودي'
                  }
                >
                  {speech.isPlaying && activeSpeechTarget === 'summary' ? (
                    <>
                      <VolumeX className="w-3.5 h-3.5" />
                      <span>إيقاف</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-3.5 h-3.5 text-emerald-700" />
                      <span>استماع</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowSettingsModal(true)}
                  className="p-1 text-emerald-800 hover:text-emerald-950 bg-white hover:bg-emerald-100 rounded-md border border-emerald-200/80 cursor-pointer transition-colors"
                  title="إعدادات الصوت والسرعة"
                >
                  <Sliders className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
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
              {'speechSynthesis' in window && (
                <button
                  onClick={toggleSpeakTransform}
                  className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg transition-colors font-medium cursor-pointer ${
                    speech.isPlaying && activeSpeechTarget === 'transform'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                  title="استماع للصياغة بصوت سعودي"
                >
                  {speech.isPlaying && activeSpeechTarget === 'transform' ? (
                    <>
                      <VolumeX className="w-3.5 h-3.5" />
                      <span>إيقاف</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-3.5 h-3.5 text-emerald-700" />
                      <span>استماع</span>
                    </>
                  )}
                </button>
              )}
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
                onClick={() => {
                  if (activeSpeechTarget === 'transform') speech.stop();
                  setActiveTransformation(null);
                }}
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

      {/* Section 1: Topic-Organized Benefits (Requirement 2, 1, 3, 5) */}
      {(activeTab === 'all' || activeTab === 'benefits') && data.benefits.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-700" />
              <h2 className="text-base font-bold text-slate-900">
                {viewMode === 'topics' ? 'الموضوعات الرئيسية والفوائد' : t('benefits')}
              </h2>
              <span className="text-xs font-semibold text-emerald-800 bg-emerald-100/70 px-2.5 py-0.5 rounded-full">
                {data.benefits.length} فوائد
              </span>
            </div>

            {/* Toggle view mode between Topics and Flat */}
            {topicsList.length > 1 && (
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs self-start sm:self-auto">
                <button
                  onClick={() => setViewMode('topics')}
                  className={`px-3 py-1 rounded-md font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
                    viewMode === 'topics'
                      ? 'bg-white text-emerald-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>حسب الموضوعات</span>
                </button>
                <button
                  onClick={() => setViewMode('flat')}
                  className={`px-3 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                    viewMode === 'flat'
                      ? 'bg-white text-emerald-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  قائمة شاملة
                </button>
              </div>
            )}
          </div>

          {/* Render Topics or Flat List */}
          {viewMode === 'topics' && topicsList.length > 0 ? (
            <div className="space-y-6">
              {/* Visual Hierarchy Indicator */}
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-900 bg-emerald-50/80 px-3 py-2 rounded-xl border border-emerald-200/70">
                <span>الموضوعات الرئيسية للمحاضرة</span>
                <span>←</span>
                <span className="text-slate-600 font-normal">مرتبة بحسب محاور الحديث مع الفوائد المتعلقة بكل محور</span>
              </div>

              {topicsList.map((topic, tIdx) => (
                <div
                  key={tIdx}
                  className="space-y-3 p-4 sm:p-5 rounded-2xl bg-slate-50/80 border border-slate-200/90 shadow-2xs"
                >
                  <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200/70">
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-emerald-800 text-white text-xs font-bold flex items-center justify-center shrink-0 shadow-2xs">
                        {tIdx + 1}
                      </span>
                      <span>{topic.title}</span>
                    </h3>
                    <span className="text-[11px] font-semibold text-emerald-800 bg-white px-2.5 py-0.5 rounded-md border border-slate-200">
                      {topic.benefits.length} فوائد
                    </span>
                  </div>

                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 pt-0.5">
                    <span className="text-emerald-700 font-extrabold">←</span>
                    <span>الفوائد المتعلقة بهذا الموضوع:</span>
                  </div>

                  <div className="space-y-3 pt-1">
                    {topic.benefits.map((benefit, bIdx) => {
                      const itemKey = `${tIdx}-${bIdx}`;
                      return (
                        <div
                          key={bIdx}
                          className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-3"
                        >
                          <div className="flex items-start gap-3">
                            <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-900 text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                              {bIdx + 1}
                            </span>
                            <p className="text-sm text-slate-800 leading-relaxed font-medium flex-1">
                              {benefit}
                            </p>
                          </div>

                          {/* Action Bar for Benefit (Requirement 1, 3, 5) */}
                          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {/* 1. Fact Verification button */}
                              <button
                                onClick={() => {
                                  setVerificationStatement(benefit);
                                  setVerificationModalOpen(true);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-900 text-slate-700 font-semibold transition-colors cursor-pointer border border-slate-200/70"
                                title="التحقق من صحة ومصدر هذه الفائدة"
                              >
                                <Search className="w-3.5 h-3.5 text-emerald-700" />
                                <span>تحقق من المعلومة</span>
                              </button>

                              {/* 2. "What do you want to do with this benefit?" Menu Trigger */}
                              <div className="relative">
                                <button
                                  onClick={() => {
                                    setTranslateSubmenuFor(null);
                                    setOpenActionMenuFor(openActionMenuFor === itemKey ? null : itemKey);
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-950 font-bold transition-colors cursor-pointer border border-emerald-200 shadow-2xs"
                                >
                                  <span>ماذا تريد أن تفعل بهذه المعلومة؟</span>
                                  <ChevronDown className="w-3 h-3 text-emerald-700" />
                                </button>

                                {/* Action Dropdown Menu */}
                                {openActionMenuFor === itemKey && (
                                  <div className="absolute start-0 mt-1 w-60 rounded-xl bg-white border border-slate-200 shadow-xl z-30 p-1.5 space-y-0.5 text-xs animate-in fade-in duration-150">
                                    <button
                                      onClick={() => handleAdaptBenefit(benefit, 'understand')}
                                      className="w-full text-start px-3 py-2 rounded-lg hover:bg-emerald-50 text-slate-800 hover:text-emerald-950 flex items-center gap-2 cursor-pointer font-medium"
                                    >
                                      <span>👤</span>
                                      <span>أفهمها لنفسي وتطبيقها</span>
                                    </button>
                                    <button
                                      onClick={() => handleAdaptBenefit(benefit, 'child')}
                                      className="w-full text-start px-3 py-2 rounded-lg hover:bg-blue-50 text-slate-800 hover:text-blue-950 flex items-center gap-2 cursor-pointer font-medium"
                                    >
                                      <span>👧</span>
                                      <span>أبسطها لطفل</span>
                                    </button>
                                    <button
                                      onClick={() => handleAdaptBenefit(benefit, 'nonmuslim')}
                                      className="w-full text-start px-3 py-2 rounded-lg hover:bg-teal-50 text-slate-800 hover:text-teal-950 flex items-center gap-2 cursor-pointer font-medium"
                                    >
                                      <span>🌍</span>
                                      <span>أشرحها لغير مسلم</span>
                                    </button>
                                    <button
                                      onClick={() => handleAdaptBenefit(benefit, 'skeptic')}
                                      className="w-full text-start px-3 py-2 rounded-lg hover:bg-purple-50 text-slate-800 hover:text-purple-950 flex items-center gap-2 cursor-pointer font-medium"
                                    >
                                      <span>💬</span>
                                      <span>أستعد لمناقشة شخص متشكك</span>
                                    </button>

                                    {/* Translation item with sub-languages */}
                                    <div className="border-t border-slate-100 pt-1 mt-1">
                                      <button
                                        onClick={() =>
                                          setTranslateSubmenuFor(translateSubmenuFor === itemKey ? null : itemKey)
                                        }
                                        className="w-full text-start px-3 py-1.5 rounded-lg hover:bg-slate-100 text-slate-800 flex items-center justify-between cursor-pointer font-medium"
                                      >
                                        <div className="flex items-center gap-2">
                                          <span>🌐</span>
                                          <span>أترجمها للغة أخرى</span>
                                        </div>
                                        <ChevronDown className="w-3 h-3 text-slate-400" />
                                      </button>

                                      {translateSubmenuFor === itemKey && (
                                        <div className="ps-6 pe-2 py-1 space-y-1 bg-slate-50 rounded-lg my-1 text-[11px]">
                                          <button
                                            onClick={() => handleAdaptBenefit(benefit, 'translate', 'en')}
                                            className="w-full text-start py-1 px-2 rounded hover:bg-white text-slate-700 hover:text-emerald-900 cursor-pointer block font-medium"
                                          >
                                            🇬🇧 English (الإنجليزية)
                                          </button>
                                          <button
                                            onClick={() => handleAdaptBenefit(benefit, 'translate', 'fr')}
                                            className="w-full text-start py-1 px-2 rounded hover:bg-white text-slate-700 hover:text-emerald-900 cursor-pointer block font-medium"
                                          >
                                            🇫🇷 Français (الفرنسية)
                                          </button>
                                          <button
                                            onClick={() => handleAdaptBenefit(benefit, 'translate', 'ur')}
                                            className="w-full text-start py-1 px-2 rounded hover:bg-white text-slate-700 hover:text-emerald-900 cursor-pointer block font-medium"
                                          >
                                            🇵🇰 اردو (الأردية)
                                          </button>
                                          <button
                                            onClick={() => handleAdaptBenefit(benefit, 'translate', 'tr')}
                                            className="w-full text-start py-1 px-2 rounded hover:bg-white text-slate-700 hover:text-emerald-900 cursor-pointer block font-medium"
                                          >
                                            🇹🇷 Türkçe (التركية)
                                          </button>
                                          <button
                                            onClick={() => handleAdaptBenefit(benefit, 'translate', 'id')}
                                            className="w-full text-start py-1 px-2 rounded hover:bg-white text-slate-700 hover:text-emerald-900 cursor-pointer block font-medium"
                                          >
                                            🇮🇩 Indonesia (الإندونيسية)
                                          </button>
                                        </div>
                                      )}
                                    </div>

                                    <button
                                      onClick={() => handleAdaptBenefit(benefit, 'share')}
                                      className="w-full text-start px-3 py-2 rounded-lg hover:bg-amber-50 text-slate-800 hover:text-amber-950 flex items-center gap-2 cursor-pointer font-medium"
                                    >
                                      <span>📤</span>
                                      <span>أشاركها كبطاقة أنيقة</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* 3. Direct Share Button */}
                            <button
                              onClick={() => {
                                setShareBenefitText(benefit);
                                setShareBenefitSource(
                                  data.sources && data.sources.length > 0 ? data.sources[0] : ''
                                );
                                setShareModalOpen(true);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-colors cursor-pointer"
                              title="مشاركة الفائدة كبطاقة أو نص"
                            >
                              <Share2 className="w-3.5 h-3.5 text-slate-600" />
                              <span>مشاركة</span>
                            </button>
                          </div>

                          {/* Inline Adapted Content Container */}
                          {adaptedBenefits[benefit] && (
                            <div className="mt-3 p-4 rounded-xl bg-slate-50 border border-emerald-200/80 space-y-2.5 animate-in fade-in duration-200">
                              <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                                <span className="font-bold text-xs text-emerald-950 flex items-center gap-1.5">
                                  <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                                  <span>{adaptedBenefits[benefit].title || 'الصياغة المكيفة'}</span>
                                </span>

                                {!adaptedBenefits[benefit].loading && (
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      onClick={() => handleCopyAdapted(benefit, adaptedBenefits[benefit].content)}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-slate-200 hover:bg-slate-50 text-[11px] font-semibold text-slate-700 cursor-pointer transition-colors shadow-2xs"
                                      title="نسخ الصياغة"
                                    >
                                      {adaptedCopied === benefit ? (
                                        <Check className="w-3 h-3 text-emerald-700" />
                                      ) : (
                                        <Copy className="w-3 h-3 text-slate-500" />
                                      )}
                                      <span>{adaptedCopied === benefit ? 'تم النسخ' : 'نسخ'}</span>
                                    </button>

                                    {'speechSynthesis' in window && (
                                      <button
                                        onClick={() => toggleSpeakAdapted(benefit, adaptedBenefits[benefit].content)}
                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold cursor-pointer transition-colors shadow-2xs ${
                                          speech.isPlaying && speakingAdaptedBenefit === benefit
                                            ? 'bg-emerald-700 text-white'
                                            : 'bg-white border border-slate-200 hover:bg-emerald-50 text-emerald-900'
                                        }`}
                                        title="استماع للصياغة بصوت سعودي"
                                      >
                                        {speech.isPlaying && speakingAdaptedBenefit === benefit ? (
                                          <>
                                            <VolumeX className="w-3 h-3" />
                                            <span>إيقاف</span>
                                          </>
                                        ) : (
                                          <>
                                            <Volume2 className="w-3 h-3 text-emerald-700" />
                                            <span>استماع</span>
                                          </>
                                        )}
                                      </button>
                                    )}

                                    <button
                                      onClick={() => {
                                        setShareBenefitText(adaptedBenefits[benefit].content);
                                        setShareBenefitSource(
                                          `تكييف فائدة: ${adaptedBenefits[benefit].title} (من محاضرة: ${data.title})`
                                        );
                                        setShareModalOpen(true);
                                      }}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-slate-200 hover:bg-slate-50 text-[11px] font-semibold text-slate-700 cursor-pointer transition-colors shadow-2xs"
                                      title="مشاركة كبطاقة"
                                    >
                                      <Share2 className="w-3 h-3 text-slate-500" />
                                      <span>مشاركة</span>
                                    </button>

                                    <button
                                      onClick={() => {
                                        if (speakingAdaptedBenefit === benefit) speech.stop();
                                        setAdaptedBenefits((prev) => {
                                          const next = { ...prev };
                                          delete next[benefit];
                                          return next;
                                        });
                                      }}
                                      className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer px-1"
                                    >
                                      إغلاق
                                    </button>
                                  </div>
                                )}
                              </div>

                              {adaptedBenefits[benefit].loading ? (
                                <div className="p-4 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                                  <Loader2 className="w-4 h-4 animate-spin text-emerald-700" />
                                  <span>جاري تكييف الفائدة وصياغتها بدقة...</span>
                                </div>
                              ) : (
                                <div className="text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                                  {adaptedBenefits[benefit].content}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {data.benefits.map((benefit, idx) => {
                const itemKey = `flat-${idx}`;
                return (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-3"
                  >
                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-900 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <p className="text-sm text-slate-800 leading-relaxed font-medium flex-1">
                        {benefit}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          onClick={() => {
                            setVerificationStatement(benefit);
                            setVerificationModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-900 text-slate-700 font-semibold transition-colors cursor-pointer border border-slate-200/70"
                        >
                          <Search className="w-3.5 h-3.5 text-emerald-700" />
                          <span>تحقق من المعلومة</span>
                        </button>

                        <div className="relative">
                          <button
                            onClick={() => {
                              setTranslateSubmenuFor(null);
                              setOpenActionMenuFor(openActionMenuFor === itemKey ? null : itemKey);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-950 font-bold transition-colors cursor-pointer border border-emerald-200 shadow-2xs"
                          >
                            <span>ماذا تريد أن تفعل بهذه المعلومة؟</span>
                            <ChevronDown className="w-3 h-3 text-emerald-700" />
                          </button>

                          {openActionMenuFor === itemKey && (
                            <div className="absolute start-0 mt-1 w-60 rounded-xl bg-white border border-slate-200 shadow-xl z-30 p-1.5 space-y-0.5 text-xs animate-in fade-in duration-150">
                              <button
                                onClick={() => handleAdaptBenefit(benefit, 'understand')}
                                className="w-full text-start px-3 py-2 rounded-lg hover:bg-emerald-50 text-slate-800 hover:text-emerald-950 flex items-center gap-2 cursor-pointer font-medium"
                              >
                                <span>👤</span>
                                <span>أفهمها لنفسي وتطبيقها</span>
                              </button>
                              <button
                                onClick={() => handleAdaptBenefit(benefit, 'child')}
                                className="w-full text-start px-3 py-2 rounded-lg hover:bg-blue-50 text-slate-800 hover:text-blue-950 flex items-center gap-2 cursor-pointer font-medium"
                              >
                                <span>👧</span>
                                <span>أبسطها لطفل</span>
                              </button>
                              <button
                                onClick={() => handleAdaptBenefit(benefit, 'nonmuslim')}
                                className="w-full text-start px-3 py-2 rounded-lg hover:bg-teal-50 text-slate-800 hover:text-teal-950 flex items-center gap-2 cursor-pointer font-medium"
                              >
                                <span>🌍</span>
                                <span>أشرحها لغير مسلم</span>
                              </button>
                              <button
                                onClick={() => handleAdaptBenefit(benefit, 'skeptic')}
                                className="w-full text-start px-3 py-2 rounded-lg hover:bg-purple-50 text-slate-800 hover:text-purple-950 flex items-center gap-2 cursor-pointer font-medium"
                              >
                                <span>💬</span>
                                <span>أستعد لمناقشة شخص متشكك</span>
                              </button>

                              {/* Translation item with sub-languages */}
                              <div className="border-t border-slate-100 pt-1 mt-1">
                                <button
                                  onClick={() =>
                                    setTranslateSubmenuFor(translateSubmenuFor === itemKey ? null : itemKey)
                                  }
                                  className="w-full text-start px-3 py-1.5 rounded-lg hover:bg-slate-100 text-slate-800 flex items-center justify-between cursor-pointer font-medium"
                                >
                                  <div className="flex items-center gap-2">
                                    <span>🌐</span>
                                    <span>أترجمها للغة أخرى</span>
                                  </div>
                                  <ChevronDown className="w-3 h-3 text-slate-400" />
                                </button>

                                {translateSubmenuFor === itemKey && (
                                  <div className="ps-6 pe-2 py-1 space-y-1 bg-slate-50 rounded-lg my-1 text-[11px]">
                                    <button
                                      onClick={() => handleAdaptBenefit(benefit, 'translate', 'en')}
                                      className="w-full text-start py-1 px-2 rounded hover:bg-white text-slate-700 hover:text-emerald-900 cursor-pointer block font-medium"
                                    >
                                      🇬🇧 English (الإنجليزية)
                                    </button>
                                    <button
                                      onClick={() => handleAdaptBenefit(benefit, 'translate', 'fr')}
                                      className="w-full text-start py-1 px-2 rounded hover:bg-white text-slate-700 hover:text-emerald-900 cursor-pointer block font-medium"
                                    >
                                      🇫🇷 Français (الفرنسية)
                                    </button>
                                    <button
                                      onClick={() => handleAdaptBenefit(benefit, 'translate', 'ur')}
                                      className="w-full text-start py-1 px-2 rounded hover:bg-white text-slate-700 hover:text-emerald-900 cursor-pointer block font-medium"
                                    >
                                      🇵🇰 اردو (الأردية)
                                    </button>
                                    <button
                                      onClick={() => handleAdaptBenefit(benefit, 'translate', 'tr')}
                                      className="w-full text-start py-1 px-2 rounded hover:bg-white text-slate-700 hover:text-emerald-900 cursor-pointer block font-medium"
                                    >
                                      🇹🇷 Türkçe (التركية)
                                    </button>
                                    <button
                                      onClick={() => handleAdaptBenefit(benefit, 'translate', 'id')}
                                      className="w-full text-start py-1 px-2 rounded hover:bg-white text-slate-700 hover:text-emerald-900 cursor-pointer block font-medium"
                                    >
                                      🇮🇩 Indonesia (الإندونيسية)
                                    </button>
                                  </div>
                                )}
                              </div>

                              <button
                                onClick={() => handleAdaptBenefit(benefit, 'share')}
                                className="w-full text-start px-3 py-2 rounded-lg hover:bg-amber-50 text-slate-800 hover:text-amber-950 flex items-center gap-2 cursor-pointer font-medium"
                              >
                                <span>📤</span>
                                <span>أشاركها كبطاقة أنيقة</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setShareBenefitText(benefit);
                          setShareBenefitSource(
                            data.sources && data.sources.length > 0 ? data.sources[0] : ''
                          );
                          setShareModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-colors cursor-pointer"
                      >
                        <Share2 className="w-3.5 h-3.5 text-slate-600" />
                        <span>مشاركة</span>
                      </button>
                    </div>

                    {adaptedBenefits[benefit] && (
                      <div className="mt-3 p-4 rounded-xl bg-slate-50 border border-emerald-200/80 space-y-2.5 animate-in fade-in duration-200">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                          <span className="font-bold text-xs text-emerald-950 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                            <span>{adaptedBenefits[benefit].title || 'الصياغة المكيفة'}</span>
                          </span>

                          {!adaptedBenefits[benefit].loading && (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleCopyAdapted(benefit, adaptedBenefits[benefit].content)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-slate-200 hover:bg-slate-50 text-[11px] font-semibold text-slate-700 cursor-pointer transition-colors shadow-2xs"
                                title="نسخ الصياغة"
                              >
                                {adaptedCopied === benefit ? (
                                  <Check className="w-3 h-3 text-emerald-700" />
                                ) : (
                                  <Copy className="w-3 h-3 text-slate-500" />
                                )}
                                <span>{adaptedCopied === benefit ? 'تم النسخ' : 'نسخ'}</span>
                              </button>

                              {'speechSynthesis' in window && (
                                <button
                                  onClick={() => toggleSpeakAdapted(benefit, adaptedBenefits[benefit].content)}
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold cursor-pointer transition-colors shadow-2xs ${
                                    speech.isPlaying && speakingAdaptedBenefit === benefit
                                      ? 'bg-emerald-700 text-white'
                                      : 'bg-white border border-slate-200 hover:bg-emerald-50 text-emerald-900'
                                  }`}
                                  title="استماع للصياغة بصوت سعودي"
                                >
                                  {speech.isPlaying && speakingAdaptedBenefit === benefit ? (
                                    <>
                                      <VolumeX className="w-3 h-3" />
                                      <span>إيقاف</span>
                                    </>
                                  ) : (
                                    <>
                                      <Volume2 className="w-3 h-3 text-emerald-700" />
                                      <span>استماع</span>
                                    </>
                                  )}
                                </button>
                              )}

                              <button
                                onClick={() => {
                                  setShareBenefitText(adaptedBenefits[benefit].content);
                                  setShareBenefitSource(
                                    `تكييف فائدة: ${adaptedBenefits[benefit].title} (من محاضرة: ${data.title})`
                                  );
                                  setShareModalOpen(true);
                                }}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-slate-200 hover:bg-slate-50 text-[11px] font-semibold text-slate-700 cursor-pointer transition-colors shadow-2xs"
                                title="مشاركة كبطاقة"
                              >
                                <Share2 className="w-3 h-3 text-slate-500" />
                                <span>مشاركة</span>
                              </button>

                              <button
                                onClick={() => {
                                  if (speakingAdaptedBenefit === benefit) speech.stop();
                                  setAdaptedBenefits((prev) => {
                                    const next = { ...prev };
                                    delete next[benefit];
                                    return next;
                                  });
                                }}
                                className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer px-1"
                              >
                                إغلاق
                              </button>
                            </div>
                          )}
                        </div>

                        {adaptedBenefits[benefit].loading ? (
                          <div className="p-4 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin text-emerald-700" />
                            <span>جاري تكييف الفائدة وصياغتها بدقة...</span>
                          </div>
                        ) : (
                          <div className="text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                            {adaptedBenefits[benefit].content}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
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

      {/* Audio Settings Modal */}
      <AudioSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        availableVoices={speech.availableVoices}
        selectedVoice={speech.selectedVoice}
        onSelectVoice={speech.setVoice}
        rate={speech.rate}
        onChangeRate={speech.changeRate}
        onOpenHelp={() => speech.setShowNoVoiceModal(true)}
      />

      {/* No Arabic Voice Helper Modal */}
      <NoArabicVoiceModal
        isOpen={speech.showNoVoiceModal}
        onClose={() => speech.setShowNoVoiceModal(false)}
        onRefresh={() => {
          if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            window.speechSynthesis.getVoices();
          }
        }}
      />

      {/* Fact Verification Modal (Requirement 1) */}
      <FactVerificationModal
        isOpen={verificationModalOpen}
        onClose={() => setVerificationModalOpen(false)}
        initialStatement={verificationStatement}
        context={`من محاضرة: ${data.title}\n${data.summary}`}
      />

      {/* Share Benefit Card Modal (Requirement 5) */}
      <ShareBenefitModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        benefit={shareBenefitText}
        lectureTitle={data.title}
        source={shareBenefitSource}
      />
    </div>
  );
};
