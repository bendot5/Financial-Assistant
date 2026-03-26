import 'dotenv/config';
import { createServer } from './api/server.js';
import { startMonthlyReportJob } from './jobs/monthlyReport.js';
import { startRecurringTransactionJob } from './jobs/recurringTransactions.js';

const PORT = Number(process.env.PORT) || 3000;

async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('  💰 FinancialAssistant — API Server       ');
  console.log('═══════════════════════════════════════════');

  startMonthlyReportJob();
  startRecurringTransactionJob();

  const app = createServer();
  app.listen(PORT, () => {
    console.log(`[API] Server running on http://localhost:${PORT}`);
    console.log(`[API] Health check: http://localhost:${PORT}/health`);
  });
}

main().catch((err) => {
  console.error('[Fatal]', err);
  process.exit(1);
});
