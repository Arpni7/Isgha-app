import React, { useState } from 'react';
import { useLang } from '../i18n/LanguageContext';
import { FatwaRecord } from '../types';
import { askFatwa, fatwaFollowup, fatwaTransform } from '../api';
import {
  BookOpen,
  Send,
  Loader2,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  UserCheck,
  ShieldCheck,
  CheckCircle2,
  Quote,
  Baby,
  HeartHandshake,
  ListOrdered,
  MessageSquare,
  AlertCircle
} from 'lucide-react';

interface FatwaScreenProps {
  initialQuestion?: string;
  onOpenSkepticWithTopic: (topic: string, fatwaId?: string) => void;
  onBack: () => void;
}

export const FatwaScreen: React.FC<FatwaScreenProps> = ({
  initialQuestion = '',
  onOpenSkepticWithTopic,
  onBack,
}) => {
  const { t, isRTL, lang } = useLang();
  const [question, setQuestion] = useState(initialQuestion);
  const [currentFatwa, setCurrentFatwa] = useState<FatwaRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [followupText, setFollowupText] = useState('');
  const [followupLoading, setFollowupLoading] = useState(false);
  const [transformLoading, setTransformLoading] = useState<string | null>(null);
  const [activeTransformation, setActiveTransformation] = useState<{ mode: string; title: string; content: string } | null>(null);
  const [error, setError] = useState('');

  const loadingSteps = [
    '🔍 جاري استحضار الأدلة وتخريج الأحاديث...',
    '📜 جاري مراجعة فتاوى كبار العلماء المحققين...',
    '✍️ جاري صياغة الجواب الشرعي الميسر...'
  ];

  React.useEffect(() => {
    let interval: any;
    if (loading) {
      setLoadingStep(0);
      interval = setInterval(() => {
        setLoadingStep((s) => (s < 2 ? s + 1 : s));
      }, 850);
    }
    return () => clearInterval(interval);
  }, [loading]);

  React.useEffect(() => {
    if (initialQuestion && !currentFatwa) {
      setQuestion(initialQuestion);
      handleAsk(initialQuestion);
    }
  }, [initialQuestion]);

  const quickQuestions = [
    'ما حكم صيام يوم عاشوراء ومراتبه؟',
    'كيف تكون طهارة الوضوء الصحيحة كما وردت عن النبي ﷺ؟',
    'ما فضل قراءة سورة الكهف يوم الجمعة؟',
    'ما حكم صلاة الجماعة في المسجد للرجال؟',
    'أحكام صلاة المسافر وقصرها وجمعها'
  ];

  const handleAsk = async (qToAsk?: string) => {
    const targetQ = qToAsk || question;
    if (!targetQ.trim()) return;

    setError('');
    setLoading(true);
    setActiveTransformation(null);

    try {
      const result = await askFatwa(targetQ, lang);
      setCurrentFatwa(result);
    } catch (err: any) {
      setError(err.message || 'تعذر إرسال السؤال، يرجى المحاولة لاحقاً');
    } finally {
      setLoading(false);
    }
  };

  const handleFollowup = async () => {
    if (!currentFatwa || !followupText.trim()) return;
    setFollowupLoading(true);
    setError('');

    try {
      const res = await fatwaFollowup(currentFatwa.id, followupText, lang);
      setCurrentFatwa((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          followups: [...(prev.followups || []), { question: followupText, answer: res.answer }]
        };
      });
      setFollowupText('');
    } catch (err: any) {
      setError(err.message || 'تعذر إرسال المتابعة');
    } finally {
      setFollowupLoading(false);
    }
  };

  const handleTransform = async (mode: 'child' | 'newmuslim' | 'practical') => {
    if (!currentFatwa) return;
    setTransformLoading(mode);
    try {
      const result = await fatwaTransform(currentFatwa.id, mode, lang);
      setActiveTransformation(result);
    } catch (err: any) {
      setError(err.message || 'تعذر التحويل');
    } finally {
      setTransformLoading(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-4">
      {/* Top Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
        >
          {isRTL ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
          <span>{t('back')}</span>
        </button>

        <div className="text-center">
          <h2 className="text-xl font-bold text-slate-900">{t('fatwa_title')}</h2>
          <p className="text-xs text-slate-500 mt-0.5">{t('fatwa_sub')}</p>
        </div>

        <div className="w-12" />
      </div>

      {/* Question Input Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
        <label className="text-xs font-bold text-slate-900 block">
          {t('ask_question')}
        </label>

        <div className="relative">
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={t('write_fatwa')}
            rows={3}
            className="w-full p-4 pe-24 rounded-xl border border-slate-300 focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 text-sm leading-relaxed text-slate-800 placeholder:text-slate-400 font-sans outline-hidden resize-none"
          />
          <button
            onClick={() => handleAsk()}
            disabled={loading || !question.trim()}
            className="absolute bottom-3 end-3 px-4 py-2 bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            <span>{t('send_question')}</span>
          </button>
        </div>

        {/* Suggested Quick Questions */}
        <div className="space-y-2 pt-1">
          <span className="text-[11px] font-semibold text-slate-500 block">
            {t('popular_questions')}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {quickQuestions.map((q, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setQuestion(q);
                  handleAsk(q);
                }}
                className="text-xs bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-900 border border-slate-200 hover:border-emerald-300 px-2.5 py-1 rounded-md transition-colors cursor-pointer text-start"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-4 shadow-sm">
          <div className="relative w-14 h-14 mx-auto flex items-center justify-center">
            <Loader2 className="w-10 h-10 text-emerald-800 animate-spin" />
            <Sparkles className="w-4 h-4 text-amber-500 absolute" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900 transition-all duration-300">
              {loadingSteps[loadingStep]}
            </h3>
            <p className="text-xs text-slate-500">{t('empty_sub')}</p>
          </div>
          <div className="max-w-xs mx-auto bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-emerald-700 h-full rounded-full transition-all duration-500"
              style={{ width: `${(loadingStep + 1) * 33.3}%` }}
            />
          </div>
        </div>
      )}

      {/* Fatwa Content View */}
      {!loading && currentFatwa && (
        <div className="space-y-6">
          {/* Main Answer Card */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="space-y-2 pb-4 border-b border-slate-100">
              <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
                استفتاء شرعي
              </span>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-snug">
                {currentFatwa.question}
              </h1>
            </div>

            {/* Answer prose */}
            <div className="text-sm sm:text-base leading-relaxed text-slate-800 space-y-4 whitespace-pre-line font-normal">
              {currentFatwa.answer}
            </div>

            {/* Section: Quranic Proofs */}
            {currentFatwa.verses && currentFatwa.verses.length > 0 && (
              <div className="space-y-3 pt-2">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-emerald-800" />
                  <span>{t('ev_verses')}</span>
                </h3>
                <div className="space-y-3">
                  {currentFatwa.verses.map((v, i) => (
                    <div
                      key={i}
                      className="p-4 bg-emerald-50/40 rounded-xl border border-emerald-200/70 space-y-2"
                    >
                      <div className="text-base sm:text-lg font-quran text-slate-900 leading-loose text-center py-1">
                        ﴿ {v.arabic} ﴾
                      </div>
                      <div className="text-xs text-emerald-900 font-semibold text-end">
                        {v.reference}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Section: Hadiths */}
            {currentFatwa.hadiths && currentFatwa.hadiths.length > 0 && (
              <div className="space-y-3 pt-2">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>{t('ev_hadiths')}</span>
                </h3>
                <div className="space-y-3">
                  {currentFatwa.hadiths.map((h, i) => (
                    <div
                      key={i}
                      className="p-4 bg-amber-50/30 rounded-xl border border-amber-200/60 space-y-2"
                    >
                      <div className="text-base sm:text-lg font-quran text-slate-900 leading-relaxed text-center sm:text-start py-1">
                        «{h.text}»
                      </div>
                      <div className="pt-2 border-t border-amber-200/40 flex items-center gap-2 text-xs text-amber-950/80">
                        {h.narrator && <span>الراوي: {h.narrator}</span>}
                        {h.narrator && <span aria-hidden="true">·</span>}
                        <span>المصدر: {h.source}</span>
                        {h.grade && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-semibold text-emerald-800">{h.grade}</span>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Section: Scholar References */}
            {currentFatwa.scholar_references && currentFatwa.scholar_references.length > 0 && (
              <div className="space-y-3 pt-2">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-slate-700" />
                  <span>{t('ev_scholars')}</span>
                </h3>
                <div className="space-y-3">
                  {currentFatwa.scholar_references.map((s, i) => (
                    <div
                      key={i}
                      className="p-4 bg-slate-50 rounded-xl border border-slate-200/70 space-y-2"
                    >
                      <span className="text-xs font-bold text-slate-900 block">{s.scholar}</span>
                      <p className="text-xs sm:text-sm text-slate-700 leading-relaxed italic">
                        "{s.quote}"
                      </p>
                      <span className="text-[11px] text-slate-400 block text-end">{s.source}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Disclaimer */}
            <div className="p-3 bg-amber-50/70 rounded-lg border border-amber-200/60 text-xs text-amber-900/90">
              {t('disclaimer_fatwa')}
            </div>

            {/* Action Bar (Adaptations & Simulator Jump) */}
            <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 w-full sm:w-auto">
                خيارات وتطبيقات:
              </span>

              <button
                onClick={() => handleTransform('child')}
                disabled={transformLoading !== null}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 cursor-pointer transition-colors shadow-xs"
              >
                <Baby className="w-3.5 h-3.5 text-blue-600" />
                <span>{transformLoading === 'child' ? t('tr_loading') : t('act_child')}</span>
              </button>

              <button
                onClick={() => handleTransform('newmuslim')}
                disabled={transformLoading !== null}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 cursor-pointer transition-colors shadow-xs"
              >
                <HeartHandshake className="w-3.5 h-3.5 text-emerald-700" />
                <span>{transformLoading === 'newmuslim' ? t('tr_loading') : t('act_newmuslim')}</span>
              </button>

              <button
                onClick={() => handleTransform('practical')}
                disabled={transformLoading !== null}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 cursor-pointer transition-colors shadow-xs"
              >
                <ListOrdered className="w-3.5 h-3.5 text-amber-600" />
                <span>{transformLoading === 'practical' ? t('tr_loading') : t('act_practical')}</span>
              </button>

              <button
                onClick={() => onOpenSkepticWithTopic(currentFatwa.question, currentFatwa.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold cursor-pointer transition-colors shadow-xs ms-auto"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
                <span>{t('act_skeptic')}</span>
              </button>
            </div>
          </div>

          {/* Active Transformation Card (Child, New Muslim, Practical) */}
          {activeTransformation && (
            <div className="bg-white rounded-2xl border-2 border-emerald-600/30 p-6 sm:p-8 shadow-sm space-y-4 animate-in fade-in duration-300">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-700" />
                  <h3 className="text-base font-bold text-slate-900">
                    {activeTransformation.title}
                  </h3>
                </div>
                <button
                  onClick={() => setActiveTransformation(null)}
                  className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  إغلاق
                </button>
              </div>
              <div className="text-sm leading-relaxed text-slate-800 whitespace-pre-line">
                {activeTransformation.content}
              </div>
            </div>
          )}

          {/* Follow-up Discussion Thread */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-800" />
              <span>{t('followup_on')}</span>
            </h3>

            {/* Previous followups */}
            {currentFatwa.followups && currentFatwa.followups.length > 0 && (
              <div className="space-y-4 pb-2">
                {currentFatwa.followups.map((f, i) => (
                  <div key={i} className="space-y-2 p-4 bg-slate-50 rounded-xl border border-slate-200/60">
                    <span className="text-xs font-bold text-emerald-950 block">س: {f.question}</span>
                    <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                      ج: {f.answer}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Followup input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={followupText}
                onChange={(e) => setFollowupText(e.target.value)}
                placeholder={t('write_followup')}
                className="flex-1 p-3 rounded-xl border border-slate-300 text-xs sm:text-sm outline-hidden focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleFollowup();
                }}
              />
              <button
                onClick={handleFollowup}
                disabled={followupLoading || !followupText.trim()}
                className="px-4 py-2.5 bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                {followupLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>{t('send_followup')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
