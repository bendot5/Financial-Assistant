import 'dotenv/config';
import { startBot } from './bot/client.js';
import { handleMessage } from './bot/handlers/messageHandler.js';
import { startMonthlyReportJob } from './jobs/monthlyReport.js';

async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('  💰 FinancialAssistant — WhatsApp Bot     ');
  console.log('═══════════════════════════════════════════');

  // Register the cron job (does not require WA connection)
  startMonthlyReportJob();

  // Connect to WhatsApp via Baileys
  // On first run: a QR code will appear — scan it with WhatsApp
  // On subsequent runs: session is restored from ./auth_info_baileys/
  await startBot(handleMessage);
}

main().catch((err) => {
  console.error('[Fatal]', err);
  process.exit(1);
});
