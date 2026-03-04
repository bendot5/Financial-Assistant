import { prisma } from '../db/prisma.js';
import { getMonthlyTransactions } from './transactionService.js';

/**
 * Builds a formatted WhatsApp-friendly monthly summary string.
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
