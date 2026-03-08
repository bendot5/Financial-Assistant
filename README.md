# FinancialAssistant — AI-Powered Mobile Finance Tracker

A household finance tracker with a React Native mobile app and a Node.js REST API backend. Log expenses and income via natural language, share a wallet with your household, and receive automated monthly push-notification summaries.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Mobile | React Native + Expo 54 (expo-router) |
| Auth | Firebase Phone Auth (SMS OTP) |
| Backend | Node.js 20 + Express + TypeScript (ESM) |
| Database | SQLite + Prisma ORM |
| AI | Google Gemini 2.5 Flash |
| Push Notifications | Expo Push Notifications + Firebase Admin SDK |
| Scheduler | node-cron |

---

## Project Structure

```
FinancialAssistant/
├── src/                          # Backend (Node.js / Express)
│   ├── index.ts                  # Entry point — starts Express server + cron
│   ├── ai/
│   │   └── gemini.ts             # Gemini 2.5 Flash — NLP transaction extraction
│   ├── api/
│   │   ├── server.ts             # Express app setup, CORS, middleware
│   │   ├── middleware/
│   │   │   └── auth.ts           # Firebase Admin JWT verification
│   │   └── routes/
│   │       ├── transactions.ts   # POST/GET /api/transactions
│   │       ├── households.ts     # Household CRUD & invite flow
│   │       └── profile.ts        # Member profile + push token registration
│   ├── db/
│   │   └── prisma.ts             # Prisma client singleton
│   ├── jobs/
│   │   └── monthlyReport.ts      # Cron job — sends monthly summaries on 1st
│   └── services/
│       ├── householdService.ts   # Member & Household CRUD
│       ├── transactionService.ts # Transaction logging & queries
│       └── reportService.ts      # Aggregation & report formatting
├── prisma/
│   └── schema.prisma             # Household, Member, Transaction models
└── mobile/                       # React Native app (Expo)
    ├── app/
    │   ├── (auth)/
    │   │   ├── phone.tsx          # Phone number entry
    │   │   └── otp.tsx            # SMS OTP verification
    │   ├── (onboarding)/          # Household setup wizard
    │   └── (tabs)/
    │       ├── index.tsx          # Dashboard — monthly summary
    │       ├── chat.tsx           # AI chat — log transactions
    │       └── history.tsx        # Transaction history
    ├── lib/
    │   ├── firebase.ts            # Firebase app init
    │   ├── auth.tsx               # Auth context + session management
    │   ├── api.ts                 # Axios client (attaches Firebase JWT)
    │   └── pushNotifications.ts  # Expo push token registration
    └── components/
        └── RecaptchaModal.tsx     # WebView-based reCAPTCHA for phone auth
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- A [Gemini API key](https://aistudio.google.com/app/apikey) (free tier: 1,500 req/day)
- A Firebase project with **Phone Authentication** enabled
- Firebase service account JSON (for the backend)

### 1. Backend setup

```bash
npm install
```

```bash
cp .env.example .env
```

Fill in `.env`:

```env
DATABASE_URL="file:./dev.db"
GEMINI_API_KEY="your-key-here"
FIREBASE_SERVICE_ACCOUNT_PATH="../your-service-account.json"
PORT=3000
```

```bash
npm run db:push       # Creates dev.db and applies the schema
npm run db:generate   # Generates Prisma client types
npm run dev           # Start backend in watch mode
```

### 2. Mobile app setup

```bash
cd mobile
npm install
```

Create `mobile/lib/firebaseConfig.ts` (or update `firebase.ts`) with your Firebase project config:

```ts
export const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  // etc.
};
```

```bash
npx expo start --android   # or --ios
```

---

## Available Scripts

### Backend (`/`)

| Script | Description |
|---|---|
| `npm run dev` | Start in watch mode (tsx) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run the compiled build |
| `npm run db:push` | Apply schema changes to SQLite |
| `npm run db:generate` | Regenerate Prisma client |
| `npm run db:migrate` | Create a named migration |
| `npm run db:studio` | Open Prisma Studio (visual DB browser) |

### Mobile (`/mobile`)

| Script | Description |
|---|---|
| `npm start` | Start Expo dev server |
| `npm run android` | Open on Android |
| `npm run ios` | Open on iOS |

---

## Features

### Phone Auth
Sign in with your phone number — Firebase sends an SMS OTP, verified via a hidden WebView reCAPTCHA.

### Onboarding Wizard
New users complete a guided setup:
1. Enter name
2. Create a new household or join one with an invite code
3. Set monthly income and budget limit

### Shared Households
Multiple members share one wallet. The household creator receives a shareable invite code (e.g. `HH-A3B9C2`).

### AI Transaction Logging (Chat)
Type a free-text message — Gemini 2.5 Flash extracts the type, amount, category, and description:
```
"Spent 150 at a restaurant"       → 💸 Expense · $150.00 · Food
"Netflix subscription 15 bucks"   → 💸 Expense · $15.00 · Entertainment
"Received salary 5000"            → 💰 Income · $5000.00 · Salary
```

### Monthly Summary
On the 1st of every month at 9:00 AM, each household member receives a push notification summary:
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
```

---

## Database Schema

```
Household
  id, name, inviteCode (unique), monthlyIncome, budgetLimit

Member
  id, phone (unique), firebaseUid (unique), name, householdId,
  onboardingStep, pendingIncome, pushToken

Transaction
  id, householdId, memberPhone, type (EXPENSE|INCOME),
  amount, category, description, createdAt
```

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/transactions` | Log a transaction via free-text message |
| `GET` | `/api/transactions` | Get monthly transactions (`?month=&year=`) |
| `GET` | `/api/households/me` | Get current member + household |
| `POST` | `/api/households` | Create a new household |
| `POST` | `/api/households/join` | Join a household with invite code |
| `PUT` | `/api/profile` | Update name or push token |

All endpoints require a `Authorization: Bearer <firebase-id-token>` header.

---

## Architecture Decisions

| Decision | Rationale |
|---|---|
| **Expo + expo-router** | File-based routing, OTA updates, cross-platform |
| **Firebase Phone Auth** | Passwordless login — just a phone number needed |
| **WebView reCAPTCHA** | Firebase phone auth requires reCAPTCHA; compat SDK used for Android WebView compatibility |
| **Express REST API** | Simple, stateless — easy to deploy anywhere |
| **SQLite + Prisma** | Zero setup, single-file DB. Swap `provider = "postgresql"` + update `DATABASE_URL` to migrate to Postgres with no code changes |
| **Gemini 2.5 Flash** | Best available model on this API key's free tier |
| **Expo Push Notifications** | Handles FCM/APNs complexity; requires EAS for production tokens |

---

## Notes

- **Push tokens**: `getExpoPushTokenAsync()` requires an EAS project. During local development this step is gracefully skipped.
- **Gemini free tier**: 1,500 req/day, 15 req/min — sufficient for personal/household use.
- **Firebase service account**: Never commit `*.json` service account files — add them to `.gitignore`.
- **Auth files**: SQLite `dev.db` is gitignored; re-run `npm run db:push` after cloning.
