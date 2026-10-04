# منصة إصغاء | Isgha Platform

<div align="center">

**منصة إسلامية ذكية لاستخلاص الفوائد والأحاديث النبوية وتفريغ المحاضرات والاستفتاء الشرعي المدعوم بالأدلة**

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini_AI-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev/)

</div>

---

## 📖 نظرة عامة (Overview)

**منصة إصغاء** هي تطبيق ويب تفاعلي متكامل يخدم المحتوى الإسلامي والعلوم الشرعية عبر تسخير أحدث تقنيات الذكاء الاصطناعي (Google Gemini) لخدمة القرآن الكريم وصحيح السنة النبوية المطهرة.

### ✨ المميزات الرئيسية:

1. **🎙️ استمع واستخلص (تفريغ وتحليل المحاضرات)**:
   - تفريغ فوري وتلقائي للنصوص المنطوقة من التسجيل الصوتي المباشر عبر الميكروفون.
   - دعم رفع ومعالجة ملفات الصوت والفيديو (MP3, WAV, M4A, MP4, WebM) والمستندات النصية.
   - **صندوق التفريغ والكتابة التلقائية**: كتابة النص المنطوق مباشرة وتلقائياً بأسلوب الكتابة المباشرة (Typewriter Effect) مع إمكانية التعديل والنسخ.
   - استخلاص الفوائد العلمية المستفادة، والآيات القرآنية، وصحيح الأحاديث النبوية مع بيان الراوي والمصدر ودرجة الصحة والتخريج.

2. **📜 استفتِ بالأدلة (الفتاوى المؤصلة)**:
   - إجابات شرعية رصينة معتمدة على منهج أهل السنة والجماعة.
   - توثيق كل فتوى بالآيات القرآنية الكريمة، والأحاديث النبوية من الصحاح والسنن مع درجة الحديث، وأقوال أئمة السلف والعلماء المعاصرين الموثوقين.
   - خيارات تفاعلية لمتابعة النقاش، أو تبسيط الجواب للأطفال، أو المسلمين الجدد، أو بيان الخطوات العملية اليومية.

3. **🛡️ محاكي الشبهات والاعتراضات (Skeptic Simulator)**:
   - نظام حواري تدريبي يحاكي أسئلة وشبهات المشككين حول قضايا العقيدة وتدوين السنة والشريعة.
   - تقييم علمي وتربوي فوري لقوة جوابك، مع توضيح نقاط القوة، والأدلة النبوية والقرآنية المقترحة، وإرشادات لتحسين الطرح.

4. **🌐 دعم متقدم للغات المتعددة**:
   - ترجمة واستخدام فوري بـ 6 لغات: العربية (RTL)، الإنجليزية، الفرنسية، الأردية، التركية، والإندونيسية.
   - إمكانية ترجمة نتائج التحليل بضغطة زر واحدة.

5. **📂 سجل ومحفوظات محلية**:
   - أرشيف آمن لكافة المحاضرات المحللة والاستفتاءات السابقة مع إمكانية البحث والفلترة.

---

## 🛠️ التقنيات المستخدمة (Tech Stack)

- **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide Icons, Motion.
- **Backend**: Node.js, Express, tsx.
- **AI Engine**: Google GenAI SDK (`@google/genai`) مع نماذج Gemini (Gemini 3.1 Flash Lite / Gemini 3.8 Flash).
- **Audio Processing**: Web Audio API & MediaRecorder, Web Speech Recognition.

---

## 🚀 طريقة التشغيل محلياً (Getting Started)

### 1. المتطلبات الأساسية
- تثبيت [Node.js](https://nodejs.org/) (الإصدار 18 أو أحدث).
- مفتاح API مجاني من [Google AI Studio](https://aistudio.google.com/).

### 2. استنساخ المشروع
```bash
git clone https://github.com/USERNAME/REPO_NAME.git
cd REPO_NAME
```

### 3. تثبيت الاعتماديات (Dependencies)
```bash
npm install
```

### 4. إعداد المتغيرات البيئية (Environment Variables)
قم بنسخ ملف `.env.example` إلى ملف جديد باسم `.env`:
```bash
cp .env.example .env
```
ثم ضع مفتاح Gemini الخاص بك داخل ملف `.env`:
```env
GEMINI_API_KEY="AIzaSy..."
```

### 5. بدء تشغيل الخادم في وضع التطوير
```bash
npm run dev
```
افتح المتصفح على: `http://localhost:3000`

### 6. بناء المشروع للإنتاج (Production Build)
```bash
npm run build
npm start
```

---

## 📁 هيكلية المشروع (Project Structure)

```text
├── src/
│   ├── assets/            # الصور والملفات الثابتة
│   ├── components/        # مكونات الواجهة (Header, ListenScreen, FatwaScreen, ...)
│   ├── i18n/              # ملفات الترجمة واللغات (LanguageContext, translations)
│   ├── App.tsx            # المكون الرئيسي للواجهة
│   ├── api.ts             # دوال الاتصال بالواجهة الخلفية (Backend API Client)
│   ├── types.ts           # تعريفات الأنواع (TypeScript Types)
│   └── main.tsx           # نقطة دخول التطبيق في React
├── server.ts              # خادم Express ومسارات معالجة واستدعاءات Gemini AI
├── index.html             # الصفحة الرئيسية والخطوط العربية
├── vite.config.ts         # إعدادات Vite و Tailwind CSS
├── tsconfig.json          # إعدادات TypeScript
└── package.json           # الحزم والاعتماديات
```

---

## 🔒 الخصوصية والمصادر
المنصة مصممة لتقديم محتوى تعليمي واسترشادي مؤصل بدقة استناداً إلى أمهات كتب السنة والتفاسير المعتمدة، وللأمور المصيرية الخاصة يُنصح دائماً بمراجعة أهل الفتوى المعتمدين في بلدك.

---

## 📄 الترخيص (License)
هذا المشروع متاح تحت رخصة [MIT License](LICENSE).
