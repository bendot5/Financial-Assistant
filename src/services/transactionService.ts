import { prisma } from '../db/prisma.js';

export interface CreateTransactionInput {
  householdId: string;
  memberPhone: string;
  type: 'EXPENSE' | 'INCOME';
  amount: number;
  category: string;
  description: string;
}

export async function logTransaction(input: CreateTransactionInput) {
  return prisma.transaction.create({ data: input });
}

/**
 * Returns all transactions for a household in a given month.
 * @param month - 1-indexed (1 = January, 12 = December)
 */
export async function getMonthlyTransactions(
  householdId: string,
  year: number,
  month: number,
) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999); // last millisecond of the month
  return prisma.transaction.findMany({
    where: { householdId, createdAt: { gte: start, lte: end } },
    orderBy: { createdAt: 'desc' },
  });
}
