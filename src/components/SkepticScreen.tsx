import React, { useState, useEffect } from 'react';
import { useLang } from '../i18n/LanguageContext';
import { skepticTurn, skepticReset } from '../api';
import {
  ShieldCheck,
  Send,
  Loader2,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Lightbulb,
  CheckCircle,
  HelpCircle,
  RotateCcw,
  User,
  AlertCircle
} from 'lucide-react';

interface SkepticMessage {
  sender: 'skeptic' | 'user';
  text: string;
  feedback?: string;
  rating?: string;
  strengths?: string[];
  missing_points?: string[];
  hint?: string;
}

interface SkepticScreenProps {
  initialTopic?: string;
  fatwaId?: string;
  onBack: () => void;
}

export const SkepticScreen: React.FC<SkepticScreenProps> = ({
  initialTopic = 'أهمية وحجية السنة النبوية وكيفية حفظ الأحاديث',
  fatwaId,
  onBack,
}) => {
  const { t, isRTL, lang } = useLang();
  const [topic, setTopic] = useState(initialTopic);
  const [chat, setChat] = useState<SkepticMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [currentHint, setCurrentHint] = useState('');
  const [error, setError] = useState('');

  const sampleTopics = [
    'أهمية وحجية السنة النبوية الشريفة وتدوينها',
    'الحكمة من صيام عاشوراء ومخالفة أهل الكتاب',
    'أحكام التيمم ورخصة المسافر في الصلاة',
    'منهج نقد الرواة وتصحيح الأحاديث عند المحدثين'
  ];

  // Initiate initial turn on mount
  useEffect(() => {
    startScenario(initialTopic);
  }, []);

  const startScenario = async (targetTopic: string) => {
    setLoading(true);
    setError('');
    setChat([]);
    setCurrentHint('');
    setShowHint(false);

    try {
      if (fatwaId) {
        await skepticReset(fatwaId);
      }
      const res = await skepticTurn(fatwaId, '', targetTopic, lang);
      setChat([
        {
          sender: 'skeptic',
          text: res.skeptic_reply || 'ما هو دليلك على صحة هذا الحكم وثبوته عبر القرون؟'
        }
      ]);
      if (res.evaluation?.hint) {
        setCurrentHint(res.evaluation.hint);
      }
    } catch (err: any) {
      setError(err.message || 'تعذر تشغيل المحاكي');
    } finally {
      setLoading(false);
    }
  };

  const handleSendReply = async () => {
    if (!userInput.trim() || loading) return;

    const messageToSend = userInput;
    setUserInput('');
    setLoading(true);
    setError('');

    // Optimistically add user reply
    const newChat: SkepticMessage[] = [
      ...chat,
      { sender: 'user', text: messageToSend }
    ];
    setChat(newChat);

    try {
      const res = await skepticTurn(fatwaId, messageToSend, topic, lang);

      // Attach feedback to the user's turn
      const updatedChat = [...newChat];
      const lastUserIdx = updatedChat.length - 1;
      if (res.evaluation) {
        updatedChat[lastUserIdx] = {
          ...updatedChat[lastUserIdx],
          feedback: res.evaluation.feedback,
          rating: res.evaluation.rating,
          strengths: res.evaluation.strengths,
          missing_points: res.evaluation.missing_points,
          hint: res.evaluation.hint
        };
        if (res.evaluation.hint) {
          setCurrentHint(res.evaluation.hint);
        }
      }

      if (res.skeptic_reply) {
        updatedChat.push({
          sender: 'skeptic',
          text: res.skeptic_reply
        });
      }

      setChat(updatedChat);
    } catch (err: any) {
      setError(err.message || 'تعذر استلام رد المتشكك');
    } finally {
      setLoading(false);
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
          <h2 className="text-xl font-bold text-slate-900">{t('skeptic_title')}</h2>
          <p className="text-xs text-slate-500 mt-0.5">{t('skeptic_sub')}</p>
        </div>

        <button
          onClick={() => startScenario(topic)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer transition-colors"
          title={t('reset_dialogue')}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{t('reset_dialogue')}</span>
        </button>
      </div>

      {/* Simulator Banner */}
      <div className="p-4 bg-amber-50/70 rounded-xl border border-amber-200/70 text-xs text-amber-950/90 leading-relaxed flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold block">{t('skeptic_title')}</span>
          <p>{t('skeptic_banner')}</p>
        </div>
      </div>

      {/* Topic Selector */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/90 space-y-2">
        <span className="text-xs font-bold text-slate-700 block">موضوع المحاكاة والحوار:</span>
        <div className="flex flex-wrap gap-1.5">
          {sampleTopics.map((st, i) => (
            <button
              key={i}
              onClick={() => {
                setTopic(st);
                startScenario(st);
              }}
              className={`text-xs px-2.5 py-1 rounded-md border transition-colors cursor-pointer ${
                topic === st
                  ? 'border-emerald-700 bg-emerald-50 text-emerald-900 font-semibold'
                  : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Dialogue Thread */}
      <div className="space-y-6">
        {chat.map((msg, idx) => (
          <div key={idx} className="space-y-3">
            {/* Message Bubble */}
            <div
              className={`flex items-start gap-3 ${
                msg.sender === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.sender === 'skeptic' && (
                <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs shrink-0 border border-amber-200">
                  ش
                </div>
              )}

              <div
                className={`max-w-2xl p-4 sm:p-5 rounded-2xl text-sm leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-emerald-900 text-white rounded-te-none'
                    : 'bg-white border border-slate-200/90 text-slate-800 rounded-ts-none shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-white/10 rtl:border-slate-100 text-[11px] font-semibold opacity-75">
                  <span>{msg.sender === 'user' ? t('user_name') : t('skeptic_name')}</span>
                </div>
                <p className="whitespace-pre-line font-medium">{msg.text}</p>
              </div>

              {msg.sender === 'user' && (
                <div className="w-8 h-8 rounded-full bg-emerald-800 text-white flex items-center justify-center font-bold text-xs shrink-0">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>

            {/* Pedagogical Evaluation Panel for User Response */}
            {msg.sender === 'user' && msg.feedback && (
              <div className="ms-11 max-w-2xl p-4 rounded-xl bg-slate-100 border border-slate-200 space-y-3 text-xs animate-in fade-in duration-300">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>{t('eval_title')}</span>
                  </span>
                  {msg.rating && (
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 font-bold">
                      {msg.rating}
                    </span>
                  )}
                </div>

                <p className="text-slate-700 leading-relaxed">{msg.feedback}</p>

                {msg.strengths && msg.strengths.length > 0 && (
                  <div className="space-y-1">
                    <span className="font-bold text-emerald-900 block">{t('strengths_label')}</span>
                    <ul className="list-disc list-inside space-y-0.5 text-slate-600">
                      {msg.strengths.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {msg.missing_points && msg.missing_points.length > 0 && (
                  <div className="space-y-1">
                    <span className="font-bold text-amber-900 block">{t('missing_label')}</span>
                    <ul className="list-disc list-inside space-y-0.5 text-slate-600">
                      {msg.missing_points.map((m, i) => (
                        <li key={i}>{m}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs shrink-0 border border-amber-200">
              ش
            </div>
            <div className="p-4 rounded-2xl bg-white border border-slate-200 text-slate-500 text-xs flex items-center gap-2 shadow-xs">
              <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
              <span>{t('skeptic_thinking')}</span>
            </div>
          </div>
        )}
      </div>

      {/* Hint toggle box */}
      {currentHint && (
        <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/50 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowHint(!showHint)}
              className="text-xs font-bold text-amber-900 flex items-center gap-1.5 hover:underline cursor-pointer"
            >
              <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
              <span>{showHint ? t('hide_hint') : t('show_hint')}</span>
            </button>
          </div>
          {showHint && (
            <p className="text-xs text-amber-950/90 leading-relaxed pt-1 border-t border-amber-200/40">
              💡 {currentHint}
            </p>
          )}
        </div>
      )}

      {/* User Reply Input Area */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
        <textarea
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder={t('reply_placeholder')}
          rows={3}
          className="w-full p-3 rounded-xl border border-slate-300 text-xs sm:text-sm leading-relaxed outline-hidden focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 resize-none"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              handleSendReply();
            }
          }}
        />

        <div className="flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            اضغط Ctrl + Enter أو زر الإرسال
          </span>
          <button
            onClick={handleSendReply}
            disabled={loading || !userInput.trim()}
            className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            <span>{t('reply_btn')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
