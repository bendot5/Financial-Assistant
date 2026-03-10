import { prisma } from '../db/prisma.js';
import { getMonthlyTransactions } from './transactionService.js';

export interface MonthlyReportData {
  month: number;
  year: number;
  monthName: string;
  householdName: string | null;
  budgetLimit: number;
  totalExpenses: number;
  totalIncome: number;
  budgetUsedPct: number;
  remaining: number;
  topCategories: { category: string; amount: number; pct: number }[];
  incomeCategories: { category: string; amount: number; pct: number }[];
  categoryBudgets: { category: string; budgetLimit: number; spent: number; pct: number }[];
  dailyExpenses: { day: number; amount: number }[];
  transactionCount: number;
}

export interface WeeklyReportData {
  weekOf: string;
  totalExpenses: number;
  totalIncome: number;
  weeklyBudget: number;
  budgetUsedPct: number;
  topCategories: { category: string; amount: number; pct: number }[];
  categoryBudgets: { category: string; weeklyLimit: number; spent: number; pct: number }[];
}

/**
 * Returns structured data for the mobile app's monthly report screen.
 * @param month - 1-indexed
 */
export async function getMonthlyReportData(
  householdId: string,
  year: number,
  month: number,
): Promise<MonthlyReportData | null> {
  const [household, categoryBudgetsRaw] = await Promise.all([
    prisma.household.findUnique({ where: { id: householdId } }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prisma as any).categoryBudget.findMany({ where: { householdId } }),
  ]);
  if (!household) return null;

  const transactions = await getMonthlyTransactions(householdId, year, month);
  const expenses = transactions.filter((t) => t.type === 'EXPENSE');
  const incomes = transactions.filter((t) => t.type === 'INCOME');

  const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0);
  const totalIncome = incomes.reduce((sum, t) => sum + t.amount, 0);

  const byCategory: Record<string, number> = {};
  for (const t of expenses) {
    byCategory[t.category] = (byCategory[t.category] ?? 0) + t.amount;
  }
  const topCategories = Object.entries(byCategory)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([category, amount]) => ({
      category,
      amount,
      pct: totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0,
    }));

  const byIncomeCategory: Record<string, number> = {};
  for (const t of incomes) {
    byIncomeCategory[t.category] = (byIncomeCategory[t.category] ?? 0) + t.amount;
  }
  const incomeCategories = Object.entries(byIncomeCategory)
    .sort(([, a], [, b]) => b - a)
    .map(([category, amount]) => ({
      category,
      amount,
      pct: totalIncome > 0 ? Math.round((amount / totalIncome) * 100) : 0,
    }));

  // Category budgets vs. actual spending
  const categoryBudgets = (categoryBudgetsRaw as { category: string; budgetLimit: number }[]).map((cb) => {
    const spent = byCategory[cb.category] ?? 0;
    return {
      category: cb.category,
      budgetLimit: cb.budgetLimit,
      spent,
      pct: cb.budgetLimit > 0 ? Math.round((spent / cb.budgetLimit) * 100) : 0,
    };
  });

  // Daily expense totals for the month (day 1–31)
  const byDay: Record<number, number> = {};
  for (const t of expenses) {
    const d = new Date((t as { date?: Date | null; createdAt: Date }).date ?? t.createdAt).getDate();
    byDay[d] = (byDay[d] ?? 0) + t.amount;
  }
  const daysInMonth = new Date(year, month, 0).getDate();
  const dailyExpenses = Array.from({ length: daysInMonth }, (_, i) => ({
    day: i + 1,
    amount: byDay[i + 1] ?? 0,
  }));

  const budgetLimit = household.budgetLimit;
  const budgetUsedPct = budgetLimit > 0 ? Math.round((totalExpenses / budgetLimit) * 100) : 0;
  const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' });

  return {
    month,
    year,
    monthName,
    householdName: household.name,
    budgetLimit,
    totalExpenses,
    totalIncome,
    budgetUsedPct,
    remaining: budgetLimit - totalExpenses,
    topCategories,
    incomeCategories,
    categoryBudgets,
    dailyExpenses,
    transactionCount: expenses.length,
  };
}

