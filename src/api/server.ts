import express from 'express';
import cors from 'cors';
import { verifyFirebaseToken } from './middleware/auth.js';
import authRoutes from './routes/auth.js';
import profileRoutes from './routes/profile.js';
import householdRoutes from './routes/household.js';
import transactionRoutes from './routes/transactions.js';
import reportRoutes from './routes/reports.js';
import categoryBudgetRoutes from './routes/categoryBudgets.js';
import recurringTransactionRoutes from './routes/recurringTransactions.js';

export function createServer() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  // Health check
  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  // Public — Firebase token verification (no middleware needed, it IS the auth step)
  app.use('/api/auth', authRoutes);

  // Protected — all routes below require a valid Firebase ID token
  app.use('/api/profile', verifyFirebaseToken, profileRoutes);
  app.use('/api/household', verifyFirebaseToken, householdRoutes);
  app.use('/api/transactions', verifyFirebaseToken, transactionRoutes);
  app.use('/api/reports', verifyFirebaseToken, reportRoutes);
  app.use('/api/category-budgets', verifyFirebaseToken, categoryBudgetRoutes);
  app.use('/api/recurring-transactions', verifyFirebaseToken, recurringTransactionRoutes);

  return app;
}
