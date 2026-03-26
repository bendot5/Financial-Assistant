import { prisma } from '../db/prisma.js';

export interface RecurringTransactionData {
  householdId: string;
  memberEmail: string;
  type: 'EXPENSE' | 'INCOME';
  amount: number;
  category: string;
  description: string;
  frequency: 'WEEKLY' | 'MONTHLY';
  dayOfWeek?: number;   // 0–6 (Sun–Sat), WEEKLY only
  dayOfMonth?: number;  // 1–31, MONTHLY only
  nextRunAt: Date;
}

export interface RecurringTransaction extends RecurringTransactionData {
  id: string;
  isActive: boolean;
  createdAt: Date;
}

/**
 * Computes the next Date after `from` when a recurring transaction should fire.
 * MONTHLY: same dayOfMonth in the next calendar month (clamped to last day of that month).
 * WEEKLY:  next occurrence of dayOfWeek (0=Sun…6=Sat) strictly after `from`.
 * Time is set to 00:05 so the daily cron at 00:05 picks it up on the correct day.
 */
/**
 * Returns the date of the CURRENT period's occurrence (today or most recent past).
 * MONTHLY: the dayOfMonth of the current calendar month (clamped to last day).
 * WEEKLY:  today if today matches, otherwise the most recent past day that matches.
 */
export function computeCurrentPeriodDate(
  frequency: 'WEEKLY' | 'MONTHLY',
  dayOfWeek: number | null | undefined,
  dayOfMonth: number | null | undefined,
  now: Date,
): Date {
  if (frequency === 'MONTHLY') {
    const day = dayOfMonth ?? 1;
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return new Date(now.getFullYear(), now.getMonth(), Math.min(day, lastDay));
  }

  // WEEKLY: walk backward until we land on targetDow
  const targetDow = dayOfWeek ?? 0;
  const d = new Date(now);
  d.setHours(12, 0, 0, 0);
  while (d.getDay() !== targetDow) {
    d.setDate(d.getDate() - 1);
  }
  return d;
}

export function computeNextRunAt(
  frequency: 'WEEKLY' | 'MONTHLY',
  dayOfWeek: number | null | undefined,
  dayOfMonth: number | null | undefined,
  from: Date,
): Date {
  if (frequency === 'MONTHLY') {
    const day = dayOfMonth ?? 1;
    const next = new Date(from.getFullYear(), from.getMonth() + 1, day, 0, 5, 0, 0);
    // Clamp to last day of that month if day > month length
    const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
    next.setDate(Math.min(day, lastDay));
    return next;
  }

  // WEEKLY
  const targetDow = dayOfWeek ?? 0;
  const next = new Date(from);
  next.setHours(0, 5, 0, 0);
  do {
    next.setDate(next.getDate() + 1);
  } while (next.getDay() !== targetDow);
  return next;
}

export async function getRecurringTransactions(householdId: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (prisma as any).recurringTransaction.findMany({
    where: { householdId, isActive: true },
    orderBy: { createdAt: 'desc' },
  }) as Promise<RecurringTransaction[]>;
}

export async function createRecurringTransaction(data: RecurringTransactionData) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (prisma as any).recurringTransaction.create({ data }) as Promise<RecurringTransaction>;
}

export async function deactivateRecurringTransaction(id: string, householdId: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (prisma as any).recurringTransaction.updateMany({
    where: { id, householdId },
    data: { isActive: false },
  }) as Promise<{ count: number }>;
}

/** Fetches all active recurring transactions that are due. Called by the cron job. */
export async function getDueRecurringTransactions(now: Date) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (prisma as any).recurringTransaction.findMany({
    where: { isActive: true, nextRunAt: { lte: now } },
  }) as Promise<RecurringTransaction[]>;
}

export async function updateNextRunAt(id: string, nextRunAt: Date) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (prisma as any).recurringTransaction.update({
    where: { id },
    data: { nextRunAt },
  });
}
