import React, { useState, useEffect, useMemo } from 'react';
import { useLang } from '../i18n/LanguageContext';
import { Extraction, FatwaRecord } from '../types';
import { getHistory, deleteExtraction, deleteFatwa } from '../api';
import {
  History as HistoryIcon,
  Trash2,
  ExternalLink,
  BookOpen,
  Volume2,
  Search,
  ArrowRight,
  ArrowLeft,
  Calendar,
  AlertCircle,
  Sparkles,
  MessageSquare,
  Share2,
  Copy,
  Check,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { ShareBenefitModal } from './ShareBenefitModal';
import { FactVerificationModal } from './FactVerificationModal';

interface HistoryScreenProps {
  onOpenExtraction: (e: Extraction) => void;
  onOpenFatwa: (question: string) => void;
  onOpenSkeptic?: (topic: string, fatwaId?: string) => void;
  onStartNew: () => void;
  onBack: () => void;
}

type HistoryTab = 'extractions' | 'benefits' | 'fatwas' | 'chats';

interface FlattenedBenefit {
  text: string;
  lectureId: string;
  lectureTitle: string;
  date: string;
  source?: string;
  extraction: Extraction;
}

interface ChatRecordItem {
  id: string;
  type: 'skeptic' | 'followup';
  title: string;
  snippet: string;
  turnsCount: number;
  date: string;
  rating?: string;
  fatwaId?: string;
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({
  onOpenExtraction,
  onOpenFatwa,
  onOpenSkeptic,
  onStartNew,
  onBack,
}) => {
  const { t, isRTL } = useLang();
  const [tab, setTab] = useState<HistoryTab>('extractions');
  const [search, setSearch] = useState('');
  const [extractions, setExtractions] = useState<Extraction[]>([]);
  const [fatwas, setFatwas] = useState<FatwaRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Share Modal State
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareText, setShareText] = useState('');
  const [shareTitle, setShareTitle] = useState('');
  const [shareSource, setShareSource] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Fact Verification Modal State
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [verifyStatement, setVerifyStatement] = useState('');
  const [verifyContext, setVerifyContext] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getHistory();
      setExtractions(data.extractions || []);
      setFatwas(data.fatwas || []);
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExtraction = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteExtraction(id);
      setExtractions((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error('Failed to delete extraction:', err);
    }
  };

  const handleDeleteFatwa = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteFatwa(id);
      setFatwas((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error('Failed to delete fatwa:', err);
    }
  };

  // 1. Flatten all benefits across extractions
  const allBenefits: FlattenedBenefit[] = useMemo(() => {
    const list: FlattenedBenefit[] = [];
    for (const ext of extractions) {
      if (Array.isArray(ext.benefits)) {
        for (const b of ext.benefits) {
          list.push({
            text: b,
            lectureId: ext.id,
            lectureTitle: ext.title,
            date: ext.created_at,
            source: ext.sources && ext.sources.length > 0 ? ext.sources[0] : '',
            extraction: ext
          });
        }
      }
    }
    return list;
  }, [extractions]);

  // 2. Collect all interactive chats (Skeptic and Follow-ups)
  const allChats: ChatRecordItem[] = useMemo(() => {
    const list: ChatRecordItem[] = [];
    for (const f of fatwas) {
      // Skeptic Chat
      if (f.skepticChat && f.skepticChat.length > 0) {
        const lastUser = [...f.skepticChat].reverse().find((m) => m.sender === 'user');
        list.push({
          id: `sk-${f.id}`,
          type: 'skeptic',
          title: `مناقشة في محاكي الشبهات: ${f.question}`,
          snippet: lastUser ? `آخر رد منك: «${lastUser.text.slice(0, 80)}...»` : 'حوار مع المعترض',
          turnsCount: f.skepticChat.length,
          date: f.created_at,
          rating: lastUser?.rating,
          fatwaId: f.id
        });
      }
      // Followup Conversation
      if (f.followups && f.followups.length > 0) {
        const lastFollowup = f.followups[f.followups.length - 1];
        list.push({
          id: `fl-${f.id}`,
          type: 'followup',
          title: `متابعة واستيضاح: ${f.question}`,
          snippet: `سؤال المتابعة: «${lastFollowup.question.slice(0, 80)}...»`,
          turnsCount: f.followups.length,
          date: f.created_at,
          fatwaId: f.id
        });
      }
    }
    return list;
  }, [fatwas]);

  // Filters
  const q = search.trim().toLowerCase();

  const filteredExtractions = useMemo(() => {
    return extractions.filter((item) =>
      (item.title + ' ' + item.summary).toLowerCase().includes(q)
    );
  }, [extractions, q]);

  const filteredFatwas = useMemo(() => {
    return fatwas.filter((item) =>
      (item.question + ' ' + item.answer).toLowerCase().includes(q)
    );
  }, [fatwas, q]);

  const filteredBenefits = useMemo(() => {
    return allBenefits.filter((item) =>
      (item.text + ' ' + item.lectureTitle).toLowerCase().includes(q)
    );
  }, [allBenefits, q]);

  const filteredChats = useMemo(() => {
    return allChats.filter((item) =>
      (item.title + ' ' + item.snippet).toLowerCase().includes(q)
    );
  }, [allChats, q]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOpenShareModal = (benefit: FlattenedBenefit) => {
    setShareText(benefit.text);
    setShareTitle(benefit.lectureTitle);
    setShareSource(benefit.source || '');
    setShareModalOpen(true);
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
          <h2 className="text-xl font-bold text-slate-900">{t('history')}</h2>
          <p className="text-xs text-slate-500 mt-0.5">سجل المحاضرات، الفوائد، الاستفتاءات والمحادثات</p>
        </div>

        <button
          onClick={onStartNew}
          className="text-xs font-bold text-emerald-800 hover:text-emerald-950 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 transition-colors cursor-pointer"
        >
          جلسة جديدة +
        </button>
      </div>

      {/* 4 Segmented Tabs & Search Bar (Requirement 4) */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-200/70 rounded-xl border border-slate-300/60">
          <button
            onClick={() => setTab('extractions')}
            className={`px-3 sm:px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              tab === 'extractions'
                ? 'bg-white text-emerald-950 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>🎙️</span>
            <span>المحاضرات السابقة</span>
            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded-full font-semibold">
              {extractions.length}
            </span>
          </button>

          <button
            onClick={() => setTab('benefits')}
            className={`px-3 sm:px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              tab === 'benefits'
                ? 'bg-white text-emerald-950 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>💡</span>
            <span>الفوائد السابقة</span>
            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded-full font-semibold">
              {allBenefits.length}
            </span>
          </button>

          <button
            onClick={() => setTab('fatwas')}
            className={`px-3 sm:px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              tab === 'fatwas'
                ? 'bg-white text-emerald-950 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>❓</span>
            <span>الاستفتاءات السابقة</span>
            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded-full font-semibold">
              {fatwas.length}
            </span>
          </button>

          <button
            onClick={() => setTab('chats')}
            className={`px-3 sm:px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              tab === 'chats'
                ? 'bg-white text-emerald-950 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>💬</span>
            <span>المحادثات السابقة</span>
            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded-full font-semibold">
              {allChats.length}
            </span>
          </button>
        </div>

        {/* Search bar */}
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`بحث في ${
              tab === 'extractions'
                ? 'المحاضرات...'
                : tab === 'benefits'
                ? 'الفوائد المستخرجة...'
                : tab === 'fatwas'
                ? 'الأسئلة والاستفتاءات...'
                : 'المحادثات السابقة...'
            }`}
            className="w-full ps-10 pe-4 py-2.5 bg-white rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 outline-hidden shadow-2xs"
          />
          <Search className="w-4 h-4 text-slate-400 absolute start-3 top-3.5" />
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-slate-400 font-medium">
            جاري تحميل السجل...
          </div>
        ) : tab === 'extractions' ? (
          /* Tab 1: Extractions */
          filteredExtractions.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
              <Volume2 className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-slate-500 font-medium text-sm">لا توجد محاضرات في السجل حتى الآن.</p>
              <button
                onClick={onStartNew}
                className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                استمع لمحاضرة جديدة
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredExtractions.map((item) => (
                <div
                  key={item.id}
                  onClick={() => onOpenExtraction(item)}
                  className="p-5 bg-white rounded-2xl border border-slate-200/90 hover:border-emerald-500/80 transition-all cursor-pointer shadow-2xs space-y-3 group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-900 transition-colors">
                        {item.title}
                      </h3>
                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed font-normal">
                        {item.summary}
                      </p>
                    </div>
                    <button
                      onClick={(e) => handleDeleteExtraction(item.id, e)}
                      className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title="حذف"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <div className="flex items-center gap-3">
                      <span>{item.benefits?.length || 0} فوائد</span>
                      <span>•</span>
                      <span>{item.hadiths?.length || 0} أحاديث</span>
                      <span>•</span>
                      <span>{item.verses?.length || 0} آيات</span>
                    </div>
                    <span>{new Date(item.created_at).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US')}</span>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : tab === 'benefits' ? (
          /* Tab 2: Benefits */
          filteredBenefits.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
              <Sparkles className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-slate-500 font-medium text-sm">لم يتم العثور على فوائد محفوظة تطابق بحثك.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredBenefits.map((item, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-3 hover:border-emerald-300 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-900 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm text-slate-900 font-bold leading-relaxed">
                        {item.text}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500">
                        <span>من محاضرة:</span>
                        <button
                          onClick={() => onOpenExtraction(item.extraction)}
                          className="font-semibold text-emerald-800 hover:underline cursor-pointer"
                        >
                          {item.lectureTitle}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-400">
                      {new Date(item.date).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US')}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setVerifyStatement(item.text);
                          setVerifyContext(`من محاضرة: ${item.lectureTitle}`);
                          setVerifyModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-900 text-slate-700 font-semibold transition-colors cursor-pointer border border-slate-200/60"
                        title="التحقق من صحة ومصدر هذه الفائدة"
                      >
                        <Search className="w-3.5 h-3.5 text-emerald-700" />
                        <span>تحقق</span>
                      </button>

                      <button
                        onClick={() => handleCopy(item.text, `b-${idx}`)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-colors cursor-pointer"
                      >
                        {copiedId === `b-${idx}` ? (
                          <Check className="w-3.5 h-3.5 text-emerald-700" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 text-slate-500" />
                        )}
                        <span>{copiedId === `b-${idx}` ? 'تم النسخ' : 'نسخ'}</span>
                      </button>

                      <button
                        onClick={() => handleOpenShareModal(item)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-950 font-bold transition-colors cursor-pointer border border-emerald-200/80 shadow-2xs"
                      >
                        <Share2 className="w-3.5 h-3.5 text-emerald-700" />
                        <span>مشاركة</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : tab === 'fatwas' ? (
          /* Tab 3: Fatwas */
          filteredFatwas.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
              <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-slate-500 font-medium text-sm">لا توجد استفتاءات محفوظة في السجل.</p>
              <button
                onClick={() => onOpenFatwa('')}
                className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                طرح سؤال شرعي جديد
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredFatwas.map((item) => (
                <div
                  key={item.id}
                  onClick={() => onOpenFatwa(item.question)}
                  className="p-5 bg-white rounded-2xl border border-slate-200/90 hover:border-emerald-500/80 transition-all cursor-pointer shadow-2xs space-y-3 group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-900 transition-colors">
                        {item.question}
                      </h3>
                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed font-normal">
                        {item.answer}
                      </p>
                    </div>
                    <button
                      onClick={(e) => handleDeleteFatwa(item.id, e)}
                      className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title="حذف"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <div className="flex items-center gap-3">
                      <span>{item.verses?.length || 0} آيات</span>
                      <span>•</span>
                      <span>{item.hadiths?.length || 0} أحاديث</span>
                      {item.followups && item.followups.length > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-emerald-800 font-semibold">
                            {item.followups.length} متابعات
                          </span>
                        </>
                      )}
                    </div>
                    <span>{new Date(item.created_at).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US')}</span>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          /* Tab 4: Chats */
          filteredChats.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
              <MessageSquare className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-slate-500 font-medium text-sm">لا توجد محادثات سابقة في محاكي الشبهات أو المتابعات.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredChats.map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => {
                    if (chat.type === 'skeptic' && onOpenSkeptic) {
                      onOpenSkeptic(chat.title.replace('مناقشة في محاكي الشبهات: ', ''), chat.fatwaId);
                    } else {
                      onOpenFatwa(chat.title.replace('متابعة واستيضاح: ', ''));
                    }
                  }}
                  className="p-5 bg-white rounded-2xl border border-slate-200/90 hover:border-emerald-500/80 transition-all cursor-pointer shadow-2xs space-y-2.5 group"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold ${
                        chat.type === 'skeptic'
                          ? 'bg-purple-100 text-purple-900'
                          : 'bg-emerald-100 text-emerald-900'
                      }`}
                    >
                      {chat.type === 'skeptic' ? 'محاكي الشبهات' : 'متابعة استفسار'}
                    </span>

                    {chat.rating && (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-900 text-[10px] font-bold rounded-md">
                        التقييم: {chat.rating}
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-900 transition-colors">
                    {chat.title}
                  </h3>

                  <p className="text-xs text-slate-600 leading-relaxed font-normal">
                    {chat.snippet}
                  </p>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                    <span>{chat.turnsCount} رسائل / جولات</span>
                    <span>{new Date(chat.date).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US')}</span>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* Share Benefit Card Modal */}
      <ShareBenefitModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        benefit={shareText}
        lectureTitle={shareTitle}
        source={shareSource}
      />

      {/* Fact Verification Modal */}
      <FactVerificationModal
        isOpen={verifyModalOpen}
        onClose={() => setVerifyModalOpen(false)}
        initialStatement={verifyStatement}
        context={verifyContext}
      />
    </div>
  );
};
