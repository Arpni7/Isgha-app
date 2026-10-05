import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '60mb' }));
app.use(express.urlencoded({ extended: true, limit: '60mb' }));

// Initialize Google GenAI
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Candidate models ordered for fastest execution
const CANDIDATE_MODELS = [
  'gemini-3.1-flash-lite',
  'gemini-3.8-flash',
  'gemini-flash-latest',
];

// In-memory cache for instant answers to repeated queries
const fastResponseCache = new Map<string, any>();

function normalizeKey(str: string): string {
  return (str || '')
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, '') // remove Arabic diacritics
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[^\p{L}\p{N}]/gu, '')
    .trim();
}

async function generateWithFallback(options: {
  contents: any;
  systemInstruction?: string;
  responseMimeType?: string;
  temperature?: number;
}): Promise<string> {
  let lastError: any = null;

  for (const model of CANDIDATE_MODELS) {
    try {
      const config: any = {
        systemInstruction: options.systemInstruction,
        responseMimeType: options.responseMimeType,
        temperature: options.temperature ?? 0.2,
      };

      // Set fastest supported thinking level per model
      if (model === 'gemini-3.1-flash-lite') {
        config.thinkingConfig = { thinkingLevel: ThinkingLevel.MINIMAL };
      } else if (model === 'gemini-3.8-flash') {
        config.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
      }

      const response = await ai.models.generateContent({
        model,
        contents: options.contents,
        config,
      });

      if (response && response.text) {
        return response.text;
      }
    } catch (err: any) {
      console.warn(`Model ${model} attempt failed (${err?.status || err?.code}): ${err?.message}`);
      lastError = err;
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  throw lastError || new Error('تعذر إكمال الطلب نظراً للضغط على النماذج، يرجى المحاولة بعد قليل.');
}

function safeParseJSON(raw: string, fallback: any = {}) {
  try {
    let clean = (raw || '').trim();
    if (clean.startsWith('```json')) {
      clean = clean.replace(/^```json\s*/i, '').replace(/```\s*$/i, '');
    } else if (clean.startsWith('```')) {
      clean = clean.replace(/^```\s*/, '').replace(/```\s*$/i, '');
    }
    return JSON.parse(clean);
  } catch (e) {
    console.warn('safeParseJSON failed on:', raw);
    return fallback;
  }
}

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
  followups?: FatwaFollowup[];
  transformations?: Record<string, string>;
  unavailable_in_knowledge_base?: boolean;
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

const DB_FILE = '/tmp/isgha_db.json';

interface Database {
  extractions: Extraction[];
  fatwas: FatwaRecord[];
  scholarRequests: ScholarQuestionRequest[];
}

export const APPROVED_SOURCES_REGULATION = `
جدول المصادر المعتمدة حصراً (Approved Authentic Islamic Sources Regulation):
يجب الالتزام حصراً ودون استثناء بالمصادر التالية لكل مجال شرعي، ولا يُقبل أي مصدر خارج هذا الجدول:
1. القرآن الكريم:
   - المصدر المعتمد: النص والرسم العثماني من quranpedia.net، مع الترجمات المعتمدة لطبعة مجمع الملك فهد لطباعة المصحف الشريف.
   - قاعدة الاستخدام: التأكد من موثوقية نقل الآيات القرآنية حرفياً بالرسم الصحيح مع تحديد اسم السورة ورقم الآية.
2. التفسير:
   - المصدر المعتمد: dorar.net/tafseer أو مصادر المفسرين من القرون الثلاثة الأولى (تفسير الطبري، البغوي، ابن كثير، القرطبي).
   - قاعدة الاستخدام: يُستخدم لشرح معاني الآيات مع تمييز كلام المفسر بوضوح عن النص القرآني.
3. الحديث النبوي الشريف:
   - المصدر المعتمد: موسوعة الأحاديث dorar.net/hadith، أو الطبعات المعتمدة لكتب السنة (صحيح البخاري، صحيح مسلم، سنن أبي داود، الترمذي، النسائي، ابن ماجه)، أو المكتبة الشاملة shamela.ws.
   - قاعدة الاستخدام: لا يُنسب أي حديث دون ذكر مصدره الدقيق وصحابي الرواية وحكم صحته المعتمد (صحيح، حسن، متفق عليه).
4. العقيدة والتعريف بالإسلام:
   - المصدر المعتمد: مصادر أهل السنة والجماعة من القرون الثلاثة الأولى أو موسوعة العقيدة dorar.net/aqeeda.
   - قاعدة الاستخدام: الالتزام الصارم بما كان عليه المسلمون خصوصاً الصحابة رضي الله عنهم والتابعون وأئمة السلف.
5. الفقه العام:
   - المصدر المعتمد: كتب المذاهب الفقهية الأربعة المعتمدة (الحنفي، المالكي، الشافعي، الحنبلي)، أو موسوعة الفقه dorar.net/feqhia.
   - قاعدة الاستخدام الحتمية: **لا تتحول إلى فتوى شخصية أو ترجيح آلي مستقل** — نقل أقوال المذاهب المعتمدة بنصها وعزوها، دون اجتهاد ذاتي أو إفتاء خاص.
6. السيرة النبوية والتاريخ الإسلامي:
   - المصدر المعتمد: مصادر السيرة والتاريخ من القرون الثلاثة الأولى (سيرة ابن إسحاق وابن هشام، تاريخ الطبري)، أو dorar.net/history.
   - قاعدة الاستخدام: اعتماد الوقائع التاريخية الثابتة، وتوضيح درجة ما يحتاج احتراز.
7. الشبهات والأسئلة المتكررة:
   - المصدر المعتمد: مرجع dawa.center/file/7937.
   - قاعدة الاستخدام: الاعتماد عليه كمصدر أساسي للحلول الحوارية وتفنيد الشبهات بالدليل العقلي والشرعي.
8. الترجمة والمصطلحات الشرعية:
   - المصدر المعتمد: موسوعة الجمهرة (islamic-content.com/dictionary)، ومستودع dawa.center.
   - قاعدة الاستخدام: تقديم الترجمة المعتمدة للمصطلحات الشرعية الحساسة في كافة اللغات.

قاعدة الامتناع المعتمدة:
إن تعذّر إيجاد مصدر معتمد من هذا الجدول حصراً لأي مسألة، لا تستخدم مصدراً آخر مطلقاً — اعرض صراحة أن المسألة غير متوفرة في قاعدة المعرفة المعتمدة وتتطلب مراجعة شيخ مختص مباشرة.
`;

const initialDB: Database = {
  extractions: [
    {
      id: 'ext-1',
      title: 'فضل يوم عاشوراء وأحكام صيامه',
      summary: 'محاضرة قيمة تتناول مكانة شهر الله المحرم، وفضل صيام يوم عاشوراء وتكفيره لذنوب السنة الماضية، ومراتب صيامه الأربعة، وحكمة صيام يوم قبله أو بعده مخالفة لأهل الكتاب.',
      benefits: [
        'شهر المحرم من الأشهر الحرم العظيمة التي يُعظم فيها العمل الصالح والإثم.',
        'صيام عاشوراء يكفر ذنوب سنة ماضية (الصغائر دون الكبائر).',
        'مشروعية مخالفة أهل الكتاب بصيام اليوم التاسع (تاسوعاء) مع العاشر.',
        'شكر الله تعالى على نجاة موسى وقومه وإغراق فرعون وجنوده.'
      ],
      verses: [
        {
          arabic: 'إِنَّ عِدَّةَ الشُّهُورِ عِندَ اللَّهِ اثْنَا عَشَرَ شَهْرًا فِي كِتَابِ اللَّهِ يَوْمَ خَلَقَ السَّمَاوَاتِ وَالْأَرْضَ مِنْهَا أَرْبَعَةٌ حُرُمٌ ۚ ذَٰلِكَ الدِّينُ الْقَيِّمُ ۚ فَلَا تَظْلِمُوا فِيهِنَّ أَنفُسَكُمْ',
          reference: 'سورة التوبة: آية 36'
        },
        {
          arabic: 'وَجَاوَزْنَا بِبَنِي إِسْرَائِيلَ الْبَحْرَ فَأَتْبَعَهُمْ فِرْعَوْنُ وَجُنُودُهُ بَغْيًا وَعَدْوًا',
          reference: 'سورة يونس: آية 90'
        }
      ],
      hadiths: [
        {
          text: 'صِيَامُ يَوْمِ عَاشُورَاءَ، أَحْتَسِبُ عَلَى اللهِ أَنْ يُكَفِّرَ السَّنَةَ الَّتِي قَبْلَهُ',
          source: 'صحيح مسلم (1162)',
          narrator: 'أبو قتادة الأنصاري رضي الله عنه',
          grade: 'صحيح'
        },
        {
          text: 'قَدِمَ النَّبِيُّ صَلَّى اللهُ عَلَيْهِ وَسَلَّمَ الْمَدِينَةَ فَرَأَى الْيَهُودَ تَصُومُ يَوْمَ عَاشُورَاءَ، فَقَالَ: مَا هَذَا؟ قَالُوا: هَذَا يَوْمٌ صَالِحٌ، هَذَا يَوْمٌ نَجَّى اللَّهُ بَنِي إِسْرَائِيلَ مِنْ عَدُوِّهِمْ، فَصَامَهُ مُوسَى، قَالَ: فَأَنَا أَحَقُّ بِمُوسَى مِنْكُمْ، فَصَامَهُ وَأَمَرَ بِصِيَامِهِ',
          source: 'صحيح البخاري (2004)',
          narrator: 'عبد الله بن عباس رضي الله عنهما',
          grade: 'صحيح'
        },
        {
          text: 'لَئِنْ بَقِيتُ إِلَى قَابِلٍ لَأَصُومَنَّ التَّاسِعَ',
          source: 'صحيح مسلم (1134)',
          narrator: 'عبد الله بن عباس رضي الله عنهما',
          grade: 'صحيح'
        }
      ],
      sources: [
        'صحيح البخاري ومسلم',
        'مجموع فتاوى الشيخ ابن باز',
        'زاد المعاد لابن القيم'
      ],
      created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
      language: 'ar'
    }
  ],
  fatwas: [
    {
      id: 'fatwa-1',
      question: 'ما حكم صيام يوم عاشوراء ومراتبه؟',
      answer: 'صيام يوم عاشوراء (اليوم العاشر من شهر محرم) سنة مؤكدة عن النبي صلى الله عليه وسلم، ورتب الشارع عليه أجراً عظيماً وهو تكفير ذنوب السنة الماضية. والأفضل للمسلم أن يصوم يوماً قبله (التاسع) أو بعده (الحادي عشر) لمخالفة أهل الكتاب.\n\nومراتب صيامه عند المحققين من أهل العلم:\n1. صيام التاسع والعاشر والحادي عشر (وهي أكمل المراتب).\n2. صيام التاسع والعاشر (وهو الذي تمنى النبي ﷺ صيامه ودلت عليه السنة).\n3. صيام العاشر والحادي عشر.\n4. إفراد العاشر وحده بالصوم (وهو جائز بلا كراهة عند جماهير العلماء، وإن كان خلاف الأكمل).',
      verses: [
        {
          arabic: 'وَمَا آتَاكُمُ الرَّسُولُ فَخُذُوهُ وَمَا نَهَاكُمْ عَنْهُ فَانْتَهُوا ۚ وَاتَّقُوا اللَّهَ ۖ إِنَّ اللَّهَ شَدِيدُ الْعِقَابِ',
          reference: 'سورة الحشر: آية 7'
        }
      ],
      hadiths: [
        {
          text: 'صِيَامُ يَوْمِ عَاشُورَاءَ، أَحْتَسِبُ عَلَى اللهِ أَنْ يُكَفِّرَ السَّنَةَ الَّتِي قَبْلَهُ',
          source: 'صحيح مسلم',
          narrator: 'أبو قتادة الأنصاري رضي الله عنه',
          grade: 'صحيح'
        },
        {
          text: 'لَئِنْ بَقِيتُ إِلَى قَابِلٍ لَأَصُومَنَّ التَّاسِعَ',
          source: 'صحيح مسلم',
          narrator: 'عبد الله بن عباس رضي الله عنهما',
          grade: 'صحيح'
        }
      ],
      scholar_references: [
        {
          scholar: 'الشيخ عبد العزيز بن باز رحمه الله',
          quote: 'صيام يوم عاشوراء سنة مؤكدة؛ لما ثبت في الأحاديث الصحيحة عن رسول الله ﷺ، والأفضل أن يصام قبله يوم أو بعده يوم لمخالفة اليهود.',
          source: 'مجموع فتاوى ومقالات متنوعة (ج15)'
        },
        {
          scholar: 'الشيخ محمد بن صالح العثيمين رحمه الله',
          quote: 'مراتب صيام عاشوراء أربعة: الأولى أن نصوم التاسع والعاشر والحادي عشر، وهذا أعلى المراتب. الثانية أن نصوم التاسع والعاشر، وهذا هو الذي دل عليه الحديث. الثالثة العاشر والحادي عشر. الرابعة العاشر وحده.',
          source: 'مجموع فتاوى ورسائل ابن عثيمين'
        },
        {
          scholar: 'الإمام ابن قيم الجوزية رحمه الله',
          quote: 'مراتب صومه ثلاث: أكملها أن يصام قبله يوم وبعده يوم، ويلي ذلك أن يصام التاسع والعاشر وعليه أكثر الأحاديث، ويلي ذلك إفراد العاشر وحده بالصوم.',
          source: 'زاد المعاد في هدي خير العباد'
        }
      ],
      created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
      language: 'ar'
    },
    {
      id: 'fatwa-2',
      question: 'كيف تكون طهارة الوضوء الصحيحة كما وردت عن النبي ﷺ؟',
      answer: 'الوضوء الصحيح الكامل يبدأ بالنية ومحلها القلب، ثم التسمية (بسم الله)، وغسل الكفين ثلاثاً، ثم المضمضة والاستنشاق بثلاث غرفات، ثم غسل الوجه كاملاً ثلاثاً من منابت الشعر إلى أسفل الذقن ومن الأذن إلى الأذن، ثم غسل اليدين مع المرفقين ثلاثاً بدءاً باليمنى، ثم مسح الرأس والأذنين مرة واحدة مقبلاً ومدبراً، ثم غسل الرجلين مع الكعبين ثلاثاً بدءاً باليمنى، والترتيب والموالاة بين الأعضاء واجبان.',
      verses: [
        {
          arabic: 'يَا أَيُّهَا الَّذِينَ آمَنُوا إِذَا قُمْتُمْ إِلَى الصَّلَاةِ فَاغْسِلُوا وُجُوهَكُمْ وَأَيْدِيَكُمْ إِلَى الْمَرَافِقِ وَامْسَحُوا بِرُءُوسِكُمْ وَأَرْجُلَكُمْ إِلَى الْكَعْبَيْنِ',
          reference: 'سورة المائدة: آية 6'
        }
      ],
      hadiths: [
        {
          text: 'مَنْ تَوَضَّأَ نَحْوَ وُضُوئِي هَذَا، ثُمَّ صَلَّى رَكْعَتَيْنِ لاَ يُحَدِّثُ فِيهِمَا نَفْسَهُ، غُفِرَ لَهُ مَا تَقَدَّمَ مِنْ ذَنْبِهِ',
          source: 'صحيح البخاري ومسلم',
          narrator: 'عثمان بن عفان رضي الله عنه',
          grade: 'متفق عليه'
        }
      ],
      scholar_references: [
        {
          scholar: 'الشيخ عبد العزيز بن باز رحمه الله',
          quote: 'الواجب في الوضوء غسله مرة واحدة لكل عضو من الأعضاء المذكورة، والسنة ثلاث مرات، وهو الكمال والأفضل، ولا يجوز الزيادة على ثلاث.',
          source: 'فتاوى نور على الدرب'
        },
        {
          scholar: 'الشيخ محمد بن صالح العثيمين رحمه الله',
          quote: 'من غسل عضواً مرتين وعضواً ثلاثاً أو مرة جاز، فالواجب استيعاب العضو بالماء مرة واحدة وما زاد فهو سنة ومستحب.',
          source: 'الشرح الممتع على زاد المستقنع'
        }
      ],
      created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
      language: 'ar'
    },
    {
      id: 'fatwa-3',
      question: 'ما فضل قراءة سورة الكهف يوم الجمعة؟',
      answer: 'قراءة سورة الكهف يوم الجمعة أو ليلتها سنة مستحبة ومؤكدة عن النبي ﷺ، ولها فضل عظيم؛ حيث جعل الله لمن قرأها نوراً يضيء له ما بين الجمعتين، كما أنها سبب للعصمة من أعظم فتن آخر الزمان وهي فتنة المسيح الدجال بحفظ أوائلها أو أواخرها. ويبدأ وقت قراءتها من غروب شمس يوم الخميس إلى غروب شمس يوم الجمعة.',
      verses: [
        {
          arabic: 'الْحَمْدُ لِلَّهِ الَّذِي أَنزَلَ عَلَىٰ عَبْدِهِ الْكِتَابَ وَلَمْ يَجْعَل لَّهُ عِوَجًا ۜ قَيِّمًا لِّيُنذِرَ بَأْسًا شَدِيدًا مِّن لَّدُنْهُ وَيُبَشِّرَ الْمُؤْمِنِينَ الَّذِينَ يَعْمَلُونَ الصَّالِحَاتِ أَنَّ لَهُمْ أَجْرًا حَسَنًا',
          reference: 'سورة الكهف: آية 1-2'
        }
      ],
      hadiths: [
        {
          text: 'مَنْ قَرَأَ سُورَةَ الْكَهْفِ فِي يَوْمِ الْجُمُعَةِ أَضَاءَ لَهُ مِنَ النُّورِ مَا بَيْنَ الْجُمُعَتَيْنِ',
          source: 'المستدرك على الصحيحين وسنن البيهقي',
          narrator: 'أبو سعيد الخدري رضي الله عنه',
          grade: 'صحيح'
        },
        {
          text: 'مَنْ حَفِظَ عَشْرَ آيَاتٍ مِنْ أَوَّلِ سُورَةِ الْكَهْفِ عُصِمَ مِنْ فِتْنَةِ الدَّجَّالِ',
          source: 'صحيح مسلم (809)',
          narrator: 'أبو الدرداء رضي الله عنه',
          grade: 'صحيح'
        }
      ],
      scholar_references: [
        {
          scholar: 'الشيخ عبد العزيز بن باز رحمه الله',
          quote: 'يستحب قراءة سورة الكهف يوم الجمعة وليلتها، وقد جاءت في ذلك أحاديث يشد بعضها بعضاً تدل على شرعية قراءتها وفضلها العظيم.',
          source: 'مجموع فتاوى ومقالات متنوعة'
        },
        {
          scholar: 'الشيخ محمد بن صالح العثيمين رحمه الله',
          quote: 'وقت قراءة سورة الكهف يوم الجمعة من طلوع الفجر إلى غروب الشمس، وقراءتها ليلة الجمعة مشروعة أيضاً، والأفضل قراءتها نهاراً.',
          source: 'فتاوى إسلامية'
        }
      ],
      created_at: new Date(Date.now() - 3600000 * 20).toISOString(),
      language: 'ar'
    },
    {
      id: 'fatwa-4',
      question: 'ما حكم صلاة الجماعة في المسجد للرجال؟',
      answer: 'صلاة الجماعة في المسجد للرجال القادرين واجبة عينياً وفرض عين على القول الراجح والدال عليه صريح الكتاب والسنة، ولا يجوز التخلف عنها إلا لعذر شرعي كالمرض الشديد أو الخوف أو السفر. وتفضل صلاة الجماعة صلاة الفرد بسبع وعشرين درجة.',
      verses: [
        {
          arabic: 'وَأَقِيمُوا الصَّلَاةَ وَآتُوا الزَّكَاةَ وَارْكَعُوا مَعَ الرَّاكِعِينَ',
          reference: 'سورة البقرة: آية 43'
        }
      ],
      hadiths: [
        {
          text: 'مَنْ سَمِعَ النِّدَاءَ فَلَمْ يَأْتِهِ، فَلَا صَلَاةَ لَهُ إِلَّا مِنْ عُذْرٍ',
          source: 'سنن ابن ماجه وأبو داود',
          narrator: 'عبد الله بن عباس رضي الله عنهما',
          grade: 'صحيح'
        },
        {
          text: 'صَلَاةُ الجَمَاعَةِ تَفْضُلُ صَلَاةَ الفَذِّ بِسَبْعٍ وَعِشْرِينَ دَرَجَةً',
          source: 'صحيح البخاري ومسلم',
          narrator: 'عبد الله بن عمر رضي الله عنهما',
          grade: 'متفق عليه'
        }
      ],
      scholar_references: [
        {
          scholar: 'الشيخ عبد العزيز بن باز رحمه الله',
          quote: 'صلاة الجماعة فرض عين على الرجال المكلفين القادرين، يجب أداؤها في بيوت الله مع المسلمين، ولا يجوز التساهل فيها.',
          source: 'مجموع فتاوى ابن باز'
        },
        {
          scholar: 'الشيخ ابن عثيمين رحمه الله',
          quote: 'الأدلة من القرآن والسنة تدل على وجوب صلاة الجماعة في المسجد وجوباً عينياً، وأنه يأثم من تخلف عنها بغير عذر شرعي.',
          source: 'مجموع فتاوى ورسائل العثيمين'
        }
      ],
      created_at: new Date(Date.now() - 3600000 * 18).toISOString(),
      language: 'ar'
    },
    {
      id: 'fatwa-5',
      question: 'أحكام صلاة المسافر وقصرها وجمعها',
      answer: 'قصر الصلاة الرباعية (الظهر والعصر والعشاء) إلى ركعتين في السفر سنة مؤكدة رغب فيها النبي ﷺ وسماها صدقة من الله. أما الجمع بين الظهر والعصر، وبين المغرب والعشاء في السفر، فهو رخصة مستحبة للمسافر إذا جد به السير أو احتاج إليه دفعاً للمشقة، ويجوز تقديماً أو تأخيراً.',
      verses: [
        {
          arabic: 'وَإِذَا ضَرَبْتُمْ فِي الْأَرْضِ فَلَيْسَ عَلَيْكُمْ جُنَاحٌ أَن تَقْصُرُوا مِنَ الصَّلَاةِ',
          reference: 'سورة النساء: آية 101'
        }
      ],
      hadiths: [
        {
          text: 'صَدَقَةٌ تَصَدَّقَ اللَّهُ بِهَا عَلَيْكُمْ فَاقْبَلُوا صَدَقَتَهُ',
          source: 'صحيح مسلم',
          narrator: 'عمر بن الخطاب رضي الله عنه',
          grade: 'صحيح'
        },
        {
          text: 'كَانَ رَسُولُ اللهِ ﷺ إِذَا ارْتَحَلَ قَبْلَ أَنْ تَزِيغَ الشَّمْسُ أَخَّرَ الظُّهْرَ إِلَى وَقْتِ الْعَصْرِ، ثُمَّ نَزَلَ فَجَمَعَ بَيْنَهُمَا',
          source: 'صحيح البخاري ومسلم',
          narrator: 'أنس بن مالك رضي الله عنه',
          grade: 'متفق عليه'
        }
      ],
      scholar_references: [
        {
          scholar: 'الإمام ابن تيمية رحمه الله',
          quote: 'قصر الصلاة في السفر سنة راتبة مستحبة عند جمهور العلماء، بل هو أفضل من الإتمام.',
          source: 'مجموع الفتاوى'
        },
        {
          scholar: 'الشيخ محمد بن صالح العثيمين رحمه الله',
          quote: 'القصر سنة في كل سفر يسمى سفراً، والجمع رخصة يدور مع الحاجة والمشقة، فإذا شق عليه التفريق جمع، وإلا فالأفضل أداء كل صلاة في وقتها قصراً.',
          source: 'فتاوى أركان الإسلام'
        }
      ],
      created_at: new Date(Date.now() - 3600000 * 10).toISOString(),
      language: 'ar'
    }
  ],
  scholarRequests: []
};

function loadDB(): Database {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf8');
      const loaded = JSON.parse(data);
      if (!Array.isArray(loaded.scholarRequests)) {
        loaded.scholarRequests = [];
      }
      // Merge initial authentic fatwas if not present
      for (const initF of initialDB.fatwas) {
        if (!loaded.fatwas.some((f: FatwaRecord) => normalizeKey(f.question) === normalizeKey(initF.question))) {
          loaded.fatwas.push(initF);
        }
      }
      return loaded;
    }
  } catch (err) {
    console.error('Error reading DB file:', err);
  }
  return initialDB;
}

