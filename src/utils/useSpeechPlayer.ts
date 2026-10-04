import { useState, useEffect, useRef, useCallback } from 'react';
import {
  VoiceOption,
  getArabicVoices,
  selectBestVoice,
  splitTextIntoChunks,
  saveVoicePreference,
  getSavedRatePreference,
  saveRatePreference
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
  play: (text: string) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  setVoice: (voiceUri: string) => void;
  changeRate: (newRate: number) => void;
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

  // Refs for tracking playback state across callbacks
  const isPlayingRef = useRef(false);
  const chunksRef = useRef<string[]>([]);
  const chunkIndexRef = useRef(0);
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Sync available voices on mount and on voiceschanged event
  const refreshVoices = useCallback(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const arabic = getArabicVoices();
    setAvailableVoices(arabic);
    if (arabic.length > 0) {
      const best = selectBestVoice(arabic);
      setSelectedVoice(best);
    }
  }, []);

  useEffect(() => {
    refreshVoices();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = refreshVoices;
      // Some browsers delay voice population
      const timer = setTimeout(refreshVoices, 300);
      return () => {
        clearTimeout(timer);
        if (window.speechSynthesis) {
          window.speechSynthesis.onvoiceschanged = null;
        }
      };
    }
  }, [refreshVoices]);

  const stop = useCallback(() => {
    isPlayingRef.current = false;
    chunkIndexRef.current = 0;
    chunksRef.current = [];
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentChunk(0);
    setTotalChunks(0);
  }, []);

  const speakChunk = useCallback((index: number) => {
    if (!isPlayingRef.current) return;
    const chunks = chunksRef.current;
    if (index >= chunks.length) {
      stop();
      return;
    }

    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();

    const chunkText = chunks[index];
    const utterance = new SpeechSynthesisUtterance(chunkText);

    if (selectedVoice) {
      utterance.voice = selectedVoice;
      utterance.lang = selectedVoice.lang || 'ar-SA';
    } else {
      utterance.lang = 'ar-SA';
    }

    utterance.rate = rate;
    utterance.pitch = 1.0;

    utterance.onend = () => {
      if (isPlayingRef.current) {
        chunkIndexRef.current = index + 1;
        setCurrentChunk(index + 1);
        speakChunk(index + 1);
      }
    };

    utterance.onerror = (e) => {
      // If manually cancelled/interrupted, ignore error
      if (e.error === 'interrupted' || e.error === 'canceled') return;
      console.warn('TTS utterance notice:', e.error);
      if (isPlayingRef.current) {
        chunkIndexRef.current = index + 1;
        setCurrentChunk(index + 1);
        speakChunk(index + 1);
      }
    };

    activeUtteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [selectedVoice, rate, stop]);

  const play = useCallback((text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setShowNoVoiceModal(true);
      return;
    }

    // Check if Arabic voices are available
    const arabic = getArabicVoices();
    if (arabic.length === 0) {
      setShowNoVoiceModal(true);
      return;
    }

    const chunks = splitTextIntoChunks(text);
    if (chunks.length === 0) return;

    // Reset previous
    stop();

    chunksRef.current = chunks;
    chunkIndexRef.current = 0;
    isPlayingRef.current = true;
    setIsPlaying(true);
    setIsPaused(false);
    setCurrentChunk(0);
    setTotalChunks(chunks.length);

    speakChunk(0);
  }, [stop, speakChunk]);

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
      saveVoicePreference(voiceUri);
      // If currently playing, restart chunk with new voice
      if (isPlayingRef.current) {
        speakChunk(chunkIndexRef.current);
      }
    }
  }, [availableVoices, speakChunk]);

  const changeRate = useCallback((newRate: number) => {
    setRateState(newRate);
    saveRatePreference(newRate);
    if (isPlayingRef.current) {
      speakChunk(chunkIndexRef.current);
    }
  }, [speakChunk]);

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
    changeRate
  };
}
