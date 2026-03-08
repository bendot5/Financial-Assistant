import { Router } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import { getMemberByFirebaseUid, updateMember } from '../../services/householdService.js';

const router = Router();

/** GET /api/profile — current member + household */
router.get('/', async (req, res) => {
  const { uid } = (req as AuthRequest).user;
  const member = await getMemberByFirebaseUid(uid);
  if (!member) {
    res.status(404).json({ error: 'Member not found' });
    return;
  }
  res.json({ member });
});

/**
 * PUT /api/profile
 * Update mutable profile fields: name, pushToken.
 * Also used during onboarding to progress the wizard step.
 *
 * Body: { name?, pushToken?, onboardingStep?, pendingIncome?, householdId? }
 */
router.put('/', async (req, res) => {
  const { uid, phone } = (req as AuthRequest).user;

  const member = await getMemberByFirebaseUid(uid);
  if (!member) {
    res.status(404).json({ error: 'Member not found' });
    return;
  }

  const { name, pushToken, onboardingStep, pendingIncome, householdId } = req.body as {
    name?: string;
    pushToken?: string;
    onboardingStep?: string;
    pendingIncome?: number | null;
    householdId?: string | null;
  };

  const updated = await updateMember(phone, {
    name,
    pushToken,
    onboardingStep,
    pendingIncome,
    householdId,
  });

  res.json({ member: updated });
});

export default router;
