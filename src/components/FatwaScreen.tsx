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
  AlertCircle,
  Scale,
  HelpCircle
} from 'lucide-react';
import { SendToScholarModal } from './SendToScholarModal';
import { InternalScholarRequestsModal } from './InternalScholarRequestsModal';

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
  const [showScholarModal, setShowScholarModal] = useState(false);
  const [showInternalRequestsModal, setShowInternalRequestsModal] = useState(false);

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
          followups: [
            ...(prev.followups || []),
            {
              question: followupText,
              answer: res.answer,
              response_type: res.response_type,
              clarification_question: res.clarification_question,
              referral_note: res.referral_note
            }
          ]
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

        <button
          onClick={() => setShowInternalRequestsModal(true)}
          className="text-[11px] font-semibold text-slate-500 hover:text-emerald-800 transition-colors flex items-center gap-1.5 cursor-pointer bg-slate-50 hover:bg-emerald-50 px-2.5 py-1 rounded-lg border border-slate-200"
          title="سجل المراجعة الداخلية لطلبات الاستفتاء"
        >
          <UserCheck className="w-3.5 h-3.5 text-emerald-700" />
          <span className="hidden sm:inline">سجل الطلبات</span>
        </button>
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
          {/* Prominent Banner when unavailable in Knowledge Base (Requirement 1 & 3) */}
          {currentFatwa.unavailable_in_knowledge_base && (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl border-2 border-amber-300 p-6 shadow-sm space-y-3 text-right">
              <div className="flex items-center gap-2.5 text-amber-900 font-bold text-sm sm:text-base">
                <AlertCircle className="w-5 h-5 text-amber-700 shrink-0" />
                <span>المسألة غير متوفرة في قاعدة المعرفة المعتمدة، أو تتطلب فتوى خاصة</span>
              </div>
              <p className="text-xs sm:text-sm text-amber-950/85 leading-relaxed">
                التزاماً بضوابط الفتوى والجدول الصارم للمصادر المعتمدة، نلتزم بعدم الترجيح الآلي في المسائل المستجدة أو الحالات الخاصة. يمكنك إرسال سؤالك مباشرة لشيخ وباحث شرعي مختص لدراسته وموافادتك بالجواب:
              </p>
              <div className="pt-1">
                <button
                  onClick={() => setShowScholarModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  <span>📤 أرسل سؤالك لشيخ مختص</span>
                </button>
              </div>
            </div>
          )}

          {/* Main Answer Card */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-6">
            {/* Prominent Trust Badge (Requirement 2) */}
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-900 w-fit shadow-2xs">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
              </span>
              <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
              <span className="text-xs font-bold tracking-wide">
                {t('verified_source_badge')}
              </span>
            </div>

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

            {/* Disclaimer & Scholarly Boundary Notice */}
            <div className="space-y-2.5">
              <div className="p-3 bg-amber-50/70 rounded-lg border border-amber-200/60 text-xs text-amber-900/90 flex items-start gap-2">
                <span className="shrink-0 mt-0.5">⚠️</span>
                <span>{t('disclaimer_fatwa')}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 text-xs text-slate-700 flex items-start gap-2">
                <Scale className="w-4 h-4 text-emerald-800 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{t('boundary_notice')}</span>
              </div>
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
                onClick={() => setShowScholarModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50/90 hover:bg-emerald-100 text-xs font-bold text-emerald-950 cursor-pointer transition-colors shadow-2xs"
                title="إرسال السؤال إلى شيخ وباحث مختص"
              >
                <span>📤 أرسل سؤالك لشيخ مختص</span>
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
                {currentFatwa.followups.map((f, i) => {
                  const isClarification = f.response_type === 'clarification';
                  const isReferral = f.response_type === 'referral';

                  return (
                    <div
                      key={i}
                      className={`space-y-2.5 p-4 rounded-xl border ${
                        isClarification
                          ? 'bg-amber-50/60 border-amber-200/90 shadow-2xs'
                          : isReferral
                          ? 'bg-emerald-50/50 border-2 border-emerald-600/30 shadow-2xs'
                          : 'bg-slate-50 rounded-xl border-slate-200/60'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-1.5 border-b border-slate-200/40">
                        <span className="text-xs font-bold text-slate-900 block">
                          س: {f.question}
                        </span>
                        {isClarification ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-amber-100/90 text-amber-950 text-[10px] font-bold">
                            <HelpCircle className="w-3 h-3 text-amber-700" />
                            <span>{t('badge_clarification')}</span>
                          </span>
                        ) : isReferral ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-950 text-[10px] font-bold">
                            <Scale className="w-3 h-3 text-emerald-800" />
                            <span>{t('badge_referral')}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-200/70 text-slate-700 text-[10px] font-semibold">
                            <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                            <span>{t('badge_verified_answer')}</span>
                          </span>
                        )}
                      </div>

                      <p
                        className={`text-xs sm:text-sm leading-relaxed whitespace-pre-line ${
                          isClarification
                            ? 'text-amber-950 font-medium'
                            : isReferral
                            ? 'text-slate-800'
                            : 'text-slate-700'
                        }`}
                      >
                        ج: {f.answer}
                      </p>

                      {isReferral && (
                        <div className="pt-2 border-t border-emerald-200/60 flex flex-wrap items-center justify-between gap-2">
                          <div className="text-[11px] text-emerald-900 font-semibold flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                            <span>{t('official_referral_title')}</span>
                          </div>
                          <button
                            onClick={() => setShowScholarModal(true)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-800 hover:bg-emerald-900 text-white text-[11px] font-bold rounded-lg shadow-2xs transition-colors cursor-pointer"
                          >
                            <span>📤 أرسل سؤالك لشيخ مختص</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Clarification prompt hint if last followup is clarification */}
            {currentFatwa.followups &&
              currentFatwa.followups.length > 0 &&
              currentFatwa.followups[currentFatwa.followups.length - 1].response_type ===
                'clarification' && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-300/80 text-xs text-amber-950 font-medium flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>{t('clarification_prompt_hint')}</span>
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

      {/* Send to Scholar Modal */}
      <SendToScholarModal
        isOpen={showScholarModal}
        onClose={() => setShowScholarModal(false)}
        initialQuestion={currentFatwa ? currentFatwa.question : question}
      />

      {/* Internal Scholar Requests Review Modal */}
      <InternalScholarRequestsModal
        isOpen={showInternalRequestsModal}
        onClose={() => setShowInternalRequestsModal(false)}
      />
    </div>
  );
};
