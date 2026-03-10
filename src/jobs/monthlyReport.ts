import cron from 'node-cron';
import { prisma } from '../db/prisma.js';
import { getMonthlyReportData } from '../services/reportService.js';
import { sendPushNotifications } from '../lib/expoPush.js';

/**
 * Schedules a cron job that runs at 9:00 AM on the 1st of every month.
 * Sends a push notification to every onboarded member who has a push token.
 * The report covers the PREVIOUS month (e.g. running Feb 1 → reports on January).
 */
export function startMonthlyReportJob(): void {
  cron.schedule('0 9 1 * *', async () => {
    console.log('[CronJob] Monthly report job started.');

    const now = new Date();
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const reportMonth = prevMonth.getMonth() + 1;
    const reportYear = prevMonth.getFullYear();

    const label = prevMonth.toLocaleString('default', { month: 'long', year: 'numeric' });
    console.log(`[CronJob] Generating ${label} reports...`);

    const households = await prisma.household.findMany({
      include: {
        members: {
          where: { onboardingStep: 'COMPLETE', pushToken: { not: null } },
        },
      },
    });

    for (const household of households) {
      if (household.members.length === 0) continue;

      const data = await getMonthlyReportData(household.id, reportYear, reportMonth);
      if (!data) continue;

      const tokens = household.members.map((m) => m.pushToken).filter(Boolean) as string[];
      if (tokens.length === 0) continue;

      const budgetLine =
        data.budgetUsedPct > 100
          ? `חריגה של ₪${Math.abs(data.remaining).toFixed(0)} מהתקציב!`
          : `נותר ₪${data.remaining.toFixed(0)} מתוך ₪${data.budgetLimit.toFixed(0)}`;

      await sendPushNotifications(tokens, {
        title: `📊 סיכום ${data.monthName} ${data.year}`,
        body: `הוצאות: ₪${data.totalExpenses.toFixed(0)} (${data.budgetUsedPct}%) — ${budgetLine}`,
        data: { screen: '/reports', month: reportMonth, year: reportYear },
      });

      console.log(`[CronJob] Notified ${tokens.length} member(s) in household "${household.name}"`);
    }

    console.log('[CronJob] Monthly report job completed.');
  });

  console.log('[CronJob] Scheduled: monthly push notification on the 1st at 09:00.');
}
