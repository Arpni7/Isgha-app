import React, { useState, useRef } from 'react';
import {
  Share2,
  Copy,
  Check,
  Download,
  X,
  Sparkles,
  BookOpen,
  Quote
} from 'lucide-react';

interface ShareBenefitModalProps {
  isOpen: boolean;
  onClose: () => void;
  benefit: string;
  lectureTitle?: string;
  source?: string;
}

export const ShareBenefitModal: React.FC<ShareBenefitModalProps> = ({
  isOpen,
  onClose,
  benefit,
  lectureTitle = '',
  source = ''
}) => {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const formattedShareText = `🌟 فائدة من محاضرة: ${lectureTitle || 'إصغاء'}\n\n«${benefit}»\n\n${source ? `📖 المصدر: ${source}\n` : ''}✨ تطبيق إصغاء — Isgha`;

  const handleCopyText = () => {
    navigator.clipboard.writeText(formattedShareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: lectureTitle || 'فائدة من تطبيق إصغاء',
          text: formattedShareText
        });
      } catch (err) {
        // User cancelled or share failed, fallback to copy
        handleCopyText();
      }
    } else {
      handleCopyText();
    }
  };

  const handleDownloadImage = () => {
    setDownloading(true);
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Card dimensions for high resolution
      const width = 1080;
      const height = 1080;
      canvas.width = width;
      canvas.height = height;

      // Background gradient
      const bgGrad = ctx.createLinearGradient(0, 0, width, height);
      bgGrad.addColorStop(0, '#064e3b'); // Emerald-900
      bgGrad.addColorStop(0.5, '#065f46'); // Emerald-800
      bgGrad.addColorStop(1, '#042f2e'); // Teal-950
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Decorative inner border
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.4)'; // Amber border
      ctx.lineWidth = 4;
      ctx.strokeRect(40, 40, width - 80, height - 80);

      // Subtle Islamic geometric corner accent
      ctx.fillStyle = 'rgba(251, 191, 36, 0.8)';
      ctx.fillRect(40, 40, 30, 4);
      ctx.fillRect(40, 40, 4, 30);
      ctx.fillRect(width - 70, 40, 30, 4);
      ctx.fillRect(width - 44, 40, 4, 30);
      ctx.fillRect(40, height - 44, 30, 4);
      ctx.fillRect(40, height - 70, 4, 30);
      ctx.fillRect(width - 70, height - 44, 30, 4);
      ctx.fillRect(width - 44, height - 70, 4, 30);

      // Top App Branding
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fbbf24'; // Amber-400
      ctx.font = 'bold 36px "Cairo", "Amiri", "Tajawal", "Noto Sans Arabic", sans-serif';
      ctx.fillText('تطبيق إصغاء — ISGHA', width / 2, 120);

      // Lecture title subtitle
      if (lectureTitle) {
        ctx.fillStyle = '#a7f3d0'; // Emerald-200
        ctx.font = '28px "Cairo", "Amiri", "Tajawal", "Noto Sans Arabic", sans-serif';
        const displayTitle = lectureTitle.length > 50 ? lectureTitle.slice(0, 50) + '...' : lectureTitle;
        ctx.fillText(`من محاضرة: ${displayTitle}`, width / 2, 175);
      }

      // Card Container in center
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      const cardX = 90;
      const cardY = 230;
      const cardW = width - 180;
      const cardH = 640;
      const radius = 32;

      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, cardH, radius);
      ctx.fill();

      // Top decorative quotation icon in center of card
      ctx.fillStyle = '#065f46';
      ctx.font = 'bold 70px serif';
      ctx.fillText('❝', width / 2, 330);

      // Text wrapping for Benefit
      ctx.fillStyle = '#1e293b'; // Slate-800
      ctx.font = 'bold 42px "Cairo", "Amiri", "Tajawal", "Noto Sans Arabic", sans-serif';
      ctx.textAlign = 'center';

      const wrapText = (text: string, x: number, y: number, maxWidth: number, lineHeight: number) => {
        const words = text.split(' ');
        let line = '';
        let currentY = y;

        for (let n = 0; n < words.length; n++) {
          const testLine = line + words[n] + ' ';
          const metrics = ctx.measureText(testLine);
          if (metrics.width > maxWidth && n > 0) {
            ctx.fillText(line.trim(), x, currentY);
            line = words[n] + ' ';
            currentY += lineHeight;
          } else {
            line = testLine;
          }
        }
        ctx.fillText(line.trim(), x, currentY);
        return currentY;
      };

      const finalY = wrapText(benefit, width / 2, 420, cardW - 120, 68);

      // Source in card footer if available
      if (source) {
        ctx.fillStyle = '#64748b'; // Slate-500
        ctx.font = '26px "Cairo", "Amiri", "Tajawal", "Noto Sans Arabic", sans-serif';
        ctx.fillText(`المصدر: ${source}`, width / 2, Math.max(finalY + 90, 780));
      }

      // Card Bottom branding
      ctx.fillStyle = '#fef08a';
      ctx.font = '24px "Cairo", "Amiri", "Tajawal", "Noto Sans Arabic", sans-serif';
      ctx.fillText('تدبّر • تفكّر • تعلّم — إصغاء', width / 2, 980);

      // Convert to image and trigger download
      const imageUri = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `isgha-benefit-${Date.now()}.png`;
      downloadLink.href = imageUri;
      downloadLink.click();
    } catch (err) {
      console.error('Failed to generate image card:', err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden text-right flex flex-col">
        {/* Header */}
        <div className="p-4 bg-emerald-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-amber-300" />
            <h3 className="text-base font-bold">مشاركة الفائدة</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Preview Card */}
        <div className="p-6 bg-slate-50 flex flex-col items-center justify-center">
          <div
            ref={cardRef}
            className="w-full max-w-sm rounded-2xl p-6 bg-gradient-to-br from-emerald-900 to-teal-950 text-white shadow-xl border border-amber-300/30 space-y-4 relative overflow-hidden"
          >
            {/* Watermark / Accent */}
            <div className="absolute top-2 start-3 opacity-10 text-white font-serif text-7xl select-none pointer-events-none">
              ❝
            </div>

            <div className="flex items-center justify-between border-b border-emerald-700/60 pb-2">
              <span className="text-[11px] font-bold text-amber-300 tracking-wide">
                إصغاء — ISGHA
              </span>
              {lectureTitle && (
                <span className="text-[10px] text-emerald-200 truncate max-w-[180px]">
                  {lectureTitle}
                </span>
              )}
            </div>

            <div className="p-4 bg-white/95 rounded-xl text-slate-900 shadow-inner space-y-2">
              <Quote className="w-4 h-4 text-emerald-800" />
              <p className="text-sm font-bold leading-relaxed whitespace-pre-wrap font-sans">
                {benefit}
              </p>
              {source && (
                <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex items-center gap-1 font-medium">
                  <BookOpen className="w-3 h-3 text-slate-400" />
                  <span>{source}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-[10px] text-emerald-300/80 pt-1">
              <span>تطبيق إصغاء للمحاضرات والفوائد</span>
              <span>isgha.app</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-5 bg-white border-t border-slate-100 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyText}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'تم نسخ النص' : 'نسخ النص'}</span>
            </button>

            <button
              onClick={handleDownloadImage}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-emerald-700" />
              <span>{downloading ? 'جاري التوليد...' : 'حفظ كصورة'}</span>
            </button>
          </div>

          <button
            onClick={handleNativeShare}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer ms-auto"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>مشاركة سريعة</span>
          </button>
        </div>
      </div>
    </div>
  );
};
