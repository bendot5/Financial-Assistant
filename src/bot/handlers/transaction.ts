import { parseTransaction } from '../../ai/gemini.js';
import { logTransaction } from '../../services/transactionService.js';

/**
 * Handles a fully-onboarded user's message.
 * Sends the text to Gemini for NLP parsing, then persists and confirms.
 */
export async function handleTransaction(
  phone: string,
  text: string,
  householdId: string,
  send: (msg: string) => Promise<void>,
): Promise<void> {
  const parsed = await parseTransaction(text);

  if (!parsed) {
    await send(
      `🤔 I couldn\'t identify a transaction in that message.\n\n` +
        `Try something like:\n` +
        `• "Spent 50 on lunch"\n` +
        `• "Paid Netflix $15"\n` +
        `• "Received salary 5000"\n` +
        `• "Grocery run, 120 bucks"\n\n` +
        `Type *help* for more examples.`,
    );
    return;
  }

  // If Gemini recognised the transaction type but couldn't extract an amount,
  // ask the user to clarify. (A future iteration can hold this in a pending state.)
  if (!parsed.amount || parsed.amount <= 0) {
    await send(
      `Got it — *${parsed.description}* (${parsed.category}).\n\n` +
        `How much was it? _(Reply with just the amount, e.g. 150)_`,
    );
    return;
  }

  await logTransaction({
    householdId,
    memberPhone: phone,
    type: parsed.type,
    amount: parsed.amount,
    category: parsed.category,
    description: parsed.description,
  });

  const isExpense = parsed.type === 'EXPENSE';
  await send(
    `${isExpense ? '💸' : '💰'} *${isExpense ? 'Expense' : 'Income'} logged!*\n\n` +
      `• Amount:   $${parsed.amount.toFixed(2)}\n` +
      `• Category: ${parsed.category}\n` +
      `• Note:     ${parsed.description}\n\n` +
      `_Type "balance" anytime to see your monthly summary._`,
  );
}
