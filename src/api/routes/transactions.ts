import { Router } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import { getMemberByFirebaseUid } from '../../services/householdService.js';
import { logTransaction, getMonthlyTransactions } from '../../services/transactionService.js';
import { parseTransaction } from '../../ai/gemini.js';

const router = Router();

/**
 * POST /api/transactions
 * Send a free-text message; Gemini extracts the transaction and logs it.
 * Body:   { message: string }
 * Returns: { type: 'SUCCESS' | 'NOT_TRANSACTION' | 'MISSING_AMOUNT', message, transaction? }
 */
router.post('/', async (req, res) => {
  const { uid } = (req as AuthRequest).user;
  const member = await getMemberByFirebaseUid(uid);

  if (!member?.householdId) {
    res.status(403).json({ error: 'Complete onboarding before logging transactions' });
    return;
  }

  const { message: text } = req.body as { message?: string };
  if (!text?.trim()) {
    res.status(400).json({ error: 'message is required' });
    return;
  }

  console.log('[Transactions] Calling Gemini for:', text);
  let parsed: Awaited<ReturnType<typeof parseTransaction>>;
  try {
    parsed = await parseTransaction(text);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Transactions] Gemini API error:', msg);
    res.json({ type: 'NOT_TRANSACTION', message: `⚠️ AI error: ${msg}` });
    return;
  }
  console.log('[Transactions] Gemini result:', parsed);

  if (!parsed) {
    res.json({
      type: 'NOT_TRANSACTION',
      message:
        "I couldn't identify a transaction. Try: \"Spent 50 on lunch\" or \"Received salary 5000\".",
    });
    return;
  }

  if (!parsed.amount || parsed.amount <= 0) {
    res.json({
      type: 'MISSING_AMOUNT',
      message: `Got it — *${parsed.description}* (${parsed.category}). How much was it?`,
    });
    return;
  }

  const transaction = await logTransaction({
    householdId: member.householdId,
    memberPhone: member.phone,
    type: parsed.type,
    amount: parsed.amount,
    category: parsed.category,
    description: parsed.description,
  });

  const emoji = parsed.type === 'EXPENSE' ? '💸' : '💰';
  const label = parsed.type === 'EXPENSE' ? 'Expense' : 'Income';

  res.status(201).json({
    type: 'SUCCESS',
    transaction,
    message: `${emoji} ${label} logged!\n\n• Amount: $${parsed.amount.toFixed(2)}\n• Category: ${parsed.category}\n• Note: ${parsed.description}`,
  });
});

/**
 * GET /api/transactions?month=3&year=2025
 * Returns all transactions for the household in the given month.
 * Defaults to the current month/year.
 */
router.get('/', async (req, res) => {
  const { uid } = (req as AuthRequest).user;
  const member = await getMemberByFirebaseUid(uid);

  if (!member?.householdId) {
    res.status(403).json({ error: 'No household linked' });
    return;
  }

  const now = new Date();
  const month = Number(req.query.month) || now.getMonth() + 1;
  const year = Number(req.query.year) || now.getFullYear();

  const transactions = await getMonthlyTransactions(member.householdId, year, month);
  res.json({ transactions });
});

export default router;
