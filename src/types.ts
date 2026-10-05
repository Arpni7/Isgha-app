export interface QuranVerse {
  arabic: string;
  reference: string;
}

export interface HadithItem {
  text: string;
  source: string;
  narrator: string;
  grade?: string;
}

export interface ScholarRef {
  scholar: string;
  quote: string;
  source: string;
}

export interface Extraction {
  id: string;
  title: string;
  summary: string;
  benefits: string[];
  verses: QuranVerse[];
  hadiths: HadithItem[];
  sources: string[];
  created_at: string;
  original_text?: string;
  language?: string;
  transformations?: Record<string, string>;
}

export interface FatwaFollowup {
  question: string;
  answer: string;
  response_type?: 'answer' | 'clarification' | 'referral';
  clarification_question?: string;
  referral_note?: string;
}

export interface FatwaRecord {
  id: string;
  question: string;
  answer: string;
  verses: QuranVerse[];
  hadiths: HadithItem[];
  scholar_references: ScholarRef[];
  created_at: string;
  language?: string;
  unavailable_in_knowledge_base?: boolean;
  followups?: FatwaFollowup[];
  transformations?: Record<string, string>;
  skepticChat?: Array<{
    sender: 'skeptic' | 'user';
    text: string;
    feedback?: string;
    rating?: string;
    strengths?: string[];
    missing_points?: string[];
    hint?: string;
  }>;
}

export interface ScholarQuestionRequest {
  id: string;
  question: string;
  contact_info?: string;
  status: 'قيد المراجعة' | 'تم الرد';
  created_at: string;
}

export type SupportedLang = 'ar' | 'en' | 'fr' | 'ur' | 'tr' | 'id';

export interface LanguageOption {
  code: SupportedLang;
  label: string;
  nativeLabel: string;
  isRTL: boolean;
}
