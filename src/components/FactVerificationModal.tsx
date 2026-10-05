import React, { useState, useEffect } from 'react';
import {
  Search,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Copy,
  Check,
  X,
  Loader2,
  ShieldCheck,
  BookOpen,
  ArrowRight
} from 'lucide-react';
import { verifyFact } from '../api';
import { FactVerificationResult } from '../types';

interface FactVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialStatement?: string;
  context?: string;
}

export const FactVerificationModal: React.FC<FactVerificationModalProps> = ({
  isOpen,
  onClose,
  initialStatement = '',
  context = ''
}) => {
  const [statement, setStatement] = useState(initialStatement);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FactVerificationResult | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && initialStatement) {
      setStatement(initialStatement);
      handleVerify(initialStatement);
    } else if (isOpen) {
      setResult(null);
      setError('');
    }
  }, [isOpen, initialStatement]);

  if (!isOpen) return null;

  const handleVerify = async (queryText?: string) => {
    const textToVerify = (queryText || statement).trim();
    if (!textToVerify) return;

    setLoading(true);
    setError('');
    try {
      const res = await verifyFact(textToVerify, context);
      setResult(res);
    } catch (err: any) {
      setError(err?.message || 'تعذر استكمال التحقق حالياً، يرجى المحاولة لاحقاً.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!result) return;
    const text = `🔎 نتيجة التحقق من المعلومة عبر تطبيق إصغاء:\n\n«${result.statement}»\n\n📌 الحالة: ${result.status_label}\n📖 المصدر: ${result.source_name}${result.evidence_text ? `\n📜 الدليل: «${result.evidence_text}»` : ''}\n\n💡 الإيضاح: ${result.explanation}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden text-right flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 text-white flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-amber-300 shrink-0">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold flex items-center gap-1.5">
                <span>التحقق من المعلومة الشرعية</span>
                <span className="text-[10px] bg-amber-400/20 text-amber-200 px-2 py-0.5 rounded-full font-medium">
                  المصادر المعتمدة
                </span>
              </h3>
              <p className="text-xs text-emerald-100/90 mt-0.5">
                تخريج وتوثيق الأقوال والأحاديث والآيات وفق جدول المصادر الموثقة
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search / Input Box */}
        <div className="p-4 sm:p-5 border-b border-slate-100 space-y-3 bg-slate-50/50">
          <label className="text-xs font-bold text-slate-700 block">
            المعلومة أو النقل المراد التحقق منه:
          </label>
          <div className="flex gap-2">
            <textarea
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
              rows={2}
              placeholder="اكتب المعلومة أو الحديث أو المسألة للتأكد من مصدرها..."
              className="flex-1 p-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 outline-hidden bg-white resize-none"
            />
            <button
              onClick={() => handleVerify()}
              disabled={loading || !statement.trim()}
              className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span>تحقق</span>
            </button>
          </div>
        </div>

        {/* Results Area */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 text-xs sm:text-sm">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="p-10 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-emerald-700 animate-spin mx-auto" />
              <div className="space-y-1">
                <p className="font-bold text-slate-800">جاري مطابقة المعلومة مع المصادر المعتمدة...</p>
                <p className="text-xs text-slate-500">البحث في القرآن الكريم، الدرر السنية، كتب السنة، والمذاهب الأربعة</p>
              </div>
            </div>
          ) : result ? (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Status Header Badge */}
              <div
                className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                  result.status === 'verified'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                    : 'bg-amber-50 border-amber-200 text-amber-950'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-xs sm:text-sm">
                  {result.status === 'verified' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-amber-700 shrink-0" />
                  )}
                  <span>{result.status_label}</span>
                </div>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg bg-white/80 hover:bg-white text-slate-700 border border-slate-200 transition-colors cursor-pointer shadow-2xs font-medium"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'تم النسخ' : 'نسخ النتيجة'}</span>
                </button>
              </div>

              {/* Extracted statement card */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  المعلومة المستخرجة المراد التحقق منها:
                </span>
                <p className="text-xs sm:text-sm font-semibold text-slate-900 leading-relaxed">
                  «{result.statement}»
                </p>
              </div>

              {/* Verified Evidence if available */}
              {result.evidence_text ? (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    النص أو الدليل الشرعي المرتبط:
                  </span>
                  <div className="text-base font-quran text-slate-900 leading-loose py-1 px-2 border-r-2 border-emerald-600 bg-white rounded-md">
                    «{result.evidence_text}»
                  </div>
                </div>
              ) : result.status === 'unverified' ? (
                <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200/90 text-amber-900 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">لم يتم العثور على دليل أو نص صريح مطابق:</span>
                    <span>التزاماً بالأمانة العلمية وقواعد التحقق، لا يقوم النظام باختلاق أي دليل أو تخريج لم يثبت في المصادر المعتمدة.</span>
                  </div>
                </div>
              ) : null}

              {/* Source Name & URL */}
              <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 space-y-1.5">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  المصدر المعتمد:
                </span>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-slate-900 text-xs sm:text-sm">
                    {result.source_name}
                  </span>
                  {result.source_url && (
                    <a
                      href={result.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-emerald-800 hover:text-emerald-950 font-bold bg-white px-2.5 py-1 rounded-md border border-slate-200 hover:border-emerald-300 transition-colors"
                    >
                      <span>زيارة المصدر المعتمد</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>

              {/* Explanation Note */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  بيان وتوضيح المحقق:
                </span>
                <p className="text-slate-800 leading-relaxed text-xs sm:text-sm">
                  {result.explanation}
                </p>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 space-y-2">
              <BookOpen className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs">اضغط على زر "تحقق" للبحث في جدول المصادر المعتمدة والتأكد من صحة المعلومة.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <span className="text-slate-500 text-[11px]">
            * لا يتم اختلاق أي مصدر؛ إذا تعذر وجود نص صريح يُعلن عدم ثبوته فوراً.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl transition-colors cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
