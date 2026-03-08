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
}

const SYSTEM_PROMPT = `You are a financial assistant that parses natural language messages into structured transaction data.

Given a message, extract the transaction and return ONLY a JSON object with this exact shape:
{
  "type": "EXPENSE" or "INCOME",
  "amount": number (or null if not clearly stated),
  "category": string (infer from context),
  "description": string (concise, under 60 chars)
}

Categorisation rules:
- "spent", "paid", "bought", "cost", "bill", "subscription", "groceries" → EXPENSE
- "received", "earned", "salary", "income", "got paid", "freelance" → INCOME
- Category examples: Food, Transport, Housing, Entertainment, Health, Shopping, Utilities, Salary, Freelance, Education, General

If the message is NOT about a financial transaction, return exactly: null
Return ONLY the JSON object or "null" — no markdown, no code fences, no explanation.`;

// Throws on API/network errors; returns null only when text is not a transaction.
export async function parseTransaction(userMessage: string): Promise<ParsedTransaction | null> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: SYSTEM_PROMPT,
  });

  const result = await model.generateContent(`Message: "${userMessage}"`);
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
