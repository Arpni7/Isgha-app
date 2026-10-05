import React, { useState, useEffect } from 'react';
import { X, Clock, CheckCircle2, UserCheck, RefreshCw, Mail, Phone, AlertCircle } from 'lucide-react';
import { getScholarRequests } from '../api';
import { ScholarQuestionRequest } from '../types';

interface InternalScholarRequestsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InternalScholarRequestsModal: React.FC<InternalScholarRequestsModalProps> = ({
  isOpen,
  onClose
}) => {
  const [requests, setRequests] = useState<ScholarQuestionRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchRequests = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getScholarRequests();
      setRequests(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError('تعذر تحميل طلبات الاستفتاء الداخلية.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchRequests();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden text-right flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <UserCheck className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-sm font-bold">
                سجل طلبات الفتوى المحالة للمشايخ (مراجعة داخلية)
              </h3>
              <p className="text-[11px] text-slate-400">
                سجل داخلي محمي لا يظهر لعامة المستخدمين
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchRequests}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="تحديث"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content List */}
        <div className="p-5 overflow-y-auto space-y-3 flex-1 text-xs">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loading && requests.length === 0 ? (
            <div className="p-12 text-center text-slate-400">جاري تحميل السجلات...</div>
          ) : requests.length === 0 ? (
            <div className="p-12 text-center text-slate-500 space-y-2">
              <Clock className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="font-medium">لا توجد طلبات استفتاء واردة حالياً.</p>
            </div>
          ) : (
            requests.map((req) => (
              <div
                key={req.id}
                className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 space-y-2.5 hover:border-emerald-300 transition-colors"
              >
                <div className="flex items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
                  <span className="font-mono text-[11px] text-slate-500">
                    #{req.id}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 text-[10px] font-bold">
                      {req.status || 'قيد المراجعة'}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {new Date(req.created_at).toLocaleString('ar-SA')}
                    </span>
                  </div>
                </div>

                <div className="text-slate-800 font-medium leading-relaxed whitespace-pre-line text-sm">
                  {req.question}
                </div>

                {req.contact_info && (
                  <div className="pt-1 flex items-center gap-1.5 text-slate-600 text-[11px]">
                    <Mail className="w-3.5 h-3.5 text-emerald-700" />
                    <span>وسيلة التواصل:</span>
                    <span className="font-semibold text-slate-800 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                      {req.contact_info}
                    </span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <span className="text-slate-500">
            إجمالي الطلبات المقيدة: <strong>{requests.length}</strong>
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
