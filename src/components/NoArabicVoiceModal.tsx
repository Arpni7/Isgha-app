import React from 'react';
import { VolumeX, X, HelpCircle, Laptop, Smartphone, RefreshCw } from 'lucide-react';

interface NoArabicVoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export const NoArabicVoiceModal: React.FC<NoArabicVoiceModalProps> = ({
  isOpen,
  onClose,
  onRefresh
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden text-right">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200/70 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-800 shrink-0">
              <VolumeX className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                لم يتم العثور على صوت عربي مثبت
              </h3>
              <p className="text-xs text-amber-900/80 mt-0.5">
                نحرص على قراءة النص بصوت عربي نقي بدل الأصوات الأجنبية المشوشة
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white/80 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Instructions Body */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto text-xs leading-relaxed text-slate-700">
          <p className="text-slate-800 font-medium">
            جهازك الحالي لا يحتوي على حزمة نطق باللغة العربية (TTS). لتفعيل القراءة الصوتية بجودة ممتازة، يمكنك تفعيل الصوت العربي بخطوات بسيطة:
          </p>

          {/* Windows / PC */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <Laptop className="w-4 h-4 text-emerald-700" />
              <span>أجهزة Windows (الكمبيوتر):</span>
            </div>
            <p className="text-slate-600 ps-6">
              افتح <strong>الإعدادات (Settings)</strong> ⬅️ <strong>الوقت واللغة (Time & Language)</strong> ⬅️ <strong>الكلام (Speech)</strong> ⬅️ اضغط <strong>إضافة أصوات</strong> واختر <strong>العربية (المملكة العربية السعودية)</strong>.
            </p>
          </div>

          {/* Mac / iOS */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <Smartphone className="w-4 h-4 text-blue-700" />
              <span>أجهزة Apple (iPhone / iPad / Mac):</span>
            </div>
            <p className="text-slate-600 ps-6">
              افتح <strong>الإعدادات</strong> ⬅️ <strong>تسهيلات الاستخدام (Accessibility)</strong> ⬅️ <strong>المحتوى المنطوق (Spoken Content)</strong> ⬅️ <strong>الأصوات (Voices)</strong> ⬅️ اختر <strong>العربية (صوت ماجد أو نايف)</strong>.
            </p>
          </div>

          {/* Android */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <Smartphone className="w-4 h-4 text-emerald-700" />
              <span>أجهزة Android:</span>
            </div>
            <p className="text-slate-600 ps-6">
              افتح <strong>الإعدادات</strong> ⬅️ <strong>إمكانية الوصول أو النظام</strong> ⬅️ <strong>تحويل النص إلى كلام (Text-to-speech)</strong> ⬅️ اختر محرك <strong>Google Speech</strong> وثبّت البيانات الصوتية للغة العربية.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between gap-3">
          <button
            onClick={() => {
              onRefresh();
              onClose();
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>إعادة فحص الأصوات</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