export async function getWeeklyReportData(householdId: string): Promise<WeeklyReportData | null> {
  const [household, categoryBudgetsRaw] = await Promise.all([
    prisma.household.findUnique({ where: { id: householdId } }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prisma as any).categoryBudget.findMany({ where: { householdId } }),
  ]);
  if (!household) return null;

  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const transactions = await prisma.transaction.findMany({
    where: { householdId, createdAt: { gte: monday, lte: sunday } },
  });

  const expenses = transactions.filter((t) => t.type === 'EXPENSE');
  const incomes = transactions.filter((t) => t.type === 'INCOME');
  const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0);
  const totalIncome = incomes.reduce((sum, t) => sum + t.amount, 0);

  const byCategory: Record<string, number> = {};
  for (const t of expenses) {
    byCategory[t.category] = (byCategory[t.category] ?? 0) + t.amount;
  }
  const topCategories = Object.entries(byCategory)
    .sort(([, a], [, b]) => b - a)
    .map(([category, amount]) => ({
      category, amount,
      pct: totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0,
    }));

  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const weeklyBudget = household.budgetLimit > 0 ? Math.round((household.budgetLimit * 7) / daysInMonth) : 0;

  const categoryBudgets = (categoryBudgetsRaw as { category: string; budgetLimit: number }[]).map((cb) => {
    const weeklyLimit = Math.round((cb.budgetLimit * 7) / daysInMonth);
    const spent = byCategory[cb.category] ?? 0;
    return {
      category: cb.category,
      weeklyLimit,
      spent,
      pct: weeklyLimit > 0 ? Math.round((spent / weeklyLimit) * 100) : 0,
    };
  });

  return {
    weekOf: monday.toISOString().slice(0, 10),
    totalExpenses,
    totalIncome,
    weeklyBudget,
    budgetUsedPct: weeklyBudget > 0 ? Math.round((totalExpenses / weeklyBudget) * 100) : 0,
    topCategories,
    categoryBudgets,
  };
}

/**
 * Builds a plain-text push notification summary (short, fits a notification body).
 * @param month - 1-indexed
 */
export async function buildMonthlyReport(
  householdId: string,
  year: number,
  month: number,
): Promise<string | null> {
  const household = await prisma.household.findUnique({ where: { id: householdId } });
  if (!household) return null;

  const transactions = await getMonthlyTransactions(householdId, year, month);
  const expenses = transactions.filter((t) => t.type === 'EXPENSE');
  const incomes = transactions.filter((t) => t.type === 'INCOME');

  const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0);
  const totalIncome = incomes.reduce((sum, t) => sum + t.amount, 0);

  // Aggregate expenses by category, descending
  const byCategory: Record<string, number> = {};
  for (const t of expenses) {
    byCategory[t.category] = (byCategory[t.category] ?? 0) + t.amount;
  }
  const topCategories = Object.entries(byCategory)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  const budgetLimit = household.budgetLimit;
  const pct = budgetLimit > 0 ? Math.round((totalExpenses / budgetLimit) * 100) : 0;
  const remaining = budgetLimit - totalExpenses;

  const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' });

  // Build the message line by line
  const lines: string[] = [];
  lines.push(`📊 *${monthName} ${year} Summary*`);
  if (household.name) lines.push(`🏠 _${household.name}_`);
  lines.push('');
  lines.push(`💰 Budget:  $${budgetLimit.toFixed(2)}`);
  lines.push(`💸 Spent:   $${totalExpenses.toFixed(2)} _(${pct}%)_`);
  if (totalIncome > 0) lines.push(`📈 Income:  $${totalIncome.toFixed(2)}`);
  lines.push(`💵 Left:    $${remaining.toFixed(2)}`);

  if (topCategories.length > 0) {
    lines.push('');
    lines.push('📌 *Top Categories:*');
    for (const [cat, amount] of topCategories) {
      const catPct =
        totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0;
      lines.push(`  • ${cat}: $${amount.toFixed(2)} (${catPct}%)`);
    }
  }

  lines.push('');
  if (expenses.length === 0) {
    lines.push('✨ No expenses logged this month.');
  } else if (pct > 100) {
    lines.push(
      `⚠️ Budget exceeded by $${Math.abs(remaining).toFixed(2)}! Review your spending.`,
    );
  } else if (pct >= 85) {
    lines.push(`⚡ Almost at your limit — only $${remaining.toFixed(2)} left.`);
  } else {
    lines.push('✅ Great job staying within budget!');
  }

  return lines.join('\n');
}
