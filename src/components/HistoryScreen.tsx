import React, { useState, useEffect } from 'react';
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
  AlertCircle
} from 'lucide-react';

interface HistoryScreenProps {
  onOpenExtraction: (e: Extraction) => void;
  onOpenFatwa: (question: string) => void;
  onStartNew: () => void;
  onBack: () => void;
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({
  onOpenExtraction,
  onOpenFatwa,
  onStartNew,
  onBack,
}) => {
  const { t, isRTL } = useLang();
  const [tab, setTab] = useState<'extractions' | 'fatwas'>('extractions');
  const [search, setSearch] = useState('');
  const [extractions, setExtractions] = useState<Extraction[]>([]);
  const [fatwas, setFatwas] = useState<FatwaRecord[]>([]);
  const [loading, setLoading] = useState(true);

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

  const filteredExtractions = extractions.filter((item) =>
    (item.title + ' ' + item.summary).toLowerCase().includes(search.toLowerCase())
  );

  const filteredFatwas = fatwas.filter((item) =>
    (item.question + ' ' + item.answer).toLowerCase().includes(search.toLowerCase())
  );

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
          <p className="text-xs text-slate-500 mt-0.5">سجل المحاضرات والاستفتاءات المحفوظة</p>
        </div>

        <div className="w-12" />
      </div>

      {/* Segmented Controls & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="inline-flex p-1 bg-slate-200/70 rounded-xl border border-slate-300/60 max-w-xs">
          <button
            onClick={() => setTab('extractions')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              tab === 'extractions' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5 text-emerald-800" />
            <span>{t('tab_extractions')}</span>
            <span className="text-[11px] opacity-75">({extractions.length})</span>
          </button>
          <button
            onClick={() => setTab('fatwas')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              tab === 'fatwas' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-emerald-800" />
            <span>{t('tab_fatwas')}</span>
            <span className="text-[11px] opacity-75">({fatwas.length})</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative flex-1 max-w-xs">
          <Search className="w-4 h-4 text-slate-400 absolute start-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث في السجل..."
            className="w-full ps-9 pe-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs outline-hidden focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700"
          />
        </div>
      </div>

      {/* Content list */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400">
          {t('loading')}
        </div>
      ) : tab === 'extractions' ? (
        filteredExtractions.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/90 p-12 text-center space-y-4">
            <Volume2 className="w-12 h-12 text-slate-300 mx-auto" />
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900">{t('no_records')}</h3>
              <p className="text-xs text-slate-500">قم بتحليل محاضرة صوتية أو نصية لحفظها في سجلك</p>
            </div>
            <button
              onClick={onStartNew}
              className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors shadow-xs"
            >
              {t('start_action')}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredExtractions.map((item) => (
              <div
                key={item.id}
                onClick={() => onOpenExtraction(item)}
                className="bg-white p-5 rounded-xl border border-slate-200/90 hover:border-emerald-700/50 hover:shadow-xs transition-all cursor-pointer flex items-center justify-between gap-4 group"
              >
                <div className="space-y-1.5 flex-1">
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-800 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    {item.summary}
                  </p>

                  {/* Zero-Pill clean text metadata with separators */}
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-1 font-medium">
                    <span>{new Date(item.created_at).toLocaleDateString()}</span>
                    <span aria-hidden="true">·</span>
                    <span>{item.benefits.length} {t('stat_benefits')}</span>
                    <span aria-hidden="true">·</span>
                    <span>{item.hadiths.length} {t('stat_hadiths')}</span>
                    <span aria-hidden="true">·</span>
                    <span>{item.verses.length} {t('stat_verses')}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={(e) => handleDeleteExtraction(item.id, e)}
                    className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                    title={t('delete_item')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div className="text-slate-300 group-hover:text-emerald-700 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 transition-all">
                    {isRTL ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : filteredFatwas.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-12 text-center space-y-4">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900">{t('no_records')}</h3>
            <p className="text-xs text-slate-500">اطرح سؤالاً شرعياً لحفظه في سجلك</p>
          </div>
          <button
            onClick={onStartNew}
            className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors shadow-xs"
          >
            {t('start_action')}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredFatwas.map((item) => (
            <div
              key={item.id}
              onClick={() => onOpenFatwa(item.question)}
              className="bg-white p-5 rounded-xl border border-slate-200/90 hover:border-emerald-700/50 hover:shadow-xs transition-all cursor-pointer flex items-center justify-between gap-4 group"
            >
              <div className="space-y-1.5 flex-1">
                <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-800 transition-colors">
                  {item.question}
                </h3>
                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                  {item.answer}
                </p>

                {/* Zero-Pill clean text metadata */}
                <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-1 font-medium">
                  <span>{new Date(item.created_at).toLocaleDateString()}</span>
                  <span aria-hidden="true">·</span>
                  <span>{item.hadiths?.length || 0} {t('stat_hadiths')}</span>
                  <span aria-hidden="true">·</span>
                  <span>{item.verses?.length || 0} {t('stat_verses')}</span>
                  {item.scholar_references && item.scholar_references.length > 0 && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{item.scholar_references.length} أقوال علماء</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={(e) => handleDeleteFatwa(item.id, e)}
                  className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                  title={t('delete_item')}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="text-slate-300 group-hover:text-emerald-700 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 transition-all">
                  {isRTL ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
