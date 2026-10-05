import React, { useState, useEffect } from 'react';
import { Send, X, CheckCircle2, UserCheck, AlertCircle, Loader2, Phone, Mail, HelpCircle } from 'lucide-react';
import { submitQuestionToScholar } from '../api';

interface SendToScholarModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuestion?: string;
  onSuccess?: () => void;
}

export const SendToScholarModal: React.FC<SendToScholarModalProps> = ({
  isOpen,
  onClose,
  initialQuestion = '',
  onSuccess
}) => {
  const [question, setQuestion] = useState(initialQuestion);
  const [contactInfo, setContactInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      setQuestion(initialQuestion);
      setError('');
      setSubmittedSuccess(false);
    }
  }, [isOpen, initialQuestion]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) {
      setError('يرجى كتابة نص السؤال بالتفصيل.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await submitQuestionToScholar(question.trim(), contactInfo.trim());
      if (res.success) {
        setSubmittedSuccess(true);
        setSuccessMessage(res.message || 'تم إرسال سؤالك، سيصلك الرد من مختص قريباً إن شاء الله');
        if (onSuccess) onSuccess();
      } else {
        setError('تعذر إرسال السؤال حالياً، يرجى المحاولة لاحقاً.');
      }
    } catch (err: any) {
      setError(err?.message || 'حدث خطأ أثناء إرسال السؤال، يرجى إعادة المحاولة.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden text-right">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-emerald-800 to-teal-900 text-white flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-amber-300 shrink-0">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">
                إرسال السؤال لشيخ وباحث مختص
              </h3>
              <p className="text-xs text-emerald-100/90 mt-0.5">
                سيُعرض سؤالك على عالم معتمد لدراسته والرد عليه بمصادر الشريعة
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        {submittedSuccess ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-8 h-8 text-emerald-700" />
            </div>
            <div className="space-y-2">
              <h4 className="text-base font-bold text-slate-900">
                {successMessage}
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
                تم قيد طلبك في سجل المراجعات الداخلية بحالة <span className="font-bold text-emerald-900">"قيد المراجعة"</span>، وسيتم التواصل معك وموافادتك بالجواب المحقق فور صدوره.
              </p>
            </div>
            <div className="pt-2">
              <button
                onClick={onClose}
                className="px-6 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-xs"
              >
                حسناً، تم
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{error}</span>
              </div>
            )}

            {/* Question Text */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-900 block flex items-center justify-between">
                <span>نص السؤال أو الاستفتاء:</span>
                <span className="text-[11px] text-slate-400 font-normal">يمكنك تعديل السؤال أو إضافة تفاصيل خاصة</span>
              </label>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                rows={5}
                placeholder="اكتب سؤالك بوضوح وتفصيل..."
                className="w-full p-3 rounded-xl border border-slate-300 focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 text-slate-800 placeholder:text-slate-400 outline-hidden leading-relaxed resize-y font-sans"
                required
              />
            </div>

            {/* Contact info (optional) */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-900 block flex items-center justify-between">
                <span>وسيلة تواصل لتلقي الرد لاحقاً (اختياري):</span>
                <span className="text-[11px] text-emerald-800 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md">اختياري</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={contactInfo}
                  onChange={(e) => setContactInfo(e.target.value)}
                  placeholder="بريد إلكتروني، أو رقم واتساب / هاتف..."
                  className="w-full p-3 pe-10 rounded-xl border border-slate-300 focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 text-slate-800 placeholder:text-slate-400 outline-hidden"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute start-3 top-3.5" />
              </div>
              <p className="text-[11px] text-slate-500">
                * لن يتم نشر سؤالك أو بياناتك لأي مستخدم آخر؛ يُحفظ الطلب للمراجعة الشرعية المباشرة فقط.
              </p>
            </div>

            {/* Footer Buttons */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={loading || !question.trim()}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>إرسال لشيخ مختص الآن</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
