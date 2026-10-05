/**
 * Arabic Text-to-Speech (TTS) Engine
 * Designed specifically for high-clarity Arabic recitation and Web Speech API stability.
 */

export interface VoiceOption {
  voice: SpeechSynthesisVoice;
  isSaudi: boolean;
  displayName: string;
}

const STORAGE_KEY_VOICE = 'isgha_tts_voice_uri';
const STORAGE_KEY_RATE = 'isgha_tts_rate';

/**
 * Wait for browser's SpeechSynthesis voices to be loaded via voiceschanged event.
 * Fixes the known Web Speech API bug where getVoices() returns [] on initial load.
 */
export function waitForVoicesLoaded(timeoutMs = 2500): Promise<SpeechSynthesisVoice[]> {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return Promise.resolve([]);
  }

  const immediate = window.speechSynthesis.getVoices();
  if (immediate && immediate.length > 0) {
    return Promise.resolve(immediate);
  }

  return new Promise((resolve) => {
    let resolved = false;

    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        const current = window.speechSynthesis.getVoices() || [];
        resolve(current);
      }
    }, timeoutMs);

    const onVoicesChanged = () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        window.speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged);
        const voices = window.speechSynthesis.getVoices() || [];
        resolve(voices);
      }
    };

    window.speechSynthesis.addEventListener('voiceschanged', onVoicesChanged);
  });
}

/**
 * Cleans text before sending to SpeechSynthesis:
 * - Removes Markdown formatting, brackets, page indicators, code blocks
 * - Collapses repeated symbols (??? -> ؟, !!! -> !)
 * - Preserves essential punctuation marks strictly (نقطة، فاصلة، علامة استفهام) for natural pauses
 */
