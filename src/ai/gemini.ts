import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error(
    'GEMINI_API_KEY is not set. Copy .env.example to .env and add your key from https://aistudio.google.com/app/apikey',
  );
}

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

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

export async function parseTransaction(userMessage: string): Promise<ParsedTransaction | null> {
  try {
    const result = await model.generateContent([SYSTEM_PROMPT, `Message: "${userMessage}"`]);
    const raw = result.response.text().trim();

    if (raw === 'null') return null;

    // Strip accidental markdown code fences (```json ... ```)
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    const parsed = JSON.parse(cleaned) as ParsedTransaction;

    // Basic validation
    if (!parsed.type || !parsed.category || !parsed.description) return null;
    if (parsed.type !== 'EXPENSE' && parsed.type !== 'INCOME') return null;

    return parsed;
  } catch (err) {
    console.error('[Gemini] Failed to parse transaction:', err);
    return null;
  }
}