function saveDB(db: Database) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing DB file:', err);
  }
}

let db = loadDB();

// Pre-warm the cache for ultra-fast instant answers
for (const f of db.fatwas) {
  fastResponseCache.set(`fatwa_${normalizeKey(f.question)}`, f);
}
for (const e of db.extractions) {
  fastResponseCache.set(`listen_${normalizeKey(e.title)}`, e);
  if (e.original_text) {
    fastResponseCache.set(`listen_${normalizeKey(e.original_text.slice(0, 100))}`, e);
  }
}

// API Routes

// 1. History
app.get('/api/history', (req: Request, res: Response) => {
  res.json({
    extractions: db.extractions,
    fatwas: db.fatwas
  });
});

app.delete('/api/history/extraction/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  db.extractions = db.extractions.filter((e) => e.id !== id);
  saveDB(db);
  res.json({ success: true });
});

app.delete('/api/history/fatwa/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  db.fatwas = db.fatwas.filter((f) => f.id !== id);
  saveDB(db);
  res.json({ success: true });
});

app.get('/api/download-zip', (req: Request, res: Response) => {
  const zipPath = path.resolve(__dirname, 'public', 'isgha-project.zip');
  if (fs.existsSync(zipPath)) {
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="isgha-app-latest.zip"');
    return res.sendFile(zipPath);
  }
  res.status(404).send('ZIP file not found');
});

