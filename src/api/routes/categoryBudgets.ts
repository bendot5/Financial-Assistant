import { Router } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import { getMemberByFirebaseUid } from '../../services/householdService.js';
import {
  getCategoryBudgets,
  upsertCategoryBudget,
  deleteCategoryBudget,
} from '../../services/categoryBudgetService.js';

const router = Router();

/** GET /api/category-budgets — list all for household */
router.get('/', async (req, res) => {
  const { uid } = (req as AuthRequest).user;
  const member = await getMemberByFirebaseUid(uid);
  if (!member?.householdId) { res.status(403).json({ error: 'No household linked' }); return; }
  const budgets = await getCategoryBudgets(member.householdId);
  res.json({ budgets });
});

/** PUT /api/category-budgets — upsert a category budget */
router.put('/', async (req, res) => {
  const { uid } = (req as AuthRequest).user;
  const member = await getMemberByFirebaseUid(uid);
  if (!member?.householdId) { res.status(403).json({ error: 'No household linked' }); return; }

  const { category, budgetLimit } = req.body as { category?: string; budgetLimit?: number };
  if (!category?.trim()) { res.status(400).json({ error: 'category is required' }); return; }
  if (!budgetLimit || budgetLimit <= 0) { res.status(400).json({ error: 'budgetLimit must be positive' }); return; }

  const budget = await upsertCategoryBudget(member.householdId, category.trim(), budgetLimit);
  res.json({ budget });
});

/** DELETE /api/category-budgets/:category — remove a category budget */
router.delete('/:category', async (req, res) => {
  const { uid } = (req as AuthRequest).user;
  const member = await getMemberByFirebaseUid(uid);
  if (!member?.householdId) { res.status(403).json({ error: 'No household linked' }); return; }

  try {
    await deleteCategoryBudget(member.householdId, decodeURIComponent(req.params.category));
    res.json({ ok: true });
  } catch {
    res.status(404).json({ error: 'Budget not found' });
  }
});

export default router;
