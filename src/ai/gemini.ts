import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error(
    'GEMINI_API_KEY is not set. Copy .env.example to .env and add your key from https://aistudio.google.com/app/apikey',
  );
}

const genAI = new GoogleGenerativeAI(apiKey);

export interface ParsedTransaction {
  type: 'EXPENSE' | 'INCOME';
  amount: number | null;
  category: string;
  description: string;
  date?: string | null; // ISO date "YYYY-MM-DD" if mentioned, null otherwise
}

const SYSTEM_PROMPT = `אתה עוזר פיננסי שמנתח הודעות בעברית ומחלץ מהן נתוני עסקה מובנים.
התאריך של היום (ISO) יסופק בתחילת כל הודעה.

החזר אך ורק אובייקט JSON בצורה הבאה:
{
  "type": "EXPENSE" או "INCOME",
  "amount": מספר (או null אם לא צוין בבירור),
  "category": מחרוזת (חייבת להיות אחת מהקטגוריות הרשומות למטה),
  "description": מחרוזת (תיאור קצר עד 60 תווים, בעברית),
  "date": מחרוזת או null (פורמט ISO "YYYY-MM-DD" אם צוין תאריך, אחרת null)
}

כללי זיהוי סוג עסקה:
- הוצאה (EXPENSE): "הוצאתי", "שילמתי", "קניתי", "עלה לי", "חיוב", "מנוי"
- הכנסה (INCOME): "קיבלתי", "הכנסתי", "משכורת", "פרילנס", "הכנסה"

כללי חילוץ תאריך:
- "אתמול" → יום אחד אחורה
- "שלשום" → יומיים אחורה
- "ב-X לחודש" → חודש נוכחי, יום X
- "לפני שבוע" → 7 ימים אחורה
- ללא תאריך → היום

קטגוריות (חייב להשתמש בדיוק במחרוזות העבריות הבאות):
- אוכל         — מסעדה, מכולת, מזון לבני אדם בלבד
- תחבורה       — דלק, רכב, אוטובוס, מונית, רכבת, חניה
- דיור         — שכירות, משכנתה, ארנונה, חשמל, מים, גז, אינטרנט, סלולר, ביוב, ועד בית
- בידור        — קולנוע, נטפליקס, משחקים, חופשה, בילוי
- בריאות       — רופא, תרופות, ביטוח בריאות, פסיכולוג, אופטיקה
- קניות        — בגדים, אלקטרוניקה, כלי בית, ריהוט
- משכורת       — שכר עבודה חודשי
- פרילנס       — עצמאי, ייעוץ, פרוייקט
- חינוך        — לימודים, קורסים, ספרי לימוד, גן ילדים
- חיות מחמד   — אוכל לחיות, מזון לכלב/חתול, וטרינר, ציוד לחיות, טיפוח חיות
- כללי         — כל הוצאה שאינה מתאימה לשאר הקטגוריות

חשוב במיוחד לגבי קטגוריות:
- "אוכל לחיות", "מזון לכלב", "מזון לחתול", "אוכל לדג", "פינוקים לכלב" → חיות מחמד (לא אוכל!)
- "וטרינר", "חיסון לכלב", "עיקור", "ציוד לחיות" → חיות מחמד
- "תרופות" ללא הקשר של חיות → בריאות
- הקשר קובע את הקטגוריה, לא רק מילות מפתח בודדות

אם ההודעה אינה עסקה פיננסית, החזר בדיוק: null
החזר אך ורק את אובייקט ה-JSON או "null" — ללא markdown, ללא הסברים.`;

// Throws on API/network errors; returns null only when text is not a transaction.
export async function parseTransaction(userMessage: string): Promise<ParsedTransaction | null> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: SYSTEM_PROMPT,
  });

  const today = new Date().toISOString().slice(0, 10);
  const result = await model.generateContent(`תאריך היום: ${today}\nהודעה: "${userMessage}"`);
  const raw = result.response.text().trim();
  console.log('[Gemini] Raw response:', raw);

  if (raw === 'null') return null;

  try {
    // Extract the JSON object from the response (handles extra explanation text or code fences)
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]) as ParsedTransaction;

    // Basic validation
    if (!parsed.type || !parsed.category || !parsed.description) return null;
    if (parsed.type !== 'EXPENSE' && parsed.type !== 'INCOME') return null;

    return parsed;
  } catch {
    console.error('[Gemini] Failed to parse JSON from response:', raw);
    return null;
  }
}
