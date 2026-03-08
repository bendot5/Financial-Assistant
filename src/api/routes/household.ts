import { Router } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import {
  getMemberByFirebaseUid,
  createHousehold,
  findHouseholdByCode,
  updateMember,
  getHouseholdMembers,
} from '../../services/householdService.js';

const router = Router();

/** GET /api/household — household info + members */
router.get('/', async (req, res) => {
  const { uid } = (req as AuthRequest).user;
  const member = await getMemberByFirebaseUid(uid);

  if (!member?.householdId || !member.household) {
    res.status(404).json({ error: 'No household linked' });
    return;
  }

  const members = await getHouseholdMembers(member.householdId);
  res.json({ household: member.household, members });
});

/**
 * POST /api/household — create a new household
 * Body: { name?, monthlyIncome: number, budgetLimit: number }
 */
router.post('/', async (req, res) => {
  const { uid, phone } = (req as AuthRequest).user;
  const member = await getMemberByFirebaseUid(uid);
  if (!member) { res.status(404).json({ error: 'Member not found' }); return; }

  const { monthlyIncome, budgetLimit, name } = req.body as {
    monthlyIncome: number;
    budgetLimit: number;
    name?: string;
  };

  if (!monthlyIncome || !budgetLimit) {
    res.status(400).json({ error: 'monthlyIncome and budgetLimit are required' });
    return;
  }

  const household = await createHousehold({
    name: name ?? `${member.name ?? 'My'}'s Household`,
    monthlyIncome,
    budgetLimit,
  });

  await updateMember(phone, { householdId: household.id, onboardingStep: 'COMPLETE', pendingIncome: null });

  res.status(201).json({ household });
});

/**
 * POST /api/household/join — join via invite code
 * Body: { inviteCode: string }
 */
router.post('/join', async (req, res) => {
  const { uid, phone } = (req as AuthRequest).user;
  const member = await getMemberByFirebaseUid(uid);
  if (!member) { res.status(404).json({ error: 'Member not found' }); return; }

  const { inviteCode } = req.body as { inviteCode?: string };
  if (!inviteCode) { res.status(400).json({ error: 'inviteCode is required' }); return; }

  const household = await findHouseholdByCode(inviteCode);
  if (!household) {
    res.status(404).json({ error: `Invite code "${inviteCode.toUpperCase()}" not found` });
    return;
  }

  await updateMember(phone, { householdId: household.id, onboardingStep: 'COMPLETE' });

  const members = await getHouseholdMembers(household.id);
  res.json({ household, members });
});

export default router;