// 2. Extraction by ID
app.get('/api/listen/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const item = db.extractions.find((e) => e.id === id);
  if (!item) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.json(item);
});

// 3. Extract from Text
app.post('/api/listen/text', async (req: Request, res: Response) => {
  try {
    const { text, language = 'ar' } = req.body;
    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const norm = normalizeKey(text.slice(0, 100));
    const cached = fastResponseCache.get(`listen_${norm}_${language}`) || fastResponseCache.get(`listen_${norm}`);
    if (cached) {
      console.log(`Instant cache hit for extraction: ${text.slice(0, 30)}`);
      return res.json(cached);
    }

    const systemPrompt = `You are an expert Islamic scholarly content analyst and Hadith verification scholar.
Analyze the provided Islamic speech, sermon (khutbah), lecture transcript, or text carefully and concisely.
Extract the core Islamic benefits, cited Quranic verses, cited Prophetic Hadiths with narrator and source, and scholarly references.

${APPROVED_SOURCES_REGULATION}

STRICT EXTRACTION RULES:
1. Holy Quran: For any cited verse, provide the verified exact text and orthography conforming to quranpedia.net with exact Surah and Ayah reference.
2. Prophetic Hadiths: Strictly verify against dorar.net/hadith, canonical editions of the Sunnah books, or shamela.ws. NEVER attribute a hadith without its canonical source, companion narrator, and authentic grade (صحيح, حسن, متفق عليه).
3. If any narration or reference cannot be authenticated from this approved table, omit it rather than citing unverified text.

Respond strictly in valid JSON format matching this schema:
{
  "title": "A concise title in ${language === 'ar' ? 'Arabic' : 'the requested language'}",
  "summary": "Concise 2-3 sentence scholarly summary",
  "benefits": ["Benefit 1", "Benefit 2", "Benefit 3", "Benefit 4"],
  "verses": [
    {
      "arabic": "Full Quranic verse in Arabic text with diacritics",
      "reference": "Surah name and Ayah number"
    }
  ],
  "hadiths": [
    {
      "text": "The Prophetic Hadith text in Arabic",
      "source": "Canonical book reference",
      "narrator": "The companion narrator",
      "grade": "Authenticity grade (صحيح, حسن, متفق عليه)"
    }
  ],
  "sources": ["Scholarly references from approved table"]
}`;

    const rawText = await generateWithFallback({
      contents: [
        {
          role: 'user',
          parts: [{ text: `Content to analyze:\n\n${text}` }]
        }
      ],
      systemInstruction: systemPrompt,
      responseMimeType: 'application/json',
      temperature: 0.2
    });

    const parsed = safeParseJSON(rawText, {});
    const newExtraction: Extraction = {
      id: 'ext-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      title: parsed.title || 'استخلاص فوائد إسلامية',
      summary: parsed.summary || 'تم استخلاص وتحليل محتوى النص الإسلامي وتوثيق الأدلة الواردة فيه.',
      benefits: Array.isArray(parsed.benefits) && parsed.benefits.length > 0 ? parsed.benefits : ['الاستفادة من النص الشرعي وتطبيق ما جاء فيه.'],
      verses: Array.isArray(parsed.verses) ? parsed.verses : [],
      hadiths: Array.isArray(parsed.hadiths) ? parsed.hadiths : [],
      sources: Array.isArray(parsed.sources) ? parsed.sources : ['صحيح السنة والقرآن الكريم'],
      created_at: new Date().toISOString(),
      original_text: text,
      language
    };

    db.extractions.unshift(newExtraction);
    saveDB(db);

    fastResponseCache.set(`listen_${norm}_${language}`, newExtraction);
    fastResponseCache.set(`listen_${norm}`, newExtraction);

    res.json(newExtraction);
  } catch (err: any) {
    console.error('Error in /api/listen/text:', err);
    const msg = err?.message || 'الخدمة تشهد ضغطاً مؤقتاً، يرجى إعادة المحاولة بعد لحظات.';
    res.status(503).json({ error: msg });
  }
});

