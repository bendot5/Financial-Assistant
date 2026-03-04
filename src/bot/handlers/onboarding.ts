import type { Household, Member } from '@prisma/client';
import * as householdService from '../../services/householdService.js';

type MemberWithHousehold = Member & { household: Household | null };

/**
 * Onboarding state machine.
 *
 * States (stored in Member.onboardingStep):
 *   WELCOME        → user's first reply; we capture their name
 *   INVITE_PROMPT  → ask: existing code (HH-XXXX) or NEW?
 *   INCOME         → ask for monthly income (new households only)
 *   BUDGET         → ask for monthly budget limit (new households only)
 *   COMPLETE       → onboarding done; normal transaction handling resumes
 */
export async function handleOnboarding(
  phone: string,
  text: string,
  member: MemberWithHousehold,
  send: (msg: string) => Promise<void>,
): Promise<void> {
  const step = member.onboardingStep;

  switch (step) {
    // ── Step 1: capture name ─────────────────────────────────────────────────
    case 'WELCOME': {
      const name = text.trim();
      if (name.length < 2) {
        await send('Please enter your name (at least 2 characters).');
        return;
      }
      await householdService.updateMember(phone, { name, onboardingStep: 'INVITE_PROMPT' });
      await send(
        `Nice to meet you, *${name}*! 👋\n\n` +
          `Do you have an *invite code* to join an existing household?\n\n` +
          `Reply with the code (e.g. *HH-A3B9C2*), or type *NEW* to create your own household.`,
      );
      break;
    }

    // ── Step 2: join existing or create new ──────────────────────────────────
    case 'INVITE_PROMPT': {
      if (text.trim().toUpperCase() === 'NEW') {
        await householdService.updateMember(phone, { onboardingStep: 'INCOME' });
        await send(
          `Great! Let\'s set up your household. 🏠\n\n` +
            `What is your *total monthly income*?\n` +
            `_(Enter a number, e.g. 5000)_`,
        );
      } else {
        const household = await householdService.findHouseholdByCode(text.trim());
        if (!household) {
          await send(
            `❌ Code *${text.trim().toUpperCase()}* not found.\n\n` +
              `Double-check the code, or type *NEW* to start your own household.`,
          );
          return;
        }
        await householdService.updateMember(phone, {
          householdId: household.id,
          onboardingStep: 'COMPLETE',
        });
        const partners = household.members
          .filter((m) => m.phone !== phone && m.name)
          .map((m) => m.name)
          .join(' & ');
        await send(
          `✅ *You\'re in!*\n\n` +
            (partners ? `You\'re now sharing a wallet with *${partners}*.\n\n` : '') +
            `Just send me any expense or income message and I\'ll track it. Type *help* for examples.`,
        );
      }
      break;
    }

    // ── Step 3: monthly income (new household path) ───────────────────────────
    case 'INCOME': {
      const income = parseFloat(text.replace(/[^0-9.]/g, ''));
      if (isNaN(income) || income < 0) {
        await send('Please enter a valid income amount _(numbers only, e.g. 5000)_.');
        return;
      }
      await householdService.updateMember(phone, {
        pendingIncome: income,
        onboardingStep: 'BUDGET',
      });
      await send(
        `Got it! 💰\n\n` +
          `Now, what is your *monthly budget limit*?\n` +
          `_(The maximum you want to spend per month, e.g. 3000)_`,
      );
      break;
    }

    // ── Step 4: budget limit → create household ───────────────────────────────
    case 'BUDGET': {
      const budget = parseFloat(text.replace(/[^0-9.]/g, ''));
      if (isNaN(budget) || budget <= 0) {
        await send('Please enter a valid budget amount _(e.g. 3000)_.');
        return;
      }
      const memberName = member.name ?? 'My';
      const income = member.pendingIncome ?? 0;

      const household = await householdService.createHousehold({
        name: `${memberName}'s Household`,
        monthlyIncome: income,
        budgetLimit: budget,
      });

      await householdService.updateMember(phone, {
        householdId: household.id,
        onboardingStep: 'COMPLETE',
        pendingIncome: null,
      });

      await send(
        `🎉 *Household created!*\n\n` +
          `• Monthly Income: $${income.toFixed(2)}\n` +
          `• Budget Limit:   $${budget.toFixed(2)}\n\n` +
          `Your invite code is:\n` +
          `*${household.inviteCode}*\n\n` +
          `Share it with your partner so they can join your wallet. 👫\n\n` +
          `You\'re all set! Send me any expense or income message. Type *help* for examples.`,
      );
      break;
    }

    default: {
      console.error(`[Onboarding] Unknown step "${step}" for ${phone}`);
      await send('Something went wrong with your account setup. Please try again.');
    }
  }
}
