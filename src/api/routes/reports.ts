import { Router } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import { getMemberByFirebaseUid } from '../../services/householdService.js';
import { getMonthlyReportData, getWeeklyReportData } from '../../services/reportService.js';
import { prisma } from '../../db/prisma.js';
import { sendPushNotifications } from '../../lib/expoPush.js';

const router = Router();

/**
 * GET /api/reports/monthly?month=3&year=2025
 * Returns structured monthly report data for the mobile app to render.
 * Defaults to the current month/year.
 */
router.get('/monthly', async (req, res) => {
  const { uid } = (req as AuthRequest).user;
  const member = await getMemberByFirebaseUid(uid);

  if (!member?.householdId) {
    res.status(403).json({ error: 'No household linked' });
    return;
  }

  const now = new Date();
  const month = Number(req.query.month) || now.getMonth() + 1;
  const year = Number(req.query.year) || now.getFullYear();

  const data = await getMonthlyReportData(member.householdId, year, month);
  if (!data) {
    res.status(404).json({ error: 'Household not found' });
    return;
  }

  res.json(data);
});

/** GET /api/reports/weekly — returns current week summary */
router.get('/weekly', async (req, res) => {
  const { uid } = (req as AuthRequest).user;
  const member = await getMemberByFirebaseUid(uid);
  if (!member?.householdId) { res.status(403).json({ error: 'No household linked' }); return; }

  const data = await getWeeklyReportData(member.householdId);
  if (!data) { res.status(404).json({ error: 'Household not found' }); return; }
  res.json(data);
});

/**
 * POST /api/reports/monthly/trigger?month=2&year=2026
 * Manually triggers the monthly report push notification for all households.
 * Uses the requesting user's household if month/year not specified.
 * For testing purposes.
 */
router.post('/monthly/trigger', async (req, res) => {
  const { uid } = (req as AuthRequest).user;
  const member = await getMemberByFirebaseUid(uid);
  if (!member?.householdId) { res.status(403).json({ error: 'No household linked' }); return; }

  const now = new Date();
  const month = Number(req.query.month) || now.getMonth() + 1;
  const year = Number(req.query.year) || now.getFullYear();

  const households = await prisma.household.findMany({
    include: {
      members: {
        where: { onboardingStep: 'COMPLETE', pushToken: { not: null } },
      },
    },
  });

  const results: string[] = [];
  for (const household of households) {
    const data = await getMonthlyReportData(household.id, year, month);
    if (!data) continue;

    const tokens = household.members.map((m) => m.pushToken).filter(Boolean) as string[];
    if (tokens.length === 0) {
      results.push(`${household.name}: אין טוקנים`);
      continue;
    }

    const budgetLine =
      data.budgetUsedPct > 100
        ? `חריגה של ₪${Math.abs(data.remaining).toFixed(0)} מהתקציב!`
        : `נותר ₪${data.remaining.toFixed(0)} מתוך ₪${data.budgetLimit.toFixed(0)}`;

    await sendPushNotifications(tokens, {
      title: `📊 סיכום ${data.monthName} ${data.year}`,
      body: `הוצאות: ₪${data.totalExpenses.toFixed(0)} (${data.budgetUsedPct}%) — ${budgetLine}`,
      data: { screen: '/reports', month, year },
    });

    results.push(`${household.name}: נשלח ל-${tokens.length} חברים`);
  }

  res.json({ ok: true, month, year, results });
});

export default router;
