import { Router } from 'express';
import { admin } from '../../lib/firebaseAdmin.js';
import { upsertMemberByPhone } from '../../services/householdService.js';

const router = Router();

/**
 * POST /api/auth/verify
 * Validates a Firebase ID token and creates or retrieves the member record.
 * Called by the mobile app immediately after successful Firebase phone auth.
 *
 * Body:   { idToken: string }
 * Returns: { member, isNew: boolean }
 */
router.post('/verify', async (req, res) => {
  try {
    const { idToken } = req.body as { idToken?: string };
    if (!idToken) {
      res.status(400).json({ error: 'idToken is required' });
      return;
    }

    const decoded = await admin.auth().verifyIdToken(idToken);
    const phone = decoded.phone_number;
    if (!phone) {
      res.status(400).json({ error: 'Token does not contain a phone number' });
      return;
    }

    const { member, isNew } = await upsertMemberByPhone(phone, decoded.uid);
    res.status(200).json({ member, isNew });
  } catch (err) {
    console.error('[Auth] /verify error:', err);
    res.status(401).json({ error: 'Token verification failed' });
  }
});

export default router;
