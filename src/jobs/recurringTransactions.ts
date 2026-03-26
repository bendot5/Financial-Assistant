import cron from 'node-cron';
import {
  getDueRecurringTransactions,
  updateNextRunAt,
  computeNextRunAt,
} from '../services/recurringTransactionService.js';
import { logTransaction } from '../services/transactionService.js';

/**
 * Runs daily at 00:05.
 * Finds all active recurring transactions where nextRunAt <= now,
 * creates the corresponding Transaction records, and advances nextRunAt.
 */
export function startRecurringTransactionJob(): void {
  cron.schedule('5 0 * * *', async () => {
    console.log('[CronJob] Recurring transactions job started.');
    const now = new Date();

    let dueItems: Awaited<ReturnType<typeof getDueRecurringTransactions>>;
    try {
      dueItems = await getDueRecurringTransactions(now);
    } catch (err) {
      console.error('[CronJob] Failed to fetch due recurring transactions:', err);
      return;
    }

    console.log(`[CronJob] Found ${dueItems.length} due recurring transaction(s).`);

    for (const item of dueItems) {
      try {
        await logTransaction({
          householdId: item.householdId,
          memberEmail: item.memberEmail,
          type: item.type as 'EXPENSE' | 'INCOME',
          amount: item.amount,
          category: item.category,
          description: item.description,
          date: now,
        });

        const nextRunAt = computeNextRunAt(
          item.frequency as 'WEEKLY' | 'MONTHLY',
          item.dayOfWeek,
          item.dayOfMonth,
          now,
        );
        await updateNextRunAt(item.id, nextRunAt);

        console.log(
          `[CronJob] Logged recurring "${item.description}" ₪${item.amount} → next: ${nextRunAt.toISOString()}`,
        );
      } catch (err) {
        console.error(`[CronJob] Error processing recurring ${item.id}:`, err);
      }
    }

    console.log('[CronJob] Recurring transactions job completed.');
  });

  console.log('[CronJob] Scheduled: recurring transactions daily at 00:05.');
}
