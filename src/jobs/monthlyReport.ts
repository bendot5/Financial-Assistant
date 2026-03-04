import cron from 'node-cron';
import { prisma } from '../db/prisma.js';
import { buildMonthlyReport } from '../services/reportService.js';
import { sendWhatsAppMessage } from '../bot/client.js';

/**
 * Schedules a cron job that runs at 9:00 AM on the 1st of every month.
 * It builds a monthly summary for each household and sends it via WhatsApp
 * to every fully-onboarded member.
 *
 * The report covers the PREVIOUS month (e.g. running Feb 1 → reports on January).
 */
export function startMonthlyReportJob(): void {
  cron.schedule('0 9 1 * *', async () => {
    console.log('[CronJob] Monthly report job started.');

    // Compute the previous month (handles January → December of prior year)
    const now = new Date();
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const reportMonth = prevMonth.getMonth() + 1; // convert to 1-indexed
    const reportYear = prevMonth.getFullYear();

    const label = prevMonth.toLocaleString('default', { month: 'long', year: 'numeric' });
    console.log(`[CronJob] Generating ${label} reports...`);

    const households = await prisma.household.findMany({
      include: {
        // Only include members who completed onboarding
        members: { where: { onboardingStep: 'COMPLETE' } },
      },
    });

    for (const household of households) {
      if (household.members.length === 0) continue;

      const report = await buildMonthlyReport(household.id, reportYear, reportMonth);
      if (!report) continue;

      for (const member of household.members) {
        try {
          await sendWhatsAppMessage(member.phone, report);
          console.log(`[CronJob] Sent report to ${member.phone}`);
        } catch (err) {
          console.error(`[CronJob] Failed to send to ${member.phone}:`, err);
        }
      }
    }

    console.log('[CronJob] Monthly report job completed.');
  });

  console.log('[CronJob] Scheduled: monthly summary on the 1st of each month at 09:00.');
}
