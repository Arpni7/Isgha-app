import { Extraction, FatwaRecord, FactVerificationResult } from './types';

const API_BASE = '/api';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const errorText = await res.text();
    let msg = `الخدمة تواجه ضغطاً مؤقتاً (رمز ${res.status})، يرجى المحاولة بعد قليل.`;
    try {
      const parsed = JSON.parse(errorText);
      if (typeof parsed.error === 'string') {
        msg = parsed.error;
      } else if (parsed.error && typeof parsed.error === 'object') {
        if (parsed.error.message) {
          if (parsed.error.code === 503 || parsed.error.status === 'UNAVAILABLE') {
            msg = 'الخدمة تشهد طلباً مرتفعاً حالياً، يرجى إعادة المحاولة بعد بضع ثوانٍ.';
          } else {
            msg = parsed.error.message;
          }
        } else {
          msg = 'تعذر إتمام الطلب مؤقتاً، يرجى إعادة المحاولة.';
        }
      } else if (parsed.message) {
        msg = parsed.message;
      }
    } catch {
      if (errorText && errorText.length < 200) {
        msg = errorText;
      }
    }
    throw new Error(msg);
  }
  return res.json();
}

export async function getHistory(): Promise<{ extractions: Extraction[]; fatwas: FatwaRecord[] }> {
  const res = await fetch(`${API_BASE}/history`);
  return handleResponse(res);
}

export async function deleteExtraction(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/history/extraction/${id}`, { method: 'DELETE' });
  await handleResponse(res);
}

export async function deleteFatwa(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/history/fatwa/${id}`, { method: 'DELETE' });
  await handleResponse(res);
}

export async function extractFromText(text: string, language = 'ar'): Promise<Extraction> {
  const res = await fetch(`${API_BASE}/listen/text`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, language }),
  });
  return handleResponse(res);
}

export async function transcribeAudioOrVideo(
  fileBase64: string,
  mimeType: string,
  textFallback?: string
): Promise<string> {
  const res = await fetch(`${API_BASE}/listen/transcribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      file_base64: fileBase64,
      mime_type: mimeType,
      text_fallback: textFallback,
    }),
  });
  const data = await handleResponse<{ text: string }>(res);
  return data.text || '';
}

export async function extractFromFile(
  fileBase64: string,
  mimeType: string,
  filename: string,
  inputType: 'audio' | 'media' | 'doc' = 'audio',
  textFallback?: string
): Promise<Extraction> {
  const res = await fetch(`${API_BASE}/listen/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      file_base64: fileBase64,
      mime_type: mimeType,
      filename,
      input_type: inputType,
      text_fallback: textFallback
    }),
  });
  return handleResponse(res);
}

export async function translateExtraction(id: string, targetLanguage: string): Promise<Extraction> {
  const res = await fetch(`${API_BASE}/listen/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, target_language: targetLanguage }),
  });
  return handleResponse(res);
}

export async function listenTransform(
  extraction_id: string,
  mode: 'child' | 'newmuslim' | 'practical',
  language = 'ar'
): Promise<{ mode: string; title: string; content: string }> {
  const res = await fetch(`${API_BASE}/listen/transform`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ extraction_id, mode, language }),
  });
  return handleResponse(res);
}

export async function getExtraction(id: string): Promise<Extraction> {
  const res = await fetch(`${API_BASE}/listen/${id}`);
  return handleResponse(res);
}

export async function askFatwa(question: string, language = 'ar'): Promise<FatwaRecord> {
  const res = await fetch(`${API_BASE}/fatwa`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, language }),
  });
  return handleResponse(res);
}

export async function fatwaFollowup(
  fatwa_id: string,
  question: string,
  language = 'ar'
): Promise<{
  question: string;
  answer: string;
  response_type?: 'answer' | 'clarification' | 'referral';
  clarification_question?: string;
  referral_note?: string;
  verses?: any[];
  hadiths?: any[];
  scholar_references?: any[];
}> {
  const res = await fetch(`${API_BASE}/fatwa/followup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fatwa_id, question, language }),
  });
  return handleResponse(res);
}

export async function fatwaTransform(
  fatwa_id: string,
  mode: 'child' | 'newmuslim' | 'practical',
  language = 'ar'
): Promise<{ mode: string; title: string; content: string }> {
  const res = await fetch(`${API_BASE}/fatwa/transform`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fatwa_id, mode, language }),
  });
  return handleResponse(res);
}

export async function skepticTurn(
  fatwa_id?: string,
  user_message?: string,
  topic?: string,
  language = 'ar',
  history?: Array<{ sender: 'skeptic' | 'user'; text: string }>
): Promise<{
  skeptic_reply: string;
  reply?: string;
  source_name?: string;
  source_url?: string;
  evaluation?: any;
}> {
  const res = await fetch(`${API_BASE}/fatwa/skeptic`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fatwa_id, user_message, topic, language, history }),
  });
  return handleResponse(res);
}

export async function submitQuestionToScholar(
  question: string,
  contact_info?: string
): Promise<{
  success: boolean;
  message: string;
  request: {
    id: string;
    question: string;
    contact_info?: string;
    status: 'قيد المراجعة' | 'تم الرد';
    created_at: string;
  };
}> {
  const res = await fetch(`${API_BASE}/fatwa/submit-to-scholar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, contact_info }),
  });
  return handleResponse(res);
}

export async function getScholarRequests(): Promise<any[]> {
  const res = await fetch(`${API_BASE}/scholar-requests`);
  return handleResponse(res);
}


export async function skepticReset(fatwa_id?: string): Promise<void> {
  await fetch(`${API_BASE}/fatwa/skeptic/reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fatwa_id }),
  });
}

export async function verifyFact(
  statement: string,
  context?: string
): Promise<FactVerificationResult> {
  const res = await fetch(`${API_BASE}/verify-fact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ statement, context }),
  });
  return handleResponse(res);
}

export async function adaptBenefit(
  benefit: string,
  mode: string,
  title?: string,
  target_lang?: string
): Promise<{ mode: string; title: string; content: string }> {
  const res = await fetch(`${API_BASE}/benefit/adapt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ benefit, mode, title, target_lang }),
  });
  return handleResponse(res);
}

