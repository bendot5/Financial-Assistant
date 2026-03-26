import { Router } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import { getMemberByFirebaseUid } from '../../services/householdService.js';
import {
  getRecurringTransactions,
  createRecurringTransaction,
  deactivateRecurringTransaction,
  computeNextRunAt,
  computeCurrentPeriodDate,
} from '../../services/recurringTransactionService.js';
import { logTransaction } from '../../services/transactionService.js';

const router = Router();

/** GET /api/recurring-transactions — list all active for household */
router.get('/', async (req, res) => {
  const { uid } = (req as AuthRequest).user;
  const member = await getMemberByFirebaseUid(uid);
  if (!member?.householdId) { res.status(403).json({ error: 'No household linked' }); return; }
  const recurringTransactions = await getRecurringTransactions(member.householdId);
  res.json({ recurringTransactions });
});

/** POST /api/recurring-transactions — create a new recurring transaction */
router.post('/', async (req, res) => {
  const { uid } = (req as AuthRequest).user;
  const member = await getMemberByFirebaseUid(uid);
  if (!member?.householdId) { res.status(403).json({ error: 'No household linked' }); return; }

  const { type, amount, category, description, frequency, dayOfWeek, dayOfMonth } = req.body as {
    type?: string;
    amount?: number;
    category?: string;
    description?: string;
    frequency?: string;
    dayOfWeek?: number;
    dayOfMonth?: number;
  };

  if (!type || (type !== 'EXPENSE' && type !== 'INCOME')) {
    res.status(400).json({ error: 'type must be EXPENSE or INCOME' }); return;
  }
  if (!amount || amount <= 0) {
    res.status(400).json({ error: 'amount must be positive' }); return;
  }
  if (!category?.trim()) {
    res.status(400).json({ error: 'category is required' }); return;
  }
  if (!frequency || (frequency !== 'WEEKLY' && frequency !== 'MONTHLY')) {
    res.status(400).json({ error: 'frequency must be WEEKLY or MONTHLY' }); return;
  }
  if (frequency === 'WEEKLY' && (dayOfWeek == null || dayOfWeek < 0 || dayOfWeek > 6)) {
    res.status(400).json({ error: 'dayOfWeek (0–6) is required for WEEKLY frequency' }); return;
  }
  if (frequency === 'MONTHLY' && (dayOfMonth == null || dayOfMonth < 1 || dayOfMonth > 31)) {
    res.status(400).json({ error: 'dayOfMonth (1–31) is required for MONTHLY frequency' }); return;
  }

  const nextRunAt = computeNextRunAt(
    frequency as 'WEEKLY' | 'MONTHLY',
    dayOfWeek,
    dayOfMonth,
    new Date(),
  );

  const now = new Date();
  const finalDescription = (description ?? category).trim();

  const recurringTransaction = await createRecurringTransaction({
    householdId: member.householdId,
    memberEmail: member.email,
    type: type as 'EXPENSE' | 'INCOME',
    amount,
    category: category.trim(),
    description: finalDescription,
    frequency: frequency as 'WEEKLY' | 'MONTHLY',
    dayOfWeek: frequency === 'WEEKLY' ? dayOfWeek : undefined,
    dayOfMonth: frequency === 'MONTHLY' ? dayOfMonth : undefined,
    nextRunAt,
  });

  // Immediately log a transaction for the current period (current month / most recent week day)
  const currentPeriodDate = computeCurrentPeriodDate(
    frequency as 'WEEKLY' | 'MONTHLY',
    dayOfWeek,
    dayOfMonth,
    now,
  );
  await logTransaction({
    householdId: member.householdId,
    memberEmail: member.email,
    type: type as 'EXPENSE' | 'INCOME',
    amount,
    category: category.trim(),
    description: finalDescription,
    date: currentPeriodDate,
  });

  res.status(201).json({ recurringTransaction });
});

/** DELETE /api/recurring-transactions/:id — soft-delete */
router.delete('/:id', async (req, res) => {
  const { uid } = (req as unknown as AuthRequest).user;
  const member = await getMemberByFirebaseUid(uid);
  if (!member?.householdId) { res.status(403).json({ error: 'No household linked' }); return; }

  const result = await deactivateRecurringTransaction(req.params.id, member.householdId);
  if (result.count === 0) {
    res.status(404).json({ error: 'Not found or not authorized' }); return;
  }
  res.json({ ok: true });
});

export default router;
