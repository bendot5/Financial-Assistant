# FinancialAssistant — מעקב פיננסי חכם למשק בית

אפליקציית מעקב הוצאות והכנסות למשק בית עם ממשק בעברית, AI לניתוח טקסט חופשי, ואפשרות שיתוף בין חברי משק הבית. כוללת סיכומים חודשיים ושבועיים, גרפים, יעדי הוצאה לפי קטגוריה ועוד.

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
│   │   └── gemini.ts             # Gemini 2.5 Flash — חילוץ עסקאות מטקסט עברי
│   ├── api/
│   │   ├── server.ts             # Express app setup, CORS, middleware
│   │   ├── middleware/
│   │   │   └── auth.ts           # Firebase Admin JWT verification
│   │   └── routes/
│   │       ├── transactions.ts   # POST/GET/PUT/DELETE /api/transactions
│   │       ├── household.ts      # Household CRUD & invite flow
│   │       ├── profile.ts        # Member profile + push token registration
│   │       ├── reports.ts        # Monthly/weekly report endpoints
│   │       └── categoryBudgets.ts# Per-category budget goals
│   ├── db/
│   │   └── prisma.ts             # Prisma client singleton
│   ├── jobs/
│   │   └── monthlyReport.ts      # Cron job — sends monthly summaries on 1st
│   └── services/
│       ├── householdService.ts   # Member & Household CRUD
│       ├── transactionService.ts # Transaction logging & queries
│       ├── reportService.ts      # Aggregation & report formatting
│       └── categoryBudgetService.ts # Category budget CRUD
├── prisma/
│   └── schema.prisma             # Household, Member, Transaction, CategoryBudget
└── mobile/                       # React Native app (Expo)
    ├── app/
    │   ├── (auth)/
    │   │   ├── phone.tsx          # Phone number entry
    │   │   └── otp.tsx            # SMS OTP verification
    │   ├── (onboarding)/
    │   │   └── setup.tsx          # Household setup wizard (incl. category budgets)
    │   └── (tabs)/
    │       ├── _layout.tsx        # Tab bar layout
    │       ├── index.tsx          # מסך הבית — monthly + weekly summary + charts
    │       ├── chat.tsx           # AI chat — log transactions
    │       ├── history.tsx        # Transaction history
    │       └── settings.tsx       # Settings — theme, budget goals, household
    ├── lib/
    │   ├── firebase.ts            # Firebase app init
    │   ├── auth.tsx               # Auth context + session management
    │   ├── api.ts                 # Axios client (attaches Firebase JWT)
    │   ├── theme.tsx              # Dark/Light theme context + palette
    │   └── pushNotifications.ts  # Expo push token registration
    └── components/
        ├── BudgetGauge.tsx        # Budget usage gauge/progress bar
        ├── ChartSection.tsx       # Line / Bar / Pie charts (react-native-chart-kit)
        ├── TransactionCard.tsx    # Single transaction row card
        ├── TransactionFormModal.tsx # Add/edit transaction form
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

Create `mobile/lib/firebaseConfig.ts` with your Firebase project config:

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
| `npm run db:studio` | Open Prisma Studio — visual DB browser at localhost:5555 |

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
4. (Optional) Set per-category spending goals

### Shared Households
Multiple members share one wallet. The household creator receives a shareable invite code (e.g. `HH-A3B9C2`).

### AI Transaction Logging (Chat) — Hebrew
Type a free-text Hebrew message — Gemini 2.5 Flash extracts the type, amount, category, date, and description:
```
"קניתי אוכל ב-80"            → 💸 הוצאה · ₪80.00 · אוכל
"Netflix כל חודש 50"         → 💸 הוצאה · ₪50.00 · בידור
"קיבלתי משכורת 10000"        → 💰 הכנסה · ₪10000.00 · משכורת
"קניתי אוכל לכלב ב-60"      → 💸 הוצאה · ₪60.00 · חיות מחמד
"קניתי אתמול בגדים ב-200"   → 💸 הוצאה · ₪200.00 · קניות (תאריך: אתמול)
```

Multi-turn chat context: if the bot asks "כמה זה עלה?" after a missing-amount message, the next reply is combined with the original context automatically.

### Transaction Management
- Add/edit/delete transactions from the history screen
- Manual entry form with category selector (including custom category input)
- Optional date override per transaction (defaults to today)

### מסך הבית — Monthly + Weekly Summary
- Budget gauge with percentage used
- Top expense categories with progress bars vs. category budget goals
- Daily expense charts: Line / Bar / Pie (preference saved per device)
- Weekly summary with pro-rata budget tracking per category
- Configurable weekly category filter (show/hide categories)