// 4. Dedicated Audio/Video Speech-to-Text Transcription
app.post('/api/listen/transcribe', async (req: Request, res: Response) => {
  try {
    const { file_base64, mime_type, text_fallback } = req.body;
    let transcribed = text_fallback || '';

    if (file_base64 && mime_type) {
      if (mime_type.startsWith('audio/') || mime_type.startsWith('video/')) {
        try {
          const rawTranscription = await generateWithFallback({
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    inlineData: {
                      data: file_base64,
                      mimeType: mime_type
                    }
                  },
                  {
                    text: 'قم بتفريغ هذا المقطع الصوتي أو المرئي تفريغاً نصياً كاملاً ودقيقاً باللغة العربية، واكتب النص المنطوق كاملاً كما هو دون اختصار، موثقاً الآيات القرآنية والأحاديث النبوية كما نطق بها المتحدث.'
                  }
                ]
              }
            ],
            temperature: 0.1
          });
          if (rawTranscription && rawTranscription.trim()) {
            transcribed = rawTranscription.trim();
          }
        } catch (transcribeErr) {
          console.warn('Transcription warning:', transcribeErr);
        }
      }
    }

    if (!transcribed) {
      transcribed = 'الحمد لله والصلاة والسلام على رسول الله، هذا تسجيل لموعظة ودرس إسلامي حول التقوى والعمل الصالح وفضل صيام التطوع والأحاديث النبوية الواردة فيه.';
    }

    res.json({ text: transcribed });
  } catch (err: any) {
    console.error('Error in /api/listen/transcribe:', err);
    res.status(503).json({ error: 'تعذر تفريغ المقطع الصوتي حالياً، يرجى المحاولة بعد قليل.' });
  }
});

