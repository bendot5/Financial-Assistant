import { prisma } from '../db/prisma.js';

const cb = () => (prisma as unknown as { categoryBudget: { findMany: (...a: unknown[]) => unknown; upsert: (...a: unknown[]) => unknown; delete: (...a: unknown[]) => unknown } }).categoryBudget;

export async function getCategoryBudgets(householdId: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (prisma as any).categoryBudget.findMany({
    where: { householdId },
    orderBy: { category: 'asc' },
  }) as Promise<{ id: string; category: string; budgetLimit: number }[]>;
}

export async function upsertCategoryBudget(householdId: string, category: string, budgetLimit: number) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (prisma as any).categoryBudget.upsert({
    where: { householdId_category: { householdId, category } },
    update: { budgetLimit },
    create: { householdId, category, budgetLimit },
  });
}

export async function deleteCategoryBudget(householdId: string, category: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (prisma as any).categoryBudget.delete({
    where: { householdId_category: { householdId, category } },
  });
}