export function cleanTextForSpeech(text: string): string {
  if (!text) return '';

  let cleaned = text;

  // Remove code blocks and inline code
  cleaned = cleaned.replace(/```[\s\S]*?```/g, ' ');
  cleaned = cleaned.replace(/`[^`]*`/g, ' ');

  // Remove Markdown links [text](url) -> text
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  // Remove Markdown headings (#, ##, etc.)
  cleaned = cleaned.replace(/^#{1,6}\s+/gm, '');

  // Remove Markdown bold/italic (*, **, _, __, ~~)
  cleaned = cleaned.replace(/[*_~]{1,3}/g, '');

  // Remove Markdown blockquotes and bullet points
  cleaned = cleaned.replace(/^[>*\-+•]\s+/gm, '');

  // Remove page indicators e.g. "ص 23", "صفحة 4", "ص: 12", "Page 4 of 10"
  cleaned = cleaned.replace(/(?:^|\s)(?:ص\s*:\s*\d+|صفحة\s*\d+|ص\s*\d+|page\s*\d+(?:\s*of\s*\d+)?)(?=\s|$|[.,،؛])/gi, ' ');

  // Remove footnote marks like [1], (2), [أ], etc.
  cleaned = cleaned.replace(/\[\d+\]|\(\d+\)|\[\p{L}\]/gu, '');

  // Remove divider lines (---, ===, ___)
  cleaned = cleaned.replace(/^[-=_]{3,}\s*$/gm, '');

  // Normalize repeated punctuation to a single pause mark
  cleaned = cleaned.replace(/\.{2,}/g, '.');
  cleaned = cleaned.replace(/[؟?]{2,}/g, '؟');
  cleaned = cleaned.replace(/!{2,}/g, '!');
  cleaned = cleaned.replace(/[،,]{2,}/g, '،');

  // Replace colons with comma pause
  cleaned = cleaned.replace(/:\s+/g, '، ');

  // Remove decorative brackets around Quranic verses ﴿ ﴾ or « » into spoken text
  cleaned = cleaned.replace(/[﴿»«﴾"']/g, ' ');

  // Collapse multiple whitespaces and excessive line breaks
  cleaned = cleaned.replace(/\r\n/g, '\n');
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  cleaned = cleaned.replace(/[ \t]{2,}/g, ' ');

  return cleaned.trim();
}

/**
 * Splits text into short, natural sentence chunks (< 140 characters):
 * Prevents browser speech synthesis cutoff bug and powers sequential queue execution.
 */
export function splitTextIntoChunks(text: string, maxLen = 140): string[] {
  const cleaned = cleanTextForSpeech(text);
  if (!cleaned) return [];

  // Split along sentence endings or natural pauses (. ، ؛ ؟ ! \n)
  const rawParts = cleaned.split(/(?<=[.،؛؟!؟\n])/);
  const chunks: string[] = [];
  let currentChunk = '';

  for (const part of rawParts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    if (currentChunk.length + trimmed.length + 1 <= maxLen) {
      currentChunk = currentChunk ? `${currentChunk} ${trimmed}` : trimmed;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk);
      }
      if (trimmed.length > maxLen) {
        // Break long segment by spaces
        const words = trimmed.split(/\s+/);
        let subChunk = '';
        for (const word of words) {
          if (subChunk.length + word.length + 1 <= maxLen) {
            subChunk = subChunk ? `${subChunk} ${word}` : word;
          } else {
            if (subChunk) chunks.push(subChunk);
            subChunk = word;
          }
        }
        if (subChunk) currentChunk = subChunk;
      } else {
        currentChunk = trimmed;
      }
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
}

/**
 * Discover, filter and prioritize Arabic voices:
 * Filters strictly by lang === 'ar-SA' first, then lang.startsWith('ar').
 * Prints available voices to console for easy diagnostics.
 */
export function getArabicVoices(voicesList?: SpeechSynthesisVoice[]): VoiceOption[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return [];
  }

  const allVoices = voicesList && voicesList.length > 0
    ? voicesList
    : window.speechSynthesis.getVoices() || [];

  // Filter Level 1 & 2: strictly Arabic voices only
  const arabicVoices = allVoices.filter((v) => {
    const lang = (v.lang || '').replace('_', '-').toLowerCase();
    const name = (v.name || '').toLowerCase();
    return (
      lang === 'ar-sa' ||
      lang.startsWith('ar') ||
      name.includes('arabic') ||
      name.includes('saudi') ||
      name.includes('عربي') ||
      name.includes('السعودية') ||
      name.includes('majed') ||
      name.includes('naayf') ||
      name.includes('tarik') ||
      name.includes('zeina') ||
      name.includes('laila') ||
      name.includes('maged')
    );
  });

  // Diagnostic logging to console as explicitly requested
  if (arabicVoices.length > 0) {
    console.log(
      '[TTS Diagnostic] Available Arabic voices on device:',
      arabicVoices.map((v) => `${v.name} (${v.lang})`)
    );
  } else if (allVoices.length > 0) {
    console.warn(
      '[TTS Diagnostic] No Arabic voice found on device. Total system voices:',
      allVoices.length
    );
  }

  return arabicVoices.map((v) => {
    const lang = (v.lang || '').replace('_', '-').toLowerCase();
    const name = (v.name || '').toLowerCase();
    const isSaudi =
      lang === 'ar-sa' ||
      name.includes('saudi') ||
      name.includes('السعودية') ||
      name.includes('naayf') ||
      name.includes('maged') ||
      name.includes('tarik');

    let displayName = v.name;
    if (isSaudi) {
      displayName = `🇸🇦 ${v.name} (عربي - السعودية)`;
    } else {
      const region = v.lang.replace(/^ar[-_]?/i, '').toUpperCase() || 'عربي';
      displayName = `🌐 ${v.name} (${region})`;
    }

    return {
      voice: v,
      isSaudi,
      displayName
    };
  }).sort((a, b) => {
    // Saudi voices first, then others
    if (a.isSaudi && !b.isSaudi) return -1;
    if (!a.isSaudi && b.isSaudi) return 1;
    return a.displayName.localeCompare(b.displayName);
  });
}

/**
 * Pick best available Saudi/Arabic voice, honoring user saved preference.
 * Guaranteed never to return a foreign/English voice.
 */
export function selectBestVoice(available: VoiceOption[]): SpeechSynthesisVoice | null {
  if (available.length === 0) return null;

  // 1. Check user preference from localStorage
  const savedUri = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_VOICE) : null;
  if (savedUri) {
    const matched = available.find((v) => v.voice.voiceURI === savedUri);
    if (matched) return matched.voice;
  }

  // 2. Strict Priority: ar-SA first
  const saudiVoice = available.find((v) => {
    const lang = (v.voice.lang || '').replace('_', '-').toLowerCase();
    return lang === 'ar-sa' || v.isSaudi;
  });
  if (saudiVoice) return saudiVoice.voice;

  // 3. Fallback: First available Arabic voice
  return available[0].voice;
}

export function saveVoicePreference(voiceUri: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_VOICE, voiceUri);
  }
}

/**
 * Rate strictly adjusted between 0.85 and 1.0 (default 0.90 for natural cadence)
 */
export function getSavedRatePreference(): number {
  if (typeof window === 'undefined') return 0.90;
  const saved = localStorage.getItem(STORAGE_KEY_RATE);
  if (saved) {
    const val = parseFloat(saved);
    if (!isNaN(val) && val >= 0.80 && val <= 1.10) return val;
  }
  return 0.90; // Natural, steady, clear default
}

export function saveRatePreference(rate: number): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_RATE, rate.toString());
  }
}
