import { Router } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import { getMemberByFirebaseUid } from '../../services/householdService.js';
import { getMonthlyReportData } from '../../services/reportService.js';

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

export default router;