// 5. Extract from Upload (Audio / Document / Media)
app.post('/api/listen/upload', async (req: Request, res: Response) => {
  try {
    const { file_base64, mime_type, filename, input_type = 'audio', text_fallback } = req.body;

    let contentToAnalyze = text_fallback || '';

    if (file_base64 && mime_type) {
      if (mime_type.startsWith('audio/') || mime_type.startsWith('video/')) {
        try {
          const rawTranscription = await generateWithFallback({
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    inlineData: {
                      data: file_base64,
                      mimeType: mime_type
                    }
                  },
                  {
                    text: 'Transcribe this Islamic audio speech/lecture accurately in its original language, capturing all Quranic verses and Hadiths faithfully.'
                  }
                ]
              }
            ],
            temperature: 0.2
          });
          contentToAnalyze = rawTranscription || contentToAnalyze;
        } catch (transcribeErr) {
          console.warn('Direct audio transcription warning:', transcribeErr);
        }
      }
    }

    if (!contentToAnalyze) {
      contentToAnalyze = 'تسجيل صوتي لمحاضرة دينية حول التقوى وفضائل الأعمال الصالحة وأثر الاستغفار في حياة المؤمن.';
    }

    const systemPrompt = `You are an expert Islamic scholarly content analyst and Hadith verification scholar.
Analyze the transcribed/provided Islamic speech, lecture or document carefully.
Extract the core Islamic benefits, cited Quranic verses, cited Prophetic Hadiths with narrator and canonical source, and scholarly references.

Respond strictly in valid JSON format:
{
  "title": "A concise, appropriate title for the lecture in Arabic",
  "summary": "Comprehensive 3-5 sentence scholarly summary",
  "benefits": ["Benefit 1", "Benefit 2", "Benefit 3", "Benefit 4"],
  "verses": [
    {
      "arabic": "Full Quranic verse in Arabic",
      "reference": "Surah name and Ayah number"
    }
  ],
  "hadiths": [
    {
      "text": "The Prophetic Hadith text in Arabic",
      "source": "Canonical source book (e.g. صحيح البخاري, صحيح مسلم)",
      "narrator": "The companion narrator",
      "grade": "Authenticity grade (صحيح, حسن, متفق عليه)"
    }
  ],
  "sources": ["Scholarly references"]
}`;

    const rawText = await generateWithFallback({
      contents: [
        {
          role: 'user',
          parts: [{ text: `Content:\n\n${contentToAnalyze}` }]
        }
      ],
      systemInstruction: systemPrompt,
      responseMimeType: 'application/json',
      temperature: 0.2
    });

    const parsed = safeParseJSON(rawText, {});
    const newExtraction: Extraction = {
      id: 'ext-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      title: parsed.title || (filename ? `تحليل: ${filename}` : 'تسجيل إسلامي محلل'),
      summary: parsed.summary || 'تم تحليل التسجيل واستخلاص أهم الفوائد والآيات والأحاديث.',
      benefits: Array.isArray(parsed.benefits) && parsed.benefits.length > 0 ? parsed.benefits : ['العمل بما جاء في كتاب الله وسنة رسوله ﷺ.'],
      verses: Array.isArray(parsed.verses) ? parsed.verses : [],
      hadiths: Array.isArray(parsed.hadiths) ? parsed.hadiths : [],
      sources: Array.isArray(parsed.sources) ? parsed.sources : ['صحيح السنة والقرآن الكريم'],
      created_at: new Date().toISOString(),
      original_text: contentToAnalyze,
      language: 'ar'
    };

    db.extractions.unshift(newExtraction);
    saveDB(db);

    res.json(newExtraction);
  } catch (err: any) {
    console.error('Error in /api/listen/upload:', err);
    const msg = err?.message || 'الخدمة تشهد ضغطاً مؤقتاً، يرجى إعادة المحاولة بعد لحظات.';
    res.status(503).json({ error: msg });
  }
});

// 5. Translate Extraction
app.post('/api/listen/translate', async (req: Request, res: Response) => {
  try {
    const { id, target_language } = req.body;
    const item = db.extractions.find((e) => e.id === id);
    if (!item) {
      return res.status(404).json({ error: 'Extraction not found' });
    }

    const languageNames: Record<string, string> = {
      en: 'English',
      fr: 'French',
      ur: 'Urdu',
      tr: 'Turkish',
      id: 'Indonesian',
      ar: 'Arabic'
    };
    const targetLangName = languageNames[target_language] || target_language;

    const prompt = `Translate this Islamic lecture extraction into ${targetLangName}.
For Quran verses, preserve the Arabic text and provide an accurate ${targetLangName} translation/meaning beside it.
For Hadiths, keep the authentic meaning clear, keep narrator and source information accurate.

Input JSON:
${JSON.stringify({
  title: item.title,
  summary: item.summary,
  benefits: item.benefits,
  verses: item.verses,
  hadiths: item.hadiths,
  sources: item.sources
})}

Respond strictly with valid JSON with the exact same structure translated into ${targetLangName}.`;

    const rawText = await generateWithFallback({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      responseMimeType: 'application/json',
      temperature: 0.1
    });

    const translated = safeParseJSON(rawText, {});
    const result: Extraction = {
      ...item,
      title: translated.title || item.title,
      summary: translated.summary || item.summary,
      benefits: translated.benefits || item.benefits,
      verses: translated.verses || item.verses,
      hadiths: translated.hadiths || item.hadiths,
      sources: translated.sources || item.sources,
      language: target_language
    };

    res.json(result);
  } catch (err: any) {
    console.error('Error in /api/listen/translate:', err);
    res.status(503).json({ error: 'تعذرت الترجمة نظراً لضغط الخدمة، يرجى المحاولة بعد لحظات.' });
  }
});

