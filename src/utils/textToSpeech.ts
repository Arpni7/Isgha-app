/**
 * Arabic Text-to-Speech (TTS) Utility & Chunking Engine
 * Tailored for authentic Arabic recitation and natural speech cadence
 */

export interface VoiceOption {
  voice: SpeechSynthesisVoice;
  isSaudi: boolean;
  displayName: string;
}

const STORAGE_KEY_VOICE = 'isgha_tts_voice_uri';
const STORAGE_KEY_RATE = 'isgha_tts_rate';

/**
 * 1. Cleans text before feeding to SpeechSynthesis to eliminate glitchy pronunciations:
 * - Removes markdown syntax, brackets, page indicators, code blocks
 * - Collapses repeated punctuation (e.g. "???" -> "؟", "..." -> ".")
 * - Preserves essential pause marks (، . ؛ ؟ !)
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

  // Remove Markdown blockquotes and list bullets
  cleaned = cleaned.replace(/^[>*\-+•]\s+/gm, '');

  // Remove page indicators e.g. "ص 23", "صفحة 4", "ص: 12", "Page 4 of 10"
  cleaned = cleaned.replace(/(?:^|\s)(?:ص\s*:\s*\d+|صفحة\s*\d+|ص\s*\d+|page\s*\d+(?:\s*of\s*\d+)?)(?=\s|$|[.,،؛])/gi, ' ');

  // Remove footnote marks like [1], (2), [أ], etc.
  cleaned = cleaned.replace(/\[\d+\]|\(\d+\)|\[\p{L}\]/gu, '');

  // Remove horizontal divider lines (---, ===, ___)
  cleaned = cleaned.replace(/^[-=_]{3,}\s*$/gm, '');

  // Replace repeated punctuation with a single instance
  cleaned = cleaned.replace(/\.{2,}/g, '.');
  cleaned = cleaned.replace(/[؟?]{2,}/g, '؟');
  cleaned = cleaned.replace(/!{2,}/g, '!');
  cleaned = cleaned.replace(/[،,]{2,}/g, '،');

  // Replace colons with comma pause for smoother auditory transition
  cleaned = cleaned.replace(/:\s+/g, '، ');

  // Remove decorative brackets around Quranic verses ﴿ ﴾ or « » into clear spoken text
  cleaned = cleaned.replace(/[﴿»«﴾"']/g, ' ');

  // Collapse multiple whitespaces and excessive line breaks
  cleaned = cleaned.replace(/\r\n/g, '\n');
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  cleaned = cleaned.replace(/[ \t]{2,}/g, ' ');

  return cleaned.trim();
}

/**
 * 2. Splits text into short, natural sentence chunks (< 160 characters):
 * Prevents browser speech synthesis cutoff bug (Chrome/Safari stop after ~15s or 200 chars).
 */
export function splitTextIntoChunks(text: string, maxLen = 160): string[] {
  const cleaned = cleanTextForSpeech(text);
  if (!cleaned) return [];

  // Split along sentence endings or natural pauses
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
        // Break excessively long segment by spaces
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
 * 3. Discover, categorize and prioritize Arabic voices:
 * Highest priority: ar-SA (Saudi Arabic).
 * Fallback priority: other Arabic dialects (ar-EG, ar-AE, ar-KW, etc.).
 * Strictly excludes non-Arabic voices.
 */
export function getArabicVoices(): VoiceOption[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return [];
  }

  const allVoices = window.speechSynthesis.getVoices();

  const arabicVoices = allVoices.filter((v) => {
    const lang = (v.lang || '').toLowerCase();
    const name = (v.name || '').toLowerCase();
    return (
      lang.startsWith('ar') ||
      lang.includes('arabic') ||
      name.includes('arabic') ||
      name.includes('saudi') ||
      name.includes('majed') ||
      name.includes('naayf') ||
      name.includes('tarik') ||
      name.includes('zeina') ||
      name.includes('laila') ||
      name.includes('maged')
    );
  });

  return arabicVoices.map((v) => {
    const lang = (v.lang || '').toLowerCase();
    const name = (v.name || '').toLowerCase();
    const isSaudi =
      lang === 'ar-sa' ||
      lang.startsWith('ar-sa') ||
      name.includes('saudi') ||
      name.includes('السعودية') ||
      name.includes('naayf') ||
      name.includes('maged') ||
      name.includes('tarik');

    // Clean, readable label
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
    // Saudi voices first, then alphabetical
    if (a.isSaudi && !b.isSaudi) return -1;
    if (!a.isSaudi && b.isSaudi) return 1;
    return a.displayName.localeCompare(b.displayName);
  });
}

/**
 * 4. Pick best available Saudi/Arabic voice, honoring user saved preference
 */
export function selectBestVoice(available: VoiceOption[]): SpeechSynthesisVoice | null {
  if (available.length === 0) return null;

  const savedUri = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_VOICE) : null;
  if (savedUri) {
    const matched = available.find((v) => v.voice.voiceURI === savedUri);
    if (matched) return matched.voice;
  }

  // Find first Saudi voice
  const saudiVoice = available.find((v) => v.isSaudi);
  if (saudiVoice) return saudiVoice.voice;

  // Otherwise pick first Arabic voice
  return available[0].voice;
}

export function saveVoicePreference(voiceUri: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_VOICE, voiceUri);
  }
}

export function getSavedRatePreference(): number {
  if (typeof window === 'undefined') return 1.0;
  const saved = localStorage.getItem(STORAGE_KEY_RATE);
  if (saved) {
    const val = parseFloat(saved);
    if (!isNaN(val) && val >= 0.7 && val <= 1.5) return val;
  }
  return 1.0; // Natural balanced default
}

export function saveRatePreference(rate: number): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_RATE, rate.toString());
  }
}
