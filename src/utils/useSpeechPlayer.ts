import { useState, useEffect, useRef, useCallback } from 'react';
import {
  VoiceOption,
  getArabicVoices,
  selectBestVoice,
  splitTextIntoChunks,
  saveVoicePreference,
  getSavedRatePreference,
  saveRatePreference,
  waitForVoicesLoaded
} from './textToSpeech';

export interface UseSpeechPlayerReturn {
  isPlaying: boolean;
  isPaused: boolean;
  currentChunk: number;
  totalChunks: number;
  availableVoices: VoiceOption[];
  selectedVoice: SpeechSynthesisVoice | null;
  rate: number;
  hasArabicVoice: boolean;
  showNoVoiceModal: boolean;
  setShowNoVoiceModal: (show: boolean) => void;
  play: (text: string) => Promise<void>;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  setVoice: (voiceUri: string) => void;
  changeRate: (newRate: number) => void;
  refreshVoices: () => Promise<void>;
}

export function useSpeechPlayer(): UseSpeechPlayerReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentChunk, setCurrentChunk] = useState(0);
  const [totalChunks, setTotalChunks] = useState(0);
  const [availableVoices, setAvailableVoices] = useState<VoiceOption[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [rate, setRateState] = useState<number>(getSavedRatePreference);
  const [showNoVoiceModal, setShowNoVoiceModal] = useState(false);

  // Queue and lifecycle refs
  const isPlayingRef = useRef(false);
  const queueRef = useRef<string[]>([]);
  const queueIndexRef = useRef(0);
  const selectedVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const rateRef = useRef<number>(rate);

  // Keep refs in sync with state
  selectedVoiceRef.current = selectedVoice;
  rateRef.current = rate;

  // Asynchronous voice population waiting for voiceschanged
  const populateVoices = useCallback(async () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const voices = await waitForVoicesLoaded();
    const arabic = getArabicVoices(voices);
    setAvailableVoices(arabic);
    if (arabic.length > 0) {
      const best = selectBestVoice(arabic);
      setSelectedVoice(best);
      selectedVoiceRef.current = best;
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    // Wait for voiceschanged before populating voices list!
    waitForVoicesLoaded().then((voices) => {
      if (!isMounted) return;
      const arabic = getArabicVoices(voices);
      setAvailableVoices(arabic);
      if (arabic.length > 0) {
        const best = selectBestVoice(arabic);
        setSelectedVoice(best);
        selectedVoiceRef.current = best;
      }
    });

    const handleVoicesChanged = () => {
      if (!isMounted) return;
      const current = window.speechSynthesis.getVoices();
      const arabic = getArabicVoices(current);
      setAvailableVoices(arabic);
      if (arabic.length > 0) {
        setSelectedVoice((prev) => {
          if (prev && arabic.some((v) => v.voice.voiceURI === prev.voiceURI)) {
            return prev;
          }
          const best = selectBestVoice(arabic);
          selectedVoiceRef.current = best;
          return best;
        });
      }
    };

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);
    }

    return () => {
      isMounted = false;
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const stop = useCallback(() => {
    isPlayingRef.current = false;
    queueIndexRef.current = 0;
    queueRef.current = [];
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentChunk(0);
    setTotalChunks(0);
  }, []);

  // Sequential queue processor: plays next item from queue
  const playNextInQueue = useCallback(() => {
    if (!isPlayingRef.current) return;
    const queue = queueRef.current;
    const index = queueIndexRef.current;

    if (index >= queue.length) {
      stop();
      return;
    }

    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();

    const chunkText = queue[index];
    const utterance = new SpeechSynthesisUtterance(chunkText);

    const voice = selectedVoiceRef.current;
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang || 'ar-SA';
    } else {
      utterance.lang = 'ar-SA';
    }

    // Rate between 0.85 and 1.0, pitch = 1
    utterance.rate = rateRef.current;
    utterance.pitch = 1.0;

    utterance.onend = () => {
      if (isPlayingRef.current) {
        queueIndexRef.current = index + 1;
        setCurrentChunk(index + 1);
        playNextInQueue();
      }
    };

    utterance.onerror = (e) => {
      // Ignore manual interruptions
      if (e.error === 'interrupted' || e.error === 'canceled') return;
      console.warn('[TTS Queue Notice]', e.error);
      if (isPlayingRef.current) {
        queueIndexRef.current = index + 1;
        setCurrentChunk(index + 1);
        playNextInQueue();
      }
    };

    window.speechSynthesis.speak(utterance);
  }, [stop]);

  const play = useCallback(async (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setShowNoVoiceModal(true);
      return;
    }

    // Ensure voices are loaded first to prevent default fallback voice
    let currentVoices = availableVoices;
    if (currentVoices.length === 0) {
      const loaded = await waitForVoicesLoaded(1000);
      currentVoices = getArabicVoices(loaded);
      setAvailableVoices(currentVoices);
      if (currentVoices.length > 0) {
        const best = selectBestVoice(currentVoices);
        setSelectedVoice(best);
        selectedVoiceRef.current = best;
      }
    }

    // If still no Arabic voice on the device, stop and display Arabic notice
    if (currentVoices.length === 0) {
      console.warn('[TTS] Speech aborted: No Arabic voice available on this device.');
      setShowNoVoiceModal(true);
      return;
    }

    // Split cleaned text into short sequential chunks (< 140 chars)
    const chunks = splitTextIntoChunks(text);
    if (chunks.length === 0) return;

    // Reset previous playback
    stop();

    queueRef.current = chunks;
    queueIndexRef.current = 0;
    isPlayingRef.current = true;
    setIsPlaying(true);
    setIsPaused(false);
    setCurrentChunk(0);
    setTotalChunks(chunks.length);

    playNextInQueue();
  }, [availableVoices, stop, playNextInQueue]);

  const pause = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window && isPlaying) {
      window.speechSynthesis.pause();
      setIsPaused(true);
    }
  }, [isPlaying]);

  const resume = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window && isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
    }
  }, [isPaused]);

  const setVoice = useCallback((voiceUri: string) => {
    const found = availableVoices.find((v) => v.voice.voiceURI === voiceUri);
    if (found) {
      setSelectedVoice(found.voice);
      selectedVoiceRef.current = found.voice;
      saveVoicePreference(voiceUri);
      if (isPlayingRef.current) {
        playNextInQueue();
      }
    }
  }, [availableVoices, playNextInQueue]);

  const changeRate = useCallback((newRate: number) => {
    const clamped = Math.max(0.80, Math.min(1.10, newRate));
    setRateState(clamped);
    rateRef.current = clamped;
    saveRatePreference(clamped);
    if (isPlayingRef.current) {
      playNextInQueue();
    }
  }, [playNextInQueue]);

  return {
    isPlaying,
    isPaused,
    currentChunk,
    totalChunks,
    availableVoices,
    selectedVoice,
    rate,
    hasArabicVoice: availableVoices.length > 0,
    showNoVoiceModal,
    setShowNoVoiceModal,
    play,
    pause,
    resume,
    stop,
    setVoice,
    changeRate,
    refreshVoices: populateVoices
  };
}