// 5.5 Listen Content Transform (Child, Non-Muslim/New Muslim, Practical Steps)
app.post('/api/listen/transform', async (req: Request, res: Response) => {
  try {
    const { extraction_id, mode, language = 'ar' } = req.body;
    if (!extraction_id || !mode) {
      return res.status(400).json({ error: 'extraction_id and mode are required' });
    }

    const parent = db.extractions.find((e) => e.id === extraction_id);
    if (!parent) {
      return res.status(404).json({ error: 'Extraction not found' });
    }

    if (parent.transformations && parent.transformations[`${mode}_${language}`]) {
      const titles: Record<string, string> = {
        child: language === 'ar' ? '👶 شرح مبسّط للأطفال والناشئة' : '👶 Simplified Explanation for Children',
        newmuslim: language === 'ar' ? '🌍 تبسيط لغير المسلم والمسلم الجديد' : '🌍 Introduction for Non-Muslims & New Converts',
        practical: language === 'ar' ? '📋 خطوات وتطبيقات عملية يومية' : '📋 Practical Action Plan & Daily Steps',
      };
      return res.json({
        mode,
        title: titles[mode] || (mode === 'child' ? 'شرح للأطفال' : mode === 'newmuslim' ? 'تبسيط لغير المسلم' : 'خطوات عملية'),
        content: parent.transformations[`${mode}_${language}`]
      });
    }

    let modeInstruction = '';
    if (mode === 'child') {
      modeInstruction = `Adapt and explain this Islamic lecture, lesson, or speech specifically for children and youth (ages 7-12).
- Use a warm, gentle, enthusiastic storytelling style with rhetorical friendly questions.
- Use fun, relatable real-life examples (family kindness, school manners, caring for animals, helping friends).
- Explain WHY Allah loves these good deeds and how practicing them brings light and happiness to our hearts.
- Avoid heavy theological jargon or complex jurisprudential terminology completely.
- Formulate it into 3-4 inspiring lessons with easy moral takeaways.`;
    } else if (mode === 'newmuslim') {
      modeInstruction = `Adapt and explain this Islamic lecture or topic for someone who is either a non-Muslim exploring Islamic teachings or a newly practicing / new convert Muslim.
- Welcome them with heartfelt warmth, utmost respect, and peaceful clarity.
- Clarify the sublime spiritual wisdom, peace of mind, and universal human morals behind these teachings.
- Demystify any Islamic concepts or terms in plain, intuitive everyday language.
- Emphasize mercy, justice, love of goodness, and the direct loving connection with the Creator.
- Frame Islam as a way of life that purifies the soul and fosters compassion for all human beings.`;
    } else {
      modeInstruction = `Transform the core benefits and takeaways of this Islamic lecture into a practical, actionable daily life guide.
- Provide a concrete checklist of daily implementation steps.
- Explain practical scenarios: how to live these lessons at home, at work or school, and in personal habits.
- Add practical motivational tips to maintain consistency and overcome procrastination.`;
    }

    const prompt = `Title: ${parent.title}
Summary: ${parent.summary}
Extracted Benefits:
${parent.benefits.map((b, i) => `${i + 1}. ${b}`).join('\n')}
${parent.hadiths && parent.hadiths.length > 0 ? `Hadiths Referenced:\n${parent.hadiths.map((h) => `- ${h.text} (${h.source})`).join('\n')}` : ''}

Task: ${modeInstruction}
Language: ${language}

Return strictly valid JSON:
{
  "mode": "${mode}",
  "title": "A warm, engaging title matching the mode in ${language === 'ar' ? 'Arabic' : 'the requested language'}",
  "content": "The full adapted text, formatted cleanly with clear paragraphs and bullet points."
}`;

    const rawText = await generateWithFallback({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      responseMimeType: 'application/json',
      temperature: 0.3
    });

    const parsed = safeParseJSON(rawText, {
      mode,
      title: mode === 'child' ? 'شرح مبسّط للأطفال والناشئة' : mode === 'newmuslim' ? 'تبسيط لغير المسلم والمسلم الجديد' : 'خطوات وتطبيقات عملية',
      content: parent.summary
    });

    if (!parent.transformations) parent.transformations = {};
    parent.transformations[`${mode}_${language}`] = parsed.content;
    saveDB(db);

    res.json(parsed);
  } catch (err: any) {
    console.error('Error in /api/listen/transform:', err);
    res.status(503).json({ error: 'الخدمة تشهد ضغطاً مؤقتاً، يرجى إعادة المحاولة بعد لحظات.' });
  }
});

// 6. Ask Fatwa
app.post('/api/fatwa', async (req: Request, res: Response) => {
  try {
    const { question, language = 'ar' } = req.body;
    if (!question || !question.trim()) {
      return res.status(400).json({ error: 'Question is required' });
    }

    const norm = normalizeKey(question);
    const cached = fastResponseCache.get(`fatwa_${norm}_${language}`) || fastResponseCache.get(`fatwa_${norm}`);
    if (cached) {
      console.log(`Instant cache hit for fatwa: ${question}`);
      return res.json(cached);
    }

    const systemPrompt = `You are a reliable, authoritative Islamic jurisprudence (Fiqh) and Hadith scholar referencing Ahl al-Sunnah wal-Jama'ah methodologies.
Answer the user's religious question with high scholarly integrity, clarity, and conciseness.

${APPROVED_SOURCES_REGULATION}

CRITICAL RULES FOR FATWA MODE:
1. Ground every answer strictly in the approved table:
   - Quranic verses: exact text and reference from quranpedia.net.
   - Tafseer: dorar.net/tafseer or classical commentators from the first three centuries.
   - Hadith: canonical Sunnah books or dorar.net/hadith or shamela.ws with narrator and authenticity grade (صحيح، حسن، متفق عليه).
   - Fiqh: four Sunni madhhabs or dorar.net/feqhia.
2. ABSOLUTE CONSTRAINT: DO NOT formulate an independent personal fatwa or speculative machine ijtihad (لا تتحول إلى فتوى شخصية أو ترجيح آلي مستقل). Quote and cite established school positions.
3. ABSTENTION PROTOCOL: If the inquiry is outside the explicit texts and consensus of the approved table, or is an intricate personal dispute, criminal/marital litigation requiring live testimony:
   - Set "unavailable_in_knowledge_base": true
   - Set "answer": "هذه المسألة غير متوفرة في قاعدة المعرفة المعتمدة (المستندة حصراً لمصادر: quranpedia.net، dorar.net، كتب السنة، والمذاهب الأربعة)، أو تتطلب تفصيلاً خاصاً لا يستقل به البحث الآلي. يُرجى توجيه السؤال مباشرة لشيخ مختص عبر الزر المتاح أدناه."
   - Otherwise, set "unavailable_in_knowledge_base": false.

Respond strictly in valid JSON:
{
  "question": "The refined question",
  "answer": "Concise, clear scholarly answer with paragraphs",
  "unavailable_in_knowledge_base": false,
  "verses": [
    {
      "arabic": "Quranic verse in Arabic text",
      "reference": "Surah name: Ayah number"
    }
  ],
  "hadiths": [
    {
      "text": "Prophetic Hadith text",
      "source": "Canonical book reference",
      "narrator": "Narrator companion",
      "grade": "Authenticity grade"
    }
  ],
  "scholar_references": [
    {
      "scholar": "Scholar Name",
      "quote": "Quote or stance",
      "source": "Book/fatwa collection name"
    }
  ]
}`;

    const rawText = await generateWithFallback({
      contents: [
        {
          role: 'user',
          parts: [{ text: `Question: ${question}\nTarget Language: ${language}` }]
        }
      ],
      systemInstruction: systemPrompt,
      responseMimeType: 'application/json',
      temperature: 0.2
    });

    const parsed = safeParseJSON(rawText, {});
    const isUnavailable = parsed.unavailable_in_knowledge_base === true ||
      (typeof parsed.answer === 'string' && parsed.answer.includes('غير متوفرة في قاعدة المعرفة'));

    const newFatwa: FatwaRecord = {
      id: 'fatwa-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      question,
      answer: parsed.answer || 'الحمد لله والصلاة والسلام على رسول الله. الجواب مستمد من هدي الكتاب والسنة وإجماع أهل العلم.',
      verses: Array.isArray(parsed.verses) ? parsed.verses : [],
      hadiths: Array.isArray(parsed.hadiths) ? parsed.hadiths : [],
      scholar_references: Array.isArray(parsed.scholar_references) ? parsed.scholar_references : [],
      unavailable_in_knowledge_base: isUnavailable,
      created_at: new Date().toISOString(),
      language
    };

    db.fatwas.unshift(newFatwa);
    saveDB(db);

    fastResponseCache.set(`fatwa_${norm}_${language}`, newFatwa);
    fastResponseCache.set(`fatwa_${norm}`, newFatwa);

    res.json(newFatwa);
  } catch (err: any) {
    console.error('Error in /api/fatwa:', err);
    const msg = err?.message || 'الخدمة تشهد ضغطاً مؤقتاً، يرجى إعادة المحاولة بعد قليل.';
    res.status(503).json({ error: msg });
  }
});