### Per-Category Budget Goals
Set spending limits per category (e.g. ₪500 for food, ₪1000 for housing). Progress bars show current spend vs. goal in both monthly and weekly summaries.

### Monthly Push Notification Summary
On the 1st of every month at 9:00 AM, each household member receives a push notification:
```
📊 סיכום פברואר 2026
הוצאות: ₪3,240 (81%) — נותר ₪760 מתוך ₪4,000
```

Test manually via: `POST /api/reports/monthly/trigger?month=2&year=2026`

### Dark / Light Mode
Full dark and light theme support. Toggle in Settings. Preference is saved per device.

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
  amount, category, description, date (optional override), createdAt

CategoryBudget
  id, householdId, category, budgetLimit
  @@unique([householdId, category])
```

---

## API Endpoints

All endpoints require an `Authorization: Bearer <firebase-id-token>` header.

### Transactions
| Method | Path | Description |
|---|---|---|
| `POST` | `/api/transactions` | Log a transaction via free-text Hebrew message |
| `POST` | `/api/transactions/manual` | Log a transaction with structured data (no AI) |
| `GET` | `/api/transactions` | Get monthly transactions (`?month=&year=`) |
| `PUT` | `/api/transactions/:id` | Update a transaction |
| `DELETE` | `/api/transactions/:id` | Delete a transaction |

### Households & Profile
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/households/me` | Get current member + household |
| `POST` | `/api/households` | Create a new household |
| `POST` | `/api/households/join` | Join a household with invite code |
| `PUT` | `/api/profile` | Update name or push token |

### Reports
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/reports/monthly` | Monthly report (`?month=&year=`) |
| `GET` | `/api/reports/weekly` | Current week summary |
| `POST` | `/api/reports/monthly/trigger` | Manually trigger push notifications for all households (`?month=&year=`) |

### Category Budgets
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/category-budgets` | List all category budgets for household |
| `PUT` | `/api/category-budgets` | Create or update a category budget (`{ category, budgetLimit }`) |
| `DELETE` | `/api/category-budgets/:category` | Delete a category budget |

---

## Transaction Categories

| Category | Examples |
|---|---|
| אוכל | מסעדה, סופר, קפה |
| תחבורה | דלק, חניה, רכבת, אוטובוס |
| דיור | שכירות, משכנתה, ארנונה, חשמל, מים, גז, אינטרנט |
| בידור | Netflix, קולנוע, ספרים |
| בריאות | רופא, תרופות, ביטוח |
| קניות | בגדים, אלקטרוניקה |
| חיות מחמד | אוכל לחיות, וטרינר, ציוד לחיות |
| משכורת | הכנסה מעבודה |
| פרילנס | הכנסה עצמאית |
| חינוך | שכר לימוד, קורסים |
| כללי | כל היתר |

---

## Architecture Decisions

| Decision | Rationale |
|---|---|
| **Expo + expo-router** | File-based routing, OTA updates, cross-platform |
| **Firebase Phone Auth** | Passwordless login — just a phone number needed |
| **WebView reCAPTCHA** | Firebase phone auth requires reCAPTCHA; compat SDK used for Android WebView compatibility |
| **Express REST API** | Simple, stateless — easy to deploy anywhere |
| **SQLite + Prisma** | Zero setup, single-file DB. Swap `provider = "postgresql"` + update `DATABASE_URL` to migrate to Postgres with no code changes |
| **Gemini 2.5 Flash** | Best available model on this API key's free tier; Hebrew-only prompt for best accuracy |
| **Expo Push Notifications** | Handles FCM/APNs complexity; requires EAS for production tokens |
| **react-native-chart-kit** | Simple chart library with line/bar/pie support; saved preference per device |

---

## Viewing the Database

```bash
npm run db:studio   # Opens Prisma Studio at http://localhost:5555
```

Prisma Studio provides a visual browser for all tables (Household, Member, Transaction, CategoryBudget) with inline edit support.

---

## Notes

- **Push tokens**: `getExpoPushTokenAsync()` requires an EAS project. During local development this step is gracefully skipped.
- **Gemini free tier**: 1,500 req/day, 15 req/min — sufficient for personal/household use.
- **Firebase service account**: Never commit `*.json` service account files — add them to `.gitignore`.
- **SQLite dev.db** is gitignored; re-run `npm run db:push` after cloning.
- **legacy-peer-deps**: `mobile/.npmrc` sets `legacy-peer-deps=true` to resolve peer dependency conflicts with `react-native-chart-kit`.
