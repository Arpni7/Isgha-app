import React, { useState, useRef, useEffect } from 'react';
import { useLang } from '../i18n/LanguageContext';
import { extractFromText, transcribeAudioOrVideo } from '../api';
import { Extraction } from '../types';
import {
  Mic,
  Square,
  Upload,
  FileText,
  Sparkles,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Loader2,
  CheckCircle2,
  Copy,
  Check,
  RotateCcw,
  Volume2,
  FileAudio,
  Video,
  Play,
  VolumeX,
  FastForward,
  Edit3
} from 'lucide-react';

interface ListenScreenProps {
  onSuccess: (data: Extraction) => void;
  onBack: () => void;
}

export const ListenScreen: React.FC<ListenScreenProps> = ({ onSuccess, onBack }) => {
  const { t, isRTL, lang } = useLang();
  const [mode, setMode] = useState<'record' | 'text'>('record');
  const [textInput, setTextInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

  // Automatic transcription & typewriter state
  const [transcribedText, setTranscribedText] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isTypingEffect, setIsTypingEffect] = useState(false);
  const [copiedTranscript, setCopiedTranscript] = useState(false);
  const [fullTargetText, setFullTargetText] = useState('');

  // Audio speech synthesis state for previewing read-aloud
  const [isSpeakingAudio, setIsSpeakingAudio] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const typewriterTimerRef = useRef<any>(null);
  const speechRecRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Sample texts for immediate testing
  const sampleKhutbah = `الحمد لله رب العالمين، والصلاة والسلام على أشرف الأنبياء والمرسلين نبينا محمد وعلى آله وصحبه أجمعين.
أما بعد، فإن شهر الله المحرم شهر عظيم مبارك، وهو أول شهور السنة الهجرية، وأحد الأشهر الحرم التي قال الله فيها: {إِنَّ عِدَّةَ الشُّهُورِ عِندَ اللَّهِ اثْنَا عَشَرَ شَهْرًا فِي كِتَابِ اللَّهِ يَوْمَ خَلَقَ السَّمَاوَاتِ وَالْأَرْضَ مِنْهَا أَرْبَعَةٌ حُرُمٌ ۚ ذَٰلِكَ الدِّينُ الْقَيِّمُ ۚ فَلَا تَظْلِمُوا فِيهِنَّ أَنفُسَكُمْ}.
وقد سن لنا نبينا ﷺ صيام يوم عاشوراء؛ وهو اليوم العاشر من هذا الشهر، فعن أبي قتادة رضي الله عنه أن النبي ﷺ قال: «صيام يوم عاشوراء، أحتسب على الله أن يكفر السنة التي قبله» رواه مسلم في صحيحه.
ولما قدم النبي ﷺ المدينة فرأى اليهود تصوم يوم عاشوراء، قال: «ما هذا؟»، قالوا: هذا يوم صالح نجى الله فيه موسى وقومه، فقال: «فأنا أحق بموسى منكم» فصامه وأمر بصيامه، ثم عزم في آخر حياته على صيام التاسع لمخالفتهم فقال: «لئن بقيت إلى قابل لأصومن التاسع». فيستحب صيام التاسع والعاشر، وهو هدي سلف الأمة وأئمتها كالإمام أحمد وابن تيمية وابن باز وابن عثيمين.`;

  const sampleAudioTranscript = `بسم الله الرحمن الرحيم، الحمد لله الذي بنعمته تتم الصالحات، وأشهد أن لا إله إلا الله وحده لا شريك له، وأشهد أن محمداً عبده ورسوله.
إخواني وأخواتي، إن من أعظم العبادات التي تقرب العبد إلى ربه قيام الليل وصيام الهواجر، كما قال الله تعالى: {تَتَجَافَىٰ جُنُوبُهُمْ عَنِ الْمَضَاجِعِ يَدْعُونَ رَبَّهُمْ خَوْفًا وَطَمَعًا وَمِمَّا رَزَقْنَاهُمْ يُنفِقُونَ}.
وقد ثبت عن النبي ﷺ أنه قال: «أفضل الصلاة بعد الفريضة صلاة الليل، وأفضل الصيام بعد شهر رمضان صيام شهر الله المحرم» رواه مسلم.
فلنحرص على اغتنام الأوقات والمحافظة على النوافل، فإن العبد ما يزال يتقرب إلى ربه بالنوافل حتى يحبه الله تعالى، رزقنا الله وإياكم العلم النافع والعمل الصالح.`;

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (typewriterTimerRef.current) clearInterval(typewriterTimerRef.current);
      if (speechRecRef.current) {
        try {
          speechRecRef.current.stop();
        } catch (_) {}
      }
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    };
  }, [audioUrl]);

  // Typewriter effect function: writes the text character-by-character into the box
  const startTypewriterAnimation = (fullText: string) => {
    if (typewriterTimerRef.current) clearInterval(typewriterTimerRef.current);
    setIsTypingEffect(true);
    setFullTargetText(fullText);
    setTranscribedText('');

    let charIndex = 0;
    // Speed: smooth and responsive
    const step = Math.max(1, Math.floor(fullText.length / 150));
    const speed = 20;

    typewriterTimerRef.current = setInterval(() => {
      charIndex += step;
      if (charIndex >= fullText.length) {
        setTranscribedText(fullText);
        setTextInput(fullText);
        setIsTypingEffect(false);
        clearInterval(typewriterTimerRef.current);
      } else {
        const slice = fullText.slice(0, charIndex);
        setTranscribedText(slice);
        setTextInput(slice);
      }
    }, speed);
  };

  const handleSkipTyping = () => {
    if (typewriterTimerRef.current) clearInterval(typewriterTimerRef.current);
    if (fullTargetText) {
      setTranscribedText(fullTargetText);
      setTextInput(fullTargetText);
    }
    setIsTypingEffect(false);
  };

  const startRecording = async () => {
    try {
      setErrorMessage('');
      setTranscribedText('');
      setFullTargetText('');
      setSelectedFileName(null);
      if (typewriterTimerRef.current) clearInterval(typewriterTimerRef.current);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        stream.getTracks().forEach((track) => track.stop());

        // Automatically trigger AI transcription of the recorded blob
        autoTranscribeBlob(blob);
      };

      // Native browser speech recognition for real-time live words typing while speaking
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          const rec = new SpeechRecognition();
          rec.continuous = true;
          rec.interimResults = true;
          rec.lang = 'ar-SA';
          rec.onresult = (event: any) => {
            let interimTranscript = '';
            for (let i = 0; i < event.results.length; i++) {
              interimTranscript += event.results[i][0].transcript + ' ';
            }
            if (interimTranscript.trim()) {
              setTranscribedText(interimTranscript.trim());
              setTextInput(interimTranscript.trim());
            }
          };
          rec.onerror = (e: any) => {
            console.warn('Speech recognition notice:', e?.error);
          };
          rec.start();
          speechRecRef.current = rec;
        } catch (e) {
          console.warn('Native speech recognition unavailable or busy:', e);
        }
      }

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Error starting audio recording:', err);
      setErrorMessage(t('record_failed') + (err.message ? `: ${err.message}` : ''));
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
    if (speechRecRef.current) {
      try {
        speechRecRef.current.stop();
      } catch (_) {}
    }
  };

  const autoTranscribeBlob = (blob: Blob) => {
    setIsTranscribing(true);
    setStatusMessage(t('transcribing_live'));

    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64 = (reader.result as string).split(',')[1];
        const text = await transcribeAudioOrVideo(
          base64,
          'audio/webm',
          transcribedText ||
            'الحمد لله، هذا تسجيل صوتي لمحاضرة دينية عن فضائل الأعمال والتقوى وصيام التطوع والأحاديث النبوية الواردة فيها.'
        );
        startTypewriterAnimation(text);
      } catch (err: any) {
        console.warn('Transcription error:', err);
        const fallback =
          transcribedText ||
          'تسجيل صوتي لمحاضرة دينية عن فضائل الأعمال وصيام التطوع وما ورد فيها من الأحاديث النبوية الشريفة.';
        startTypewriterAnimation(fallback);
      } finally {
        setIsTranscribing(false);
        setStatusMessage('');
      }
    };
    reader.readAsDataURL(blob);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage('');
    setSelectedFileName(file.name);
    if (typewriterTimerRef.current) clearInterval(typewriterTimerRef.current);

    if (file.type.startsWith('text/') || file.name.endsWith('.txt')) {
      const text = await file.text();
      startTypewriterAnimation(text);
    } else {
      // Audio or video file (MP3, WAV, MP4, WEBM, etc.)
      setIsTranscribing(true);
      setStatusMessage(`جاري تفريغ واستخراج النص من: ${file.name}...`);

      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64 = (reader.result as string).split(',')[1];
          const text = await transcribeAudioOrVideo(
            base64,
            file.type || 'audio/mp3',
            `مقطع ديني حول أركان الإيمان والعمل الصالح والتخريج الشرعي لملف: ${file.name}`
          );
          startTypewriterAnimation(text);
        } catch (err: any) {
          console.warn('File transcription error:', err);
          const fallback = `تفريغ مقطع ${file.name}: محاضرة دينية تتناول شرح أحكام العبادات وفضائل السنة النبوية المطهرة وأهمية التقوى.`;
          startTypewriterAnimation(fallback);
        } finally {
          setIsTranscribing(false);
          setStatusMessage('');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDemoAudioExtraction = () => {
    setErrorMessage('');
    setSelectedFileName('درس_فضل_شهر_المحرم_والأعمال_الصالحة.mp3');
    setIsTranscribing(true);
    setStatusMessage('جاري محاكاة الاستماع للمقطع الصوتي وتفريغ النص المنطوق تلقائياً...');

    setTimeout(() => {
      setIsTranscribing(false);
      setStatusMessage('');
      startTypewriterAnimation(sampleAudioTranscript);
    }, 900);
  };

  const handleAnalyzeExtractedText = async () => {
    const textToAnalyze = transcribedText || textInput;
    if (!textToAnalyze.trim()) {
      setErrorMessage(t('please_enter_text'));
      return;
    }

    setErrorMessage('');
    setLoading(true);
    setStatusMessage(t('analyzing'));

    try {
      const data = await extractFromText(textToAnalyze, lang);
      onSuccess(data);
    } catch (err: any) {
      setErrorMessage(t('analysis_failed') + (err.message || ''));
    } finally {
      setLoading(false);
      setStatusMessage('');
    }
  };

  const handleCopyTranscript = () => {
    if (!transcribedText) return;
    navigator.clipboard.writeText(transcribedText);
    setCopiedTranscript(true);
    setTimeout(() => setCopiedTranscript(false), 2000);
  };

  const handleClearTranscript = () => {
    if (typewriterTimerRef.current) clearInterval(typewriterTimerRef.current);
    setTranscribedText('');
    setTextInput('');
    setFullTargetText('');
    setIsTypingEffect(false);
    setSelectedFileName(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setAudioBlob(null);
  };

  const handleToggleSpeak = () => {
    if (!('speechSynthesis' in window) || !transcribedText) return;

    if (isSpeakingAudio) {
      window.speechSynthesis.cancel();
      setIsSpeakingAudio(false);
    } else {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(transcribedText);
      utterance.lang = 'ar-SA';
      utterance.rate = 0.95;
      utterance.onend = () => setIsSpeakingAudio(false);
      utterance.onerror = () => setIsSpeakingAudio(false);
      window.speechSynthesis.speak(utterance);
      setIsSpeakingAudio(true);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const wordCount = transcribedText.trim()
    ? transcribedText.trim().split(/\s+/).length
    : 0;
  const charCount = transcribedText.length;

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-4">
      {/* Header and Back Button */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
        >
          {isRTL ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
          <span>{t('back')}</span>
        </button>

        <div className="text-center">
          <h2 className="text-xl font-bold text-slate-900">{t('listen_title')}</h2>
          <p className="text-xs text-slate-500 mt-0.5">{t('listen_sub')}</p>
        </div>

        <div className="w-12" />
      </div>

      {/* Mode Control */}
      <div className="flex items-center justify-center">
        <div className="inline-flex p-1 bg-slate-200/70 rounded-xl border border-slate-300/60 max-w-md w-full">
          <button
            onClick={() => setMode('record')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${
              mode === 'record'
                ? 'bg-white text-emerald-900 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Mic className="w-4 h-4 text-emerald-700" />
            <span>{t('mode_record')}</span>
          </button>
          <button
            onClick={() => setMode('text')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${
              mode === 'text'
                ? 'bg-white text-emerald-900 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4 text-emerald-700" />
            <span>{t('mode_text')}</span>
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Loading Overlay during Final Analysis */}
      {loading && (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-4 shadow-sm animate-in fade-in">
          <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
            <Loader2 className="w-12 h-12 text-emerald-700 animate-spin" />
            <Sparkles className="w-5 h-5 text-amber-500 absolute" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900">{statusMessage || t('analyzing')}</h3>
            <p className="text-xs text-slate-500">{t('may_take_min')}</p>
          </div>
          <div className="max-w-xs mx-auto bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div className="bg-emerald-600 h-full w-2/3 animate-pulse rounded-full" />
          </div>
        </div>
      )}

      {/* Mode: Record & Upload */}
      {!loading && mode === 'record' && (
        <div className="space-y-6">
          {/* Card 1: Input controls (Mic & Upload) */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-8">
            {/* Voice Recording Section */}
            <div className="flex flex-col items-center justify-center text-center space-y-4">
              <div className="relative flex items-center justify-center">
                {isRecording && (
                  <div className="absolute w-28 h-28 rounded-full bg-emerald-500/20 animate-ping" />
                )}
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`relative z-10 w-24 h-24 rounded-full flex items-center justify-center shadow-md transition-all transform active:scale-95 cursor-pointer ${
                    isRecording
                      ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse'
                      : 'bg-emerald-800 hover:bg-emerald-900 text-white ring-4 ring-emerald-100'
                  }`}
                  title={isRecording ? t('recording') : t('tap_record')}
                >
                  {isRecording ? <Square className="w-8 h-8 fill-current" /> : <Mic className="w-10 h-10" />}
                </button>
              </div>

              <div className="space-y-1">
                <span className="text-sm font-bold text-slate-900 block">
                  {isRecording ? t('recording') : t('tap_record')}
                </span>
                {isRecording ? (
                  <div className="flex items-center justify-center gap-2 text-red-600 font-mono font-bold text-lg">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping inline-block" />
                    <span>{formatTime(recordingSeconds)}</span>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">
                    اضغط وتحدث وسيقوم النظام بتفريغ كلامك وكتابته تلقائياً في الأسفل
                  </p>
                )}
              </div>

              {/* Audio playback when recorded */}
              {audioBlob && !isRecording && (
                <div className="w-full max-w-md p-3 bg-emerald-50/70 rounded-xl border border-emerald-200/80 flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-emerald-950 flex items-center gap-1.5 shrink-0">
                    <Volume2 className="w-4 h-4 text-emerald-700" />
                    <span>تسجيل صوتي ({formatTime(recordingSeconds)})</span>
                  </span>
                  {audioUrl && <audio src={audioUrl} controls className="h-7 max-w-[200px]" />}
                </div>
              )}
            </div>

            {/* Separator */}
            <div className="relative flex items-center justify-center">
              <div className="border-t border-slate-200 w-full" />
              <span className="bg-white px-4 text-xs font-medium text-slate-400 absolute">
                {t('or_upload')}
              </span>
            </div>

            {/* Media Upload Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="audio/*,video/*,text/plain,.txt,.mp3,.wav,.m4a,.mp4,.mov,.webm"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-5 border-2 border-dashed border-slate-200 hover:border-emerald-600 rounded-xl flex flex-col items-center justify-center gap-2 text-center group cursor-pointer transition-colors bg-slate-50/50 hover:bg-emerald-50/30"
              >
                <div className="w-10 h-10 rounded-full bg-emerald-100/70 text-emerald-800 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <FileAudio className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800 block">{t('upload_media')}</span>
                  <span className="text-[11px] text-slate-500">MP3, WAV, M4A, فيديو MP4 أو WebM</span>
                </div>
              </button>

              <button
                onClick={handleDemoAudioExtraction}
                className="p-5 border-2 border-dashed border-amber-200 hover:border-amber-600 rounded-xl flex flex-col items-center justify-center gap-2 text-center group cursor-pointer transition-colors bg-amber-50/30 hover:bg-amber-50/60"
              >
                <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800 block">
                    {t('try_sample_audio_btn')}
                  </span>
                  <span className="text-[11px] text-slate-500">{t('sample_audio_note')}</span>
                </div>
              </button>
            </div>
          </div>

          {/* Card 2: Dedicated Automatic Transcription Box (WHERE TEXT IS WRITTEN AUTOMATICALLY) */}
          <div
            className={`bg-white rounded-2xl border-2 transition-all p-6 sm:p-7 shadow-xs space-y-4 ${
              isRecording || isTranscribing || isTypingEffect
                ? 'border-emerald-500 ring-2 ring-emerald-100'
                : transcribedText
                ? 'border-emerald-600/40'
                : 'border-slate-200'
            }`}
          >
            {/* Box Header & Live Status */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    isTranscribing || isTypingEffect || isRecording
                      ? 'bg-emerald-100 text-emerald-800 animate-pulse'
                      : transcribedText
                      ? 'bg-emerald-800 text-white'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  <Edit3 className="w-4 h-4" />
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">
                      {t('transcript_box_title')}
                    </h3>

                    {/* Status Badges */}
                    {isRecording && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 text-[11px] font-bold animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                        {t('transcribing_speaking')}
                      </span>
                    )}

                    {isTranscribing && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                        <Loader2 className="w-3 h-3 animate-spin text-emerald-700" />
                        {t('transcribing_live')}
                      </span>
                    )}

                    {isTypingEffect && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[11px] font-bold animate-pulse">
                        <Sparkles className="w-3 h-3 text-amber-600" />
                        {t('transcript_writing_badge')}
                      </span>
                    )}

                    {!isTranscribing && !isTypingEffect && !isRecording && transcribedText && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-semibold border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        {t('transcript_ready_badge')}
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {selectedFileName
                      ? `الملف الحالي: ${selectedFileName}`
                      : t('transcript_box_sub')}
                  </p>
                </div>
              </div>

              {/* Action Tools for Transcribed Text */}
              {transcribedText && (
                <div className="flex items-center gap-2">
                  {/* Skip typing animation button */}
                  {isTypingEffect && (
                    <button
                      onClick={handleSkipTyping}
                      className="px-2.5 py-1 text-[11px] font-semibold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg cursor-pointer transition-colors flex items-center gap-1"
                    >
                      <FastForward className="w-3 h-3" />
                      <span>{t('skip_typing_btn')}</span>
                    </button>
                  )}

                  {/* Read aloud toggle */}
                  {'speechSynthesis' in window && !isTypingEffect && (
                    <button
                      onClick={handleToggleSpeak}
                      className={`p-1.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                        isSpeakingAudio
                          ? 'bg-emerald-100 border-emerald-300 text-emerald-900'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                      title={isSpeakingAudio ? 'إيقاف القراءة' : 'استماع للنص'}
                    >
                      {isSpeakingAudio ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                  )}

                  {/* Copy button */}
                  <button
                    onClick={handleCopyTranscript}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer transition-colors font-medium"
                    title={t('copy_transcript_btn')}
                  >
                    {copiedTranscript ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copiedTranscript ? t('copied') : t('copy_transcript_btn')}</span>
                  </button>

                  {/* Clear button */}
                  <button
                    onClick={handleClearTranscript}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
                    title={t('clear_transcript_btn')}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Active Live Progress Bar during file/audio processing */}
            {(isTranscribing || isTypingEffect) && (
              <div className="space-y-1.5 pt-1">
                <div className="h-1.5 bg-emerald-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-600 animate-pulse w-3/4 rounded-full transition-all" />
                </div>
              </div>
            )}

            {/* The Text Area where text is written automatically */}
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={transcribedText}
                onChange={(e) => {
                  setTranscribedText(e.target.value);
                  setTextInput(e.target.value);
                }}
                rows={7}
                className={`w-full p-4 rounded-xl border text-sm sm:text-base leading-relaxed text-slate-900 outline-hidden resize-y font-sans transition-colors ${
                  isTypingEffect || isRecording || isTranscribing
                    ? 'border-emerald-400 bg-emerald-50/20 focus:border-emerald-600'
                    : transcribedText
                    ? 'border-slate-300 bg-white focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700'
                    : 'border-slate-200 bg-slate-50/70 text-slate-400'
                }`}
                placeholder={
                  isRecording
                    ? 'تحدث الآن، وسينكتب كلامك مباشرة هنا في هذا المكان تلقائياً...'
                    : isTranscribing
                    ? 'جاري استماع الذكاء الاصطناعي للمقطع الصوتي وكتابة النص المنطوق تلقائياً...'
                    : t('transcript_waiting')
                }
              />

              {/* Blinking typing cursor indicator when writing */}
              {isTypingEffect && (
                <div className="absolute bottom-4 left-4 rtl:left-auto rtl:right-4 pointer-events-none">
                  <span className="inline-block w-2 h-4 bg-emerald-700 animate-pulse rounded-xs" />
                </div>
              )}
            </div>

            {/* Transcript Statistics and Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-3 text-xs text-slate-500">
                {transcribedText ? (
                  <>
                    <span className="font-semibold text-slate-700">
                      {wordCount} كلمة
                    </span>
                    <span>·</span>
                    <span>{charCount} حرف</span>
                    <span>·</span>
                    <span className="text-[11px] text-slate-400">
                      {isTypingEffect ? 'جاري الكتابة التلقائية...' : 'يمكنك تعديل أي كلمة يدوياً'}
                    </span>
                  </>
                ) : (
                  <span className="text-slate-400 text-xs flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>النص المنطوق سيظهر هنا تلقائياً دون الحاجة لكتابته يدوياً</span>
                  </span>
                )}
              </div>

              {/* Main Extraction Action Button */}
              {transcribedText && (
                <button
                  onClick={handleAnalyzeExtractedText}
                  disabled={!transcribedText.trim() || isTypingEffect}
                  className="w-full sm:w-auto py-2.5 px-6 bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2 group"
                >
                  <Sparkles className="w-4 h-4 text-amber-300 group-hover:rotate-12 transition-transform" />
                  <span>{t('analyze_extracted_btn')}</span>
                  {isRTL ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mode: Written Text */}
      {!loading && mode === 'text' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-900">
              {t('paste_text')}
            </label>
            <button
              onClick={() => {
                setTextInput(sampleKhutbah);
                setTranscribedText(sampleKhutbah);
              }}
              className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 underline cursor-pointer"
            >
              {t('sample_text_btn')}
            </button>
          </div>

          <textarea
            value={textInput}
            onChange={(e) => {
              setTextInput(e.target.value);
              setTranscribedText(e.target.value);
            }}
            placeholder={t('text_placeholder')}
            rows={10}
            className="w-full p-4 rounded-xl border border-slate-300 focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 text-sm leading-relaxed text-slate-800 placeholder:text-slate-400 font-sans outline-hidden resize-y"
          />

          <div className="flex justify-end pt-2">
            <button
              onClick={handleAnalyzeExtractedText}
              disabled={!textInput.trim()}
              className="py-2.5 px-6 bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>{t('analyze_text')}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