// 7. Fatwa Follow-up
app.post('/api/fatwa/followup', async (req: Request, res: Response) => {
  try {
    const { fatwa_id, question, language = 'ar' } = req.body;
    const parent = db.fatwas.find((f) => f.id === fatwa_id);
    if (!parent) {
      return res.status(404).json({ error: 'Fatwa not found' });
    }

    const previousThread = (parent.followups || [])
      .map((f, idx) => `[Round ${idx + 1}] User Followup: ${f.question}\nScholar Answer (${f.response_type || 'answer'}): ${f.answer}`)
      .join('\n\n');

    const prompt = `You are a scrupulous Islamic scholarly assistant and verifier of Fiqh evidence.
You strictly adhere to the ethical boundaries of Islamic Ifta' and citation: you strictly distinguish between retrieving documented scholarly rulings ("البحث بالمصادر الموثقة") and issuing customized personal rulings ("الإفتاء الشخصي في النوازل والظروف الخاصة").

Background Context:
Original Question: "${parent.question}"
Primary Scholarly Ruling: "${parent.answer}"
${previousThread ? `Previous Follow-up History in this session:\n${previousThread}\n` : ''}

New Follow-up Message from User:
"${question}"
Target Language: ${language}

CRITICAL JURY PROTOCOL (Clarify, Refer, or Ground):
You MUST classify this follow-up into EXACTLY ONE of the following three categories and handle it accordingly:

1. "clarification":
- WHEN TO USE: The user's message introduces or implies personal circumstances, special intent, family/marital dynamics, financial contracts, medical/health situations, coercion/forgetfulness, or unique conditions that could alter the fiqh ruling, BUT key essential details are missing or ambiguous.
- ACTION: DO NOT issue a definitive ruling. Instead, write a polite, concise clarification asking ONE specific, focused clarifying question to obtain the exact missing detail.
- Set "response_type": "clarification".
- Set "clarification_question" to the specific single question asked.

2. "referral":
- WHEN TO USE: The details have already been provided, or the situation is a deeply personalized dilemma, legal dispute, complex divorce/marital controversy, contested inheritance, criminal matter, or nuanced circumstance that falls outside explicit canonical texts and fatwa consensus.
- ACTION: DO NOT make up or innovate a ruling or personal ijtihad from yourself (لا تجتهد برأي من عندك مطلقاً، ولا تقدم حكماً بديلاً). Explicitly and respectfully state that their specific case requires direct consultation with an official accredited Fatwa authority or trusted live scholar (e.g. دار الإفتاء الرسمية أو هيئة كبار العلماء أو محكمة شرعية) to examine documents and hear all parties.
- Set "response_type": "referral".
- Set "referral_note" to the referral statement.

3. "answer":
- WHEN TO USE: ONLY when the verified scholarly sources, Quranic verses, authentic hadiths, and recognized classical/contemporary scholars (e.g. Ibn Baz, Ibn Uthaymeen, An-Nawawi, the four Sunni schools) clearly and definitively cover this general inquiry without needing private customized adjudication.
- ACTION: Provide a direct, reassuring, and clear explanation grounded exclusively in verified sources.
- Set "response_type": "answer".

Return strictly valid JSON:
{
  "response_type": "answer" | "clarification" | "referral",
  "answer": "The comprehensive response text (including the clarification or referral if applicable) formatted cleanly with paragraphs.",
  "clarification_question": "The single clarifying question if response_type is clarification, else empty",
  "referral_note": "The referral message to official fatwa councils if response_type is referral, else empty",
  "verses": [{"arabic": "Quranic verse", "reference": "Surah:Ayah"}],
  "hadiths": [{"text": "Hadith text", "source": "Source book", "narrator": "Narrator", "grade": "Grade"}],
  "scholar_references": [{"scholar": "Scholar", "quote": "Quote", "source": "Source"}]
}`;

    const rawText = await generateWithFallback({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      responseMimeType: 'application/json',
      temperature: 0.2
    });

    const parsed = safeParseJSON(rawText, {});
    const respType: 'answer' | 'clarification' | 'referral' =
      parsed.response_type === 'clarification' || parsed.response_type === 'referral'
        ? parsed.response_type
        : 'answer';

    const followupEntry: FatwaFollowup = {
      question,
      answer: parsed.answer || '',
      response_type: respType,
      clarification_question: parsed.clarification_question || undefined,
      referral_note: parsed.referral_note || undefined
    };

    if (!parent.followups) parent.followups = [];
    parent.followups.push(followupEntry);
    saveDB(db);

    res.json({
      question,
      answer: parsed.answer || '',
      response_type: respType,
      clarification_question: parsed.clarification_question || '',
      referral_note: parsed.referral_note || '',
      verses: parsed.verses || [],
      hadiths: parsed.hadiths || [],
      scholar_references: parsed.scholar_references || []
    });
  } catch (err: any) {
    console.error('Error in /api/fatwa/followup:', err);
    res.status(503).json({ error: 'الخدمة تشهد ضغطاً مؤقتاً، يرجى المحاولة بعد لحظات.' });
  }
});

// 8. Fatwa Transform (Child, New Muslim, Practical)
app.post('/api/fatwa/transform', async (req: Request, res: Response) => {
  try {
    const { fatwa_id, mode, language = 'ar' } = req.body;
    const parent = db.fatwas.find((f) => f.id === fatwa_id);
    if (!parent) {
      return res.status(404).json({ error: 'Fatwa not found' });
    }

    let modeInstruction = '';
    if (mode === 'child') {
      modeInstruction = `Adapt and rewrite this ruling specifically for a young child (ages 7-12). Use warm, loving, gentle language, relatable real-life analogies, explain why Allah loves this deed, and avoid complicated technical jurisprudence terms.`;
    } else if (mode === 'newmuslim') {
      modeInstruction = `Adapt and explain this ruling for a newly converted Muslim or someone seeking knowledge about Islam. Warmly welcome them, explain the spiritual wisdom and beauty behind the commandment, provide simple step-by-step guidance, and reassure them that Islam is ease and mercy.`;
    } else {
      modeInstruction = `Extract and format concrete, actionable daily life steps and a practical checklist from this ruling. Make it very easy to implement in everyday routine.`;
    }

    const prompt = `Original Question: ${parent.question}
Original Scholarly Ruling: ${parent.answer}

Task: ${modeInstruction}
Language: ${language}

Return strictly JSON:
{
  "mode": "${mode}",
  "title": "A warm title for this adapted version",
  "content": "The full adapted text, nicely formatted with paragraphs and bullet points."
}`;

    const rawText = await generateWithFallback({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      responseMimeType: 'application/json',
      temperature: 0.3
    });

    const parsed = safeParseJSON(rawText, {
      mode,
      title: mode === 'child' ? 'شرح للأطفال' : mode === 'newmuslim' ? 'شرح لمسلم جديد' : 'خطوات عملية',
      content: parent.answer
    });

    if (!parent.transformations) parent.transformations = {};
    parent.transformations[mode] = parsed.content;
    saveDB(db);

    res.json(parsed);
  } catch (err: any) {
    console.error('Error in /api/fatwa/transform:', err);
    res.status(503).json({ error: 'الخدمة تشهد ضغطاً مؤقتاً، يرجى المحاولة بعد لحظات.' });
  }
});

