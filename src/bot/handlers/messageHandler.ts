import { getMember, createMember } from '../../services/householdService.js';
import { buildMonthlyReport } from '../../services/reportService.js';
import { sendWhatsAppMessage } from '../client.js';
import { handleOnboarding } from './onboarding.js';
import { handleTransaction } from './transaction.js';

const HELP_TEXT =
  `*FinancialAssistant Help* 🤖\n\n` +
  `Send me a natural language message about your spending or income:\n\n` +
  `*Expense examples:*\n` +
  `  • "Spent 50 on lunch"\n` +
  `  • "Paid Netflix $15"\n` +
  `  • "Grocery run, 120 bucks"\n` +
  `  • "Dentist 200"\n\n` +
  `*Income examples:*\n` +
  `  • "Received salary 5000"\n` +
  `  • "Freelance payment 800"\n\n` +
  `*Commands:*\n` +
  `  • *balance* / *status* — Current month summary\n` +
  `  • *help* — Show this message`;

/**
 * Main message router.
 * 1. New user  → start onboarding
 * 2. Onboarding in progress → continue state machine
 * 3. Fully onboarded → parse transaction or handle commands
 */
export async function handleMessage(phone: string, text: string): Promise<void> {
  const send = (msg: string) => sendWhatsAppMessage(phone, msg);

  // ── New user ─────────────────────────────────────────────────────────────
  let member = await getMember(phone);
  if (!member) {
    await createMember(phone);
    await send(
      `👋 Welcome to *FinancialAssistant*!\n\n` +
        `I help you and your household track expenses and income, and send you a monthly spending summary.\n\n` +
        `First — what\'s your *name*?`,
    );
    return;
  }

  // ── Onboarding in progress ───────────────────────────────────────────────
  if (member.onboardingStep !== 'COMPLETE') {
    await handleOnboarding(phone, text, member, send);
    return;
  }

  // ── Special commands ─────────────────────────────────────────────────────
  const cmd = text.trim().toLowerCase();

  if (cmd === 'balance' || cmd === 'status' || cmd === 'report') {
    const now = new Date();
    const report = await buildMonthlyReport(
      member.householdId!,
      now.getFullYear(),
      now.getMonth() + 1, // getMonth() is 0-indexed
    );
    await send(report ?? '❌ Could not generate report — no household found.');
    return;
  }

  if (cmd === 'help') {
    await send(HELP_TEXT);
    return;
  }

  // ── Transaction logging ──────────────────────────────────────────────────
  if (!member.householdId) {
    await send('⚠️ Account error: no household linked. Please contact support.');
    return;
  }

  await handleTransaction(phone, text, member.householdId, send);
}
