# 💰 FinancialAssistant — AI-Powered WhatsApp Finance Bot

An AI-powered WhatsApp bot for personal and shared financial tracking. Log expenses and income via natural language, share a wallet with your household, and receive automated monthly summaries.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Runtime | Node.js 20 LTS + TypeScript (ESM) |
| WhatsApp | [Baileys](https://github.com/WhiskeySockets/Baileys) — lightweight WebSocket, no Puppeteer |
| Database | SQLite + [Prisma ORM](https://www.prisma.io/) |
| AI | Google Gemini 1.5 Flash (free tier — 1,500 req/day) |
| Scheduler | node-cron |

---

## Getting Started

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
copy .env.example .env
```
Open `.env` and paste your Gemini API key.
Get it free at: https://aistudio.google.com/app/apikey

### 3. Set up the database
```bash
npm run db:push       # Creates dev.db and applies the schema
npm run db:generate   # Generates Prisma client types
```

### 4. Start the bot
```bash
npm run dev
```

A QR code will appear in the terminal. Scan it with WhatsApp via **Linked Devices → Link a Device**.

Auth is saved to `./auth_info_baileys/` — subsequent restarts skip the QR code.

---

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start in watch mode (tsx) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run the compiled build |
| `npm run db:push` | Apply schema changes to SQLite |
| `npm run db:generate` | Regenerate Prisma client |
| `npm run db:migrate` | Create a named migration |
| `npm run db:studio` | Open Prisma Studio (visual DB browser) |

---

## Features

### Onboarding Flow
When a new number messages the bot, it walks through a 4-step setup:
1. **Name** — captures the user's name
2. **Invite / New** — join an existing household with a code, or create a new one
3. **Monthly income** — (new households only)
4. **Budget limit** — (new households only) — generates a shareable invite code

### Shared Households
Multiple phone numbers can share one wallet. The first member gets an invite code (e.g. `HH-A3B9C2`) to share with their partner.

### Natural Language Transaction Logging
Just send a message — Gemini extracts the type, amount, category, and description:
```
"Spent 150 at a restaurant"       → 💸 Expense · $150.00 · Food
"Netflix subscription 15 bucks"   → 💸 Expense · $15.00 · Entertainment
"Received salary 5000"            → 💰 Income · $5000.00 · Salary
```

### Commands
| Command | Action |
|---|---|
| `balance` / `status` | Current month's spending summary |
| `help` | Show usage examples |

### Monthly Summary (Cron Job)
On the 1st of every month at 9:00 AM, the bot sends each household member a summary of the previous month:
```
📊 March 2025 Summary
🏠 Smith's Household

💰 Budget:  $3000.00
💸 Spent:   $2340.00 (78%)
📈 Income:  $5200.00
💵 Left:    $660.00

📌 Top Categories:
  • Housing: $1200.00 (51%)
  • Food: $680.00 (29%)
  • Transport: $420.00 (18%)

✅ Great job staying within budget!
```

---

## Project Structure

```
src/
├── index.ts                        # Entry point
├── bot/
│   ├── client.ts                   # Baileys socket, QR auth, sendWhatsAppMessage()
│   └── handlers/
│       ├── messageHandler.ts       # Message router (new user / onboarding / commands / transactions)
│       ├── onboarding.ts           # 4-step onboarding state machine
│       └── transaction.ts          # Gemini NLP → log → confirm
├── ai/
│   └── gemini.ts                   # Structured extraction with Gemini 1.5 Flash
├── db/
│   └── prisma.ts                   # Prisma client singleton
├── jobs/
│   └── monthlyReport.ts            # Cron job — sends monthly summaries
└── services/
    ├── householdService.ts         # Member & Household CRUD
    ├── transactionService.ts       # Transaction logging & queries
    └── reportService.ts            # Aggregation & report formatting

prisma/
└── schema.prisma                   # Household, Member, Transaction models
```

---

## Database Schema

```
Household
  id, name, inviteCode (unique), monthlyIncome, budgetLimit

Member
  id, phone (unique), name, householdId, onboardingStep, pendingIncome

Transaction
  id, householdId, memberPhone, type (EXPENSE|INCOME), amount, category, description
```

---

## Architecture Decisions

| Decision | Rationale |
|---|---|
| **Baileys over whatsapp-web.js** | No Puppeteer/Chromium — pure WebSocket; ~30MB RAM vs ~300MB |
| **ESM (`"type": "module"`)** | Required by Baileys v6; the modern Node.js standard |
| **SQLite + Prisma** | Zero setup, single-file DB. Swap `provider = "postgresql"` + update `DATABASE_URL` to migrate to Postgres with zero code changes |
| **Gemini 1.5 Flash** | 1,500 req/day free — more than enough for personal/household use |
| **State machine in DB** | `Member.onboardingStep` persists across restarts; no in-memory session state |
| **Cron at 9AM on the 1st** | Avoids midnight noise; configurable in `src/jobs/monthlyReport.ts` |

---

## Notes

- **WhatsApp ToS**: Community bots using Baileys are against WhatsApp's Terms of Service. Risk of account ban is low for personal/household use, but use at your own discretion.
- **Auth files**: `./auth_info_baileys/` contains your session keys — never commit this directory (already in `.gitignore`).
- **Gemini free tier limits**: 15 requests/minute, 1,500/day. Sufficient for personal use; upgrade to a paid plan for higher volume.