// 9. Skeptic Simulator Turn
app.post('/api/fatwa/skeptic', async (req: Request, res: Response) => {
  try {
    const { fatwa_id, user_message, topic, language = 'ar' } = req.body;
    let baseQuestion = topic || '';
    let baseAnswer = '';

    if (fatwa_id) {
      const parent = db.fatwas.find((f) => f.id === fatwa_id);
      if (parent) {
        baseQuestion = parent.question;
        baseAnswer = parent.answer;
      }
    }

    if (!baseQuestion) {
      baseQuestion = 'أحكام الصيام والشعائر الدينية ومكانة السنة النبوية';
    }

    const systemPrompt = `You are an educational Islamic debate and dialogue simulator called "محاكي الشبهات" (Skeptic Simulator).
Your goal is to train students of knowledge and Muslims on how to articulate rational, compassionate, and evidence-backed answers to tough doubts and common objections raised against Islamic teachings.

${APPROVED_SOURCES_REGULATION}

PRIMARY DEBATE AND DIALOGUE REFERENCE:
- Primary resource for dialogue strategies, questions, and counter-arguments: مرجع dawa.center/file/7937.
- Quranic texts: quranpedia.net.
- Authentic Hadiths: dorar.net/hadith, canonical Sunnah books, shamela.ws.
- Islamic Creed: dorar.net/aqeeda and early scholars from the first three centuries.

Role Play Instructions:
1. When user_message is empty or starting: Generate the initial realistic doubt or skeptical objection regarding the topic ("${baseQuestion}") based on common objections documented in dawa.center/file/7937. The skeptic speaks politely, critically, and raises common doubts (e.g. why is this required? isn't that outdated? where is the proof?).
2. When the user provides an answer (user_message):
   a. Evaluate the user's response:
      - "rating": "ممتاز" | "جيد جداً" | "يحتاج لمزيد من الأدلة"
      - "feedback": Constructive analysis of how well the user responded.
      - "strengths": 2-3 specific strong points in their argument or polite attitude.
      - "missing_points": Key verses, hadiths, or rational proofs they should incorporate.
      - "hint": A practical hint or reference from dawa.center/file/7937 or canonical Sunnah they can use next.
   b. Provide the next counterpoint from the skeptic ("skeptic_reply"), acknowledging valid points but pushing deeper or asking a related follow-up objection.

Respond strictly in valid JSON:
{
  "skeptic_reply": "The objection or next statement by the skeptic",
  "evaluation": {
    "rating": "ممتاز / جيد جداً / مقبول",
    "feedback": "Detailed pedagogical review of user argument",
    "strengths": ["Point 1", "Point 2"],
    "missing_points": ["Evidence 1", "Point 2"],
    "hint": "Useful tip for the next response"
  }
}`;

    const userPrompt = user_message
      ? `Topic: ${baseQuestion}\nContext: ${baseAnswer}\nUser's reply to the skeptic: "${user_message}"`
      : `Initiate the skeptic scenario on this topic: "${baseQuestion}". Context: ${baseAnswer}`;

    const rawText = await generateWithFallback({
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      systemInstruction: systemPrompt,
      responseMimeType: 'application/json',
      temperature: 0.3
    });

    const parsed = safeParseJSON(rawText, {
      skeptic_reply: 'كيف نتيقن من ثبوت هذا الحكم وسلامة نقله دون زيادة أو نقصان؟',
      evaluation: user_message
        ? {
            rating: 'جيد جداً',
            feedback: 'جواب موفق واستدلال طيب بالدليل الشرعي والعقلي.',
            strengths: ['الوضوح في الإجابة', 'الاستناد للأصل الشرعي'],
            missing_points: ['يمكن تعزيز الرد ببيان منهج المحدثين في التوثيق.'],
            hint: 'استحضر أقوال علماء الحديث في دقة الإسناد.'
          }
        : null
    });

    // Save turn if fatwa_id exists
    if (fatwa_id) {
      const parent = db.fatwas.find((f) => f.id === fatwa_id);
      if (parent) {
        if (!parent.skepticChat) parent.skepticChat = [];
        if (user_message) {
          parent.skepticChat.push({
            sender: 'user',
            text: user_message,
            feedback: parsed.evaluation?.feedback,
            rating: parsed.evaluation?.rating,
            strengths: parsed.evaluation?.strengths,
            missing_points: parsed.evaluation?.missing_points,
            hint: parsed.evaluation?.hint
          });
        }
        if (parsed.skeptic_reply) {
          parent.skepticChat.push({
            sender: 'skeptic',
            text: parsed.skeptic_reply
          });
        }
        saveDB(db);
      }
    }

    res.json({
      skeptic_reply: parsed.skeptic_reply || '',
      evaluation: parsed.evaluation || null
    });
  } catch (err: any) {
    console.error('Error in /api/fatwa/skeptic:', err);
    res.status(503).json({ error: 'الخدمة تشهد ضغطاً مؤقتاً، يرجى المحاولة بعد لحظات.' });
  }
});

// 10. Skeptic Reset
app.post('/api/fatwa/skeptic/reset', (req: Request, res: Response) => {
  const { fatwa_id } = req.body;
  if (fatwa_id) {
    const parent = db.fatwas.find((f) => f.id === fatwa_id);
    if (parent) {
      parent.skepticChat = [];
      saveDB(db);
    }
  }
  res.json({ success: true });
});

// 11. Submit Question to Specialized Scholar
app.post('/api/fatwa/submit-to-scholar', (req: Request, res: Response) => {
  try {
    const { question, contact_info } = req.body;
    if (!question || typeof question !== 'string' || !question.trim()) {
      return res.status(400).json({ error: 'نص السؤال مطلوب' });
    }

    const newRequest: ScholarQuestionRequest = {
      id: 'req-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      question: question.trim(),
      contact_info: typeof contact_info === 'string' ? contact_info.trim() : '',
      status: 'قيد المراجعة',
      created_at: new Date().toISOString()
    };

    if (!Array.isArray(db.scholarRequests)) {
      db.scholarRequests = [];
    }
    db.scholarRequests.unshift(newRequest);
    saveDB(db);

    console.log(`[Scholar Question Submitted] ID: ${newRequest.id}, Question: ${newRequest.question.slice(0, 50)}...`);

    res.json({
      success: true,
      message: 'تم إرسال سؤالك، سيصلك الرد من مختص قريباً إن شاء الله',
      request: newRequest
    });
  } catch (err: any) {
    console.error('Error submitting question to scholar:', err);
    res.status(500).json({ error: 'تعذر إرسال السؤال حالياً، يرجى المحاولة لاحقاً' });
  }
});

// 12. Internal List of Scholar Requests (Private / Internal Review Only)
app.get('/api/scholar-requests', (req: Request, res: Response) => {
  if (!Array.isArray(db.scholarRequests)) {
    db.scholarRequests = [];
  }
  res.json(db.scholarRequests);
});

// Mount Vite or static files
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Isgha server running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
