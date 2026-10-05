import React, { useState, useEffect } from 'react';
import { useLang } from '../i18n/LanguageContext';
import { skepticTurn, skepticReset } from '../api';
import {
  ShieldCheck,
  Send,
  Loader2,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  User,
  AlertCircle,
  ExternalLink,
  MessageCircleHeart
} from 'lucide-react';

interface SkepticMessage {
  sender: 'skeptic' | 'user';
  text: string;
  source_name?: string;
  source_url?: string;
}

interface SkepticScreenProps {
  initialTopic?: string;
  fatwaId?: string;
  onBack: () => void;
}

export const SkepticScreen: React.FC<SkepticScreenProps> = ({
  initialTopic = 'أهمية وحجية السنة النبوية الشريفة وتدوينها',
  fatwaId,
  onBack,
}) => {
  const { t, isRTL, lang } = useLang();
  const [topic, setTopic] = useState(initialTopic);
  const [chat, setChat] = useState<SkepticMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const sampleTopics = [
    'أهمية وحجية السنة النبوية الشريفة وتدوينها',
    'الحكمة من خلق الابتلاءات والآلام في الدنيا',
    'القدر وحرية الإنسان بين التسيير والتخيير',
    'موقف الإسلام من التساؤل والبحث عن اليقين',
    'الحكمة من صيام عاشوراء وتكفير الذنوب',
    'أحكام التيمم ورخصة المسافر في العبادات',
    'مقاصد الرحمة والتعايش وحسن الخلق',
    'حكمة التشريع ومقاصد الشريعة الإسلامية'
  ];

  // Initiate initial turn on mount
  useEffect(() => {
    startScenario(initialTopic);
  }, []);

  const startScenario = async (targetTopic: string) => {
    setLoading(true);
    setError('');
    setChat([]);

    try {
      if (fatwaId) {
        await skepticReset(fatwaId);
      }
      const res = await skepticTurn(fatwaId, '', targetTopic, lang);
      setChat([
        {
          sender: 'skeptic',
          text: res.skeptic_reply || 'أهلاً بك، سعيد بالحوار معك حول هذا الموضوع بكل هدوء وتفهم. ما الذي يدور في خاطرك بشأنه؟',
          source_name: res.source_name,
          source_url: res.source_url
        }
      ]);
    } catch (err: any) {
      setError(err.message || 'تعذر بدء الحوار، يرجى المحاولة ثانية');
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
      const history = newChat.map((m) => ({ sender: m.sender, text: m.text }));
      const res = await skepticTurn(fatwaId, messageToSend, topic, lang, history);

      if (res.skeptic_reply) {
        setChat([
          ...newChat,
          {
            sender: 'skeptic',
            text: res.skeptic_reply,
            source_name: res.source_name,
            source_url: res.source_url
          }
        ]);
      }
    } catch (err: any) {
      setError(err.message || 'تعذر استلام رد المحاور');
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
      <div className="p-4 bg-emerald-50/70 rounded-xl border border-emerald-200/70 text-xs text-emerald-950/90 leading-relaxed flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold block text-emerald-950">{t('skeptic_title')}</span>
          <p className="text-emerald-900/90">{t('skeptic_banner')}</p>
        </div>
      </div>

      {/* Topic Selector */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/90 space-y-2">
        <span className="text-xs font-bold text-slate-700 block">اختر موضوعاً للحوار أو اكتب ما يدور في خاطرك بالأسفل:</span>
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
                  ? 'border-emerald-700 bg-emerald-50 text-emerald-900 font-semibold shadow-2xs'
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
      <div className="space-y-5">
        {chat.map((msg, idx) => (
          <div key={idx} className="space-y-2">
            {/* Message Bubble */}
            <div
              className={`flex items-start gap-3 ${
                msg.sender === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.sender === 'skeptic' && (
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0 border border-emerald-200 shadow-2xs">
                  <MessageCircleHeart className="w-4 h-4 text-emerald-700" />
                </div>
              )}

              <div
                className={`max-w-2xl p-4 sm:p-5 rounded-2xl text-sm leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-emerald-900 text-white rounded-te-none shadow-xs'
                    : 'bg-white border border-slate-200/90 text-slate-800 rounded-ts-none shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-white/10 rtl:border-slate-100 text-[11px] font-semibold opacity-75">
                  <span>{msg.sender === 'user' ? t('user_name') : `${t('skeptic_name')} — حوار ودود`}</span>
                </div>
                <p className="whitespace-pre-line font-normal leading-relaxed text-slate-800">
                  {msg.text}
                </p>

                {/* Clean Separate Source Line */}
                {msg.sender === 'skeptic' && msg.source_name && (
                  <div className="pt-2.5 mt-3 border-t border-slate-100 flex items-center flex-wrap gap-1.5 text-xs text-slate-500 font-normal">
                    <span className="text-[11px] font-semibold text-slate-600">المصدر:</span>
                    {msg.source_url ? (
                      <a
                        href={msg.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-700 hover:text-emerald-800 hover:underline inline-flex items-center gap-1 text-[11px] font-medium"
                      >
                        <span>{msg.source_name}</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    ) : (
                      <span className="text-[11px] text-slate-600">{msg.source_name}</span>
                    )}
                  </div>
                )}
              </div>

              {msg.sender === 'user' && (
                <div className="w-8 h-8 rounded-full bg-emerald-800 text-white flex items-center justify-center font-bold text-xs shrink-0">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0 border border-emerald-200">
              <MessageCircleHeart className="w-4 h-4 text-emerald-700" />
            </div>
            <div className="p-4 rounded-2xl bg-white border border-slate-200 text-slate-500 text-xs flex items-center gap-2 shadow-xs">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
              <span>{t('skeptic_thinking')}</span>
            </div>
          </div>
        )}
      </div>

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
            اضغط Ctrl + Enter أو زر الإرسال للمحاورة
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
