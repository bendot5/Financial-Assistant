import { Router } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import { getMemberByFirebaseUid } from '../../services/householdService.js';
import {
  logTransaction,
  getMonthlyTransactions,
  updateTransaction,
  deleteTransaction,
  getTransactionById,
} from '../../services/transactionService.js';
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
      message: 'לא הצלחתי לזהות פעולה פיננסית. נסה: "הוצאתי 50 על אוכל" או "קיבלתי משכורת 5000".',
    });
    return;
  }

  if (!parsed.amount || parsed.amount <= 0) {
    res.json({
      type: 'MISSING_AMOUNT',
      message: `הבנתי — ${parsed.description} (${parsed.category}). כמה זה עלה?`,
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
    date: parsed.date ? new Date(parsed.date) : undefined,
  });

  const emoji = parsed.type === 'EXPENSE' ? '💸' : '💰';
  const label = parsed.type === 'EXPENSE' ? 'הוצאה נרשמה' : 'הכנסה נרשמה';

  res.status(201).json({
    type: 'SUCCESS',
    transaction,
    message: `${emoji} ${label}!\n\n• סכום: ₪${parsed.amount.toFixed(2)}\n• תחום: ${parsed.category}\n• פירוט: ${parsed.description}`,
  });
});

/**
 * POST /api/transactions/manual
 * Log a transaction directly with structured data (no AI).
 * Body: { type, amount, category, description }
 */
router.post('/manual', async (req, res) => {
  const { uid } = (req as AuthRequest).user;
  const member = await getMemberByFirebaseUid(uid);

  if (!member?.householdId) {
    res.status(403).json({ error: 'Complete onboarding before logging transactions' });
    return;
  }

  const { type, amount, category, description, date } = req.body as {
    type?: string;
    amount?: number;
    category?: string;
    description?: string;
    date?: string;
  };

  if (!type || (type !== 'EXPENSE' && type !== 'INCOME')) {
    res.status(400).json({ error: 'type must be EXPENSE or INCOME' });
    return;
  }
  if (!amount || amount <= 0) {
    res.status(400).json({ error: 'amount must be a positive number' });
    return;
  }
  if (!category?.trim()) {
    res.status(400).json({ error: 'category is required' });
    return;
  }

  const transaction = await logTransaction({
    householdId: member.householdId,
    memberPhone: member.phone,
    type,
    amount,
    category: category.trim(),
    description: (description ?? category).trim(),
    date: date ? new Date(date) : undefined,
  });

  res.status(201).json({ transaction });
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

/**
 * PUT /api/transactions/:id
 * Update a transaction's amount, category, description, or type.
 * Only members of the same household can update.
 */
router.put('/:id', async (req, res) => {
  const { uid } = (req as AuthRequest).user;
  const member = await getMemberByFirebaseUid(uid);
  if (!member?.householdId) { res.status(403).json({ error: 'No household linked' }); return; }

  const tx = await getTransactionById(req.params.id);
  if (!tx || tx.householdId !== member.householdId) {
    res.status(404).json({ error: 'Transaction not found' });
    return;
  }

  const { amount, category, description, type, date } = req.body as {
    amount?: number;
    category?: string;
    description?: string;
    type?: 'EXPENSE' | 'INCOME';
    date?: string | null;
  };

  const updated = await updateTransaction(req.params.id, {
    ...(amount !== undefined && { amount }),
    ...(category !== undefined && { category }),
    ...(description !== undefined && { description }),
    ...(type !== undefined && { type }),
    ...(date !== undefined && { date: date ? new Date(date) : null }),
  });

  res.json({ transaction: updated });
});

/**
 * DELETE /api/transactions/:id
 * Delete a transaction. Only members of the same household can delete.
 */
router.delete('/:id', async (req, res) => {
  const { uid } = (req as AuthRequest).user;
  const member = await getMemberByFirebaseUid(uid);
  if (!member?.householdId) { res.status(403).json({ error: 'No household linked' }); return; }

  const tx = await getTransactionById(req.params.id);
  if (!tx || tx.householdId !== member.householdId) {
    res.status(404).json({ error: 'Transaction not found' });
    return;
  }

  await deleteTransaction(req.params.id);
  res.json({ ok: true });
});

export default router;
