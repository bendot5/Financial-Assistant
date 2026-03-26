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
import { parseTransaction, parseTransactionFromImage } from '../../ai/gemini.js';

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

  // Split into valid (has amount) and missing-amount transactions
  const valid = parsed.filter((t) => t.amount && t.amount > 0);
  const missingAmount = parsed.filter((t) => !t.amount || t.amount <= 0);

  if (valid.length === 0 && missingAmount.length > 0) {
    const first = missingAmount[0];
    res.json({
      type: 'MISSING_AMOUNT',
      message: `הבנתי — ${first.description} (${first.category}). כמה זה עלה?`,
    });
    return;
  }

  if (valid.length === 0) {
    res.json({
      type: 'NOT_TRANSACTION',
      message: 'לא הצלחתי לזהות פעולה פיננסית. נסה: "הוצאתי 50 על אוכל" או "קיבלתי משכורת 5000".',
    });
    return;
  }

  // Log all valid transactions
  const transactions = await Promise.all(
    valid.map((t) =>
      logTransaction({
        householdId: member.householdId!,
        memberEmail: member.email,
        type: t.type,
        amount: t.amount!,
        category: t.category,
        description: t.description,
        date: t.date ? new Date(t.date) : undefined,
      }),
    ),
  );

  let message: string;
  if (transactions.length === 1) {
    const t = valid[0];
    const emoji = t.type === 'EXPENSE' ? '💸' : '💰';
    const label = t.type === 'EXPENSE' ? 'הוצאה נרשמה' : 'הכנסה נרשמה';
    message = `${emoji} ${label}!\n\n• סכום: ₪${t.amount!.toFixed(2)}\n• תחום: ${t.category}\n• פירוט: ${t.description}`;
  } else {
    const lines = valid.map((t) => {
      const emoji = t.type === 'EXPENSE' ? '💸' : '💰';
      return `${emoji} ${t.description} — ₪${t.amount!.toFixed(2)} (${t.category})`;
    });
    message = `✅ נרשמו ${transactions.length} פעולות:\n\n${lines.join('\n')}`;
  }

  res.status(201).json({
    type: 'SUCCESS',
    transactions,
    message,
  });
});

/**
 * POST /api/transactions/image
 * Send a base64-encoded image; Gemini vision extracts transactions and logs them.
 * Body:   { imageBase64: string, mimeType?: string }
 * Returns: same shape as POST /api/transactions
 */
router.post('/image', async (req, res) => {
  const { uid } = (req as AuthRequest).user;
  const member = await getMemberByFirebaseUid(uid);

  if (!member?.householdId) {
    res.status(403).json({ error: 'Complete onboarding before logging transactions' });
    return;
  }

  const { imageBase64, mimeType = 'image/jpeg' } = req.body as {
    imageBase64?: string;
    mimeType?: string;
  };

  if (!imageBase64?.trim()) {
    res.status(400).json({ error: 'imageBase64 is required' });
    return;
  }

  if (imageBase64.startsWith('data:')) {
    res.status(400).json({ error: 'Send raw base64 only, not a data URI' });
    return;
  }

  console.log('[Transactions/Image] Calling Gemini vision...');
  let parsed: Awaited<ReturnType<typeof parseTransactionFromImage>>;
  try {
    parsed = await parseTransactionFromImage(imageBase64, mimeType);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Transactions/Image] Gemini API error:', msg);
    res.json({ type: 'NOT_TRANSACTION', message: `⚠️ AI error: ${msg}` });
    return;
  }

  if (!parsed) {
    res.json({
      type: 'NOT_TRANSACTION',
      message: 'לא הצלחתי לזהות עסקאות בתמונה. נסה תמונה ברורה יותר של קבלה.',
    });
    return;
  }

  const valid = parsed.filter((t) => t.amount && t.amount > 0);
  const missingAmount = parsed.filter((t) => !t.amount || t.amount <= 0);

  if (valid.length === 0 && missingAmount.length > 0) {
    const first = missingAmount[0];
    res.json({
      type: 'MISSING_AMOUNT',
      message: `הבנתי — ${first.description} (${first.category}). כמה זה עלה?`,
    });
    return;
  }

  if (valid.length === 0) {
    res.json({
      type: 'NOT_TRANSACTION',
      message: 'לא הצלחתי לזהות עסקאות בתמונה. נסה תמונה ברורה יותר של קבלה.',
    });
    return;
  }

  const transactions = await Promise.all(
    valid.map((t) =>
      logTransaction({
        householdId: member.householdId!,
        memberEmail: member.email,
        type: t.type,
        amount: t.amount!,
        category: t.category,
        description: t.description,
        date: t.date ? new Date(t.date) : undefined,
      }),
    ),
  );

  let message: string;
  if (transactions.length === 1) {
    const t = valid[0];
    const emoji = t.type === 'EXPENSE' ? '💸' : '💰';
    const label = t.type === 'EXPENSE' ? 'הוצאה נרשמה מהתמונה' : 'הכנסה נרשמה מהתמונה';
    message = `${emoji} ${label}!\n\n• סכום: ₪${t.amount!.toFixed(2)}\n• תחום: ${t.category}\n• פירוט: ${t.description}`;
  } else {
    const lines = valid.map((t) => {
      const emoji = t.type === 'EXPENSE' ? '💸' : '💰';
      return `${emoji} ${t.description} — ₪${t.amount!.toFixed(2)} (${t.category})`;
    });
    message = `✅ נרשמו ${transactions.length} פעולות מהתמונה:\n\n${lines.join('\n')}`;
  }

  res.status(201).json({ type: 'SUCCESS', transactions, message });
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
    householdId: member.householdId!,
    memberEmail: member.email,
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
  const { uid } = (req as unknown as AuthRequest).user;
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
  const { uid } = (req as unknown as AuthRequest).user;
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
