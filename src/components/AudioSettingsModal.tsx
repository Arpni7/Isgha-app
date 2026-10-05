import React from 'react';
import { Volume2, X, Sliders, Check, HelpCircle } from 'lucide-react';
import { VoiceOption } from '../utils/textToSpeech';

interface AudioSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableVoices: VoiceOption[];
  selectedVoice: SpeechSynthesisVoice | null;
  onSelectVoice: (voiceUri: string) => void;
  rate: number;
  onChangeRate: (rate: number) => void;
  onOpenHelp: () => void;
}

export const AudioSettingsModal: React.FC<AudioSettingsModalProps> = ({
  isOpen,
  onClose,
  availableVoices,
  selectedVoice,
  onSelectVoice,
  rate,
  onChangeRate,
  onOpenHelp
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-xl overflow-hidden text-right">
        {/* Header */}
        <div className="p-4 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-emerald-800" />
            <h3 className="text-sm font-bold text-slate-900">
              إعدادات القراءة الصوتية (TTS)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5 text-xs text-slate-700">
          {/* 1. Voice Selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-900 block">
                الصوت العربي المستخدم:
              </label>
              {availableVoices.length > 0 && (
                <span className="text-[11px] text-emerald-800 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                  {availableVoices.length} أصوات متاحة
                </span>
              )}
            </div>

            {availableVoices.length > 0 ? (
              <select
                value={selectedVoice?.voiceURI || ''}
                onChange={(e) => onSelectVoice(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 text-xs bg-white text-slate-800 focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 outline-hidden font-medium cursor-pointer"
              >
                {availableVoices.map((v) => (
                  <option key={v.voice.voiceURI} value={v.voice.voiceURI}>
                    {v.displayName} {v.isSaudi ? '⭐ (موصى به)' : ''}
                  </option>
                ))}
              </select>
            ) : (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-2">
                <p className="font-medium">
                  لم يتم اكتشاف أصوات عربية مثبتة على متصفحك.
                </p>
                <button
                  onClick={() => {
                    onClose();
                    onOpenHelp();
                  }}
                  className="inline-flex items-center gap-1 text-emerald-800 font-bold hover:underline cursor-pointer"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>طريقة تفعيل الأصوات العربية على جهازك</span>
                </button>
              </div>
            )}
            <p className="text-[11px] text-slate-500">
              * يُفضّل التطبيق تلقائياً الصوت السعودي (ar-SA) لسلامة النطق ومخارج الحروف.
            </p>
          </div>

          {/* 2. Reading Speed Rate */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <label className="font-bold text-slate-900 block">
              سرعة القراءة:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'متأنٍ (0.85x)', value: 0.85 },
                { label: 'معتدل (0.90x)', value: 0.90 },
                { label: 'قياسي (1.0x)', value: 1.0 }
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onChangeRate(opt.value)}
                  className={`p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-colors text-center ${
                    Math.abs(rate - opt.value) < 0.03
                      ? 'bg-emerald-800 border-emerald-900 text-white shadow-xs'
                      : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-500">
              * السرعة المعتدلة (بين 0.85 و1.0) تضمن سلامة مخارج الحروف والوقفات الطبيعية دون استعجال.
            </p>
          </div>

          {/* 3. Audio Cleaning Notice */}
          <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-emerald-950">
              <Check className="w-3.5 h-3.5 text-emerald-700" />
              <span>تنقية تلقائية للنص قبل القراءة:</span>
            </div>
            <p className="text-[11px] text-emerald-900/80 leading-relaxed">
              يقوم النظام تلقائياً بتنظيف الرموز الزائدة وأرقام الصفحات وتنسيقات الماركداون وتقسيم النص لجمل متتابعة لضمان قراءة انسيابية مستمرة دون تقطع.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between">
          <button
            onClick={() => {
              onClose();
              onOpenHelp();
            }}
            className="text-[11px] text-slate-500 hover:text-emerald-800 flex items-center gap-1 cursor-pointer font-medium"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>مساعدة إعدادات الجهاز</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-xs"
          >
            حفظ وإغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
