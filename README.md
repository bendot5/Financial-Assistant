# FinancialAssistant — מעקב פיננסי חכם למשק בית

אפליקציית מעקב הוצאות והכנסות למשק בית עם ממשק בעברית, AI לניתוח טקסט חופשי וזיהוי תמונות, תשלומים קבועים אוטומטיים, ואפשרות שיתוף בין חברי משק הבית. כוללת סיכומים חודשיים ושבועיים, גרפים, יעדי הוצאה לפי קטגוריה ועוד.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Mobile | React Native + Expo (expo-router) |
| Auth | Firebase Auth — Email/Password + Google Sign-In |
| Backend | Node.js 20 + Express + TypeScript |
| Database | SQLite + Prisma ORM |
| AI | Google Gemini 2.5 Flash (text + vision) |
| Push Notifications | Expo Push Notifications + Firebase Admin SDK |
| Scheduler | node-cron |

---

## Project Structure

```
FinancialAssistant/
├── src/                          # Backend (Node.js / Express)
│   ├── index.ts                  # Entry point — starts Express server + cron jobs
│   ├── ai/
│   │   └── gemini.ts             # Gemini 2.5 Flash — text & image transaction parsing
│   ├── api/
│   │   ├── server.ts             # Express app setup, CORS, middleware
│   │   ├── middleware/
│   │   │   └── auth.ts           # Firebase Admin JWT verification
│   │   └── routes/
│   │       ├── auth.ts           # POST /api/auth/login — upsert member
│   │       ├── transactions.ts   # POST/GET/PUT/DELETE + /image endpoint
│   │       ├── recurringTransactions.ts  # Recurring transaction CRUD
│   │       ├── household.ts      # Household CRUD & invite flow
│   │       ├── profile.ts        # Member profile + push token registration
│   │       ├── reports.ts        # Monthly/weekly report endpoints
│   │       └── categoryBudgets.ts# Per-category budget goals
│   ├── db/
│   │   └── prisma.ts             # Prisma client singleton
│   ├── jobs/
│   │   ├── monthlyReport.ts      # Cron job — sends monthly summaries on 1st
│   │   └── recurringTransactions.ts  # Cron job — fires due recurring items daily 00:05
│   └── services/
│       ├── householdService.ts   # Member & Household CRUD
│       ├── transactionService.ts # Transaction logging & queries
│       ├── recurringTransactionService.ts  # computeNextRunAt, computeCurrentPeriodDate
│       ├── reportService.ts      # Aggregation & report formatting
│       └── categoryBudgetService.ts # Category budget CRUD
├── prisma/
│   └── schema.prisma             # Household, Member, Transaction, RecurringTransaction, CategoryBudget
└── mobile/                       # React Native app (Expo)
    ├── app/
    │   ├── (auth)/
    │   │   └── signin.tsx         # Email/Password + Google Sign-In
    │   ├── (onboarding)/
    │   │   └── ...                # WELCOME → INVITE_PROMPT → INCOME → BUDGET → COMPLETE
    │   └── (tabs)/
    │       ├── index.tsx          # מסך הבית — monthly + weekly summary + charts
    │       ├── chat.tsx           # AI chat — text + image (camera button)
    │       ├── history.tsx        # Transaction history
    │       └── settings.tsx       # Settings — theme, budget goals, household, recurring
    ├── lib/
    │   ├── firebase.ts            # Firebase app init
    │   ├── auth.tsx               # AuthContext (Firebase onAuthStateChanged)
    │   ├── api.ts                 # fetch wrapper + all TypeScript interfaces
    │   ├── theme.tsx              # Dark/Light theme context + palette
    │   └── pushNotifications.ts  # Expo push token registration
    └── components/
        ├── BudgetGauge.tsx        # Budget usage gauge/progress bar
        ├── ChartSection.tsx       # Line / Bar / Pie charts (react-native-chart-kit)
        ├── TransactionCard.tsx    # Single transaction row card
        ├── TransactionFormModal.tsx # Add/edit transaction form (exports CATEGORIES)
        └── RecurringTransactionModal.tsx  # Add recurring transaction form
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- A [Gemini API key](https://aistudio.google.com/app/apikey) (free tier: 1,500 req/day)
- A Firebase project with **Email/Password** and **Google** authentication enabled
- Firebase service account credentials (for the backend)

### 1. Backend setup

```bash
npm install
```

Fill in `.env`:

```env
DATABASE_URL="file:./dev.db"
GEMINI_API_KEY="your-key-here"
FIREBASE_PROJECT_ID="your-project-id"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
PORT=3000
```

```bash
npx prisma db push    # Creates dev.db and applies the schema
npm run dev           # Start backend in watch mode
```

### 2. Mobile app setup

```bash
cd mobile
npm install
```

Create `mobile/.env`:

```env
EXPO_PUBLIC_API_URL=http://<local-ip>:3000
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your-web-oauth-client-id.apps.googleusercontent.com
```

```bash
npx expo start --clear
```

> **Note:** Google Sign-In is hidden in Expo Go (Google blocks `exp://` redirect URIs). It works only in native builds (EAS Build / standalone APK).

---

## Available Scripts

### Backend (`/`)

| Script | Description |
|---|---|
| `npm run dev` | Start in watch mode (tsx) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run the compiled build |

### Mobile (`/mobile`)

| Script | Description |
|---|---|
| `npx expo start --clear` | Start Expo dev server |
| `npx expo start --android` | Open on Android |
| `npx expo start --ios` | Open on iOS |

---

## Features

### Authentication
Sign in with **Email & Password** or **Google Sign-In**. Firebase Auth handles session management; the backend verifies ID tokens via Firebase Admin SDK on every request.

> Google Sign-In is available in native builds only — it is automatically hidden in Expo Go due to Google's `exp://` URI restriction.

### Onboarding Wizard
New users complete a guided 5-step setup:
1. Welcome screen
2. Create a new household or join one with an invite code
3. Set monthly income
4. Set monthly budget limit
5. (Optional) Set per-category spending goals

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

### AI Image Parsing
Tap the camera button in chat to photograph a receipt or invoice — Gemini Vision parses it into one or more transactions automatically.

### Transaction Management
- Add/edit/delete transactions from the history screen
- Manual entry form with category selector
- Optional date override per transaction (defaults to today)

### Recurring Transactions
Define transactions that repeat automatically:
- **Frequency**: Monthly (by day of month) or Weekly (by day of week)
- On creation: a transaction for the **current period** is immediately logged
- A cron job runs daily at **00:05** and logs any due recurring items, then advances their `nextRunAt`
- Managed in Settings → "🔁 תשלומים קבועים"

### מסך הבית — Monthly + Weekly Summary
- Budget gauge with percentage used
- Top expense categories with progress bars vs. category budget goals
- Daily expense charts: Line / Bar / Pie (preference saved per device)
- Weekly summary with pro-rata budget tracking per category

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
  id, inviteCode (unique), monthlyIncome, budgetLimit

Member
  id, email (unique), firebaseUid, name, householdId,
  onboardingStep, pushToken

Transaction
  id, householdId, memberEmail, type (EXPENSE|INCOME),
  amount, category, description, date (optional override), createdAt

RecurringTransaction
  id, householdId, memberEmail, type, amount, category, description,
  frequency (WEEKLY|MONTHLY), dayOfWeek?, dayOfMonth?,
  nextRunAt, isActive

CategoryBudget
  id, householdId, category, budgetLimit
  @@unique([householdId, category])
```

---

## API Endpoints

All endpoints require an `Authorization: Bearer <firebase-id-token>` header.

### Auth
| Method | Path | Description |
|---|---|---|
| `POST` | `/api/auth/login` | Firebase token → upsert Member |

### Transactions
| Method | Path | Description |
|---|---|---|
| `POST` | `/api/transactions` | Log transactions via free-text Hebrew message (AI) |
| `POST` | `/api/transactions/manual` | Log a transaction with structured data (no AI) |
| `POST` | `/api/transactions/image` | Log transactions from a receipt image (AI vision) |
| `GET` | `/api/transactions` | Get monthly transactions (`?month=&year=`) |
| `PUT` | `/api/transactions/:id` | Update a transaction |
| `DELETE` | `/api/transactions/:id` | Delete a transaction |

### Recurring Transactions
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/recurring-transactions` | List active recurring transactions |
| `POST` | `/api/recurring-transactions` | Create a recurring transaction |
| `DELETE` | `/api/recurring-transactions/:id` | Soft-delete (deactivate) a recurring transaction |

### Households & Profile
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/profile` | Get current member + household |
| `PUT` | `/api/profile` | Update name or push token |
| `GET` | `/api/household` | Get household settings |
| `PUT` | `/api/household` | Update household (income, budget) |
| `POST` | `/api/household/join` | Join a household with invite code |

### Reports
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/reports/monthly` | Monthly report (`?month=&year=`) |
| `GET` | `/api/reports/weekly` | Current week summary |
| `POST` | `/api/reports/monthly/trigger` | Manually trigger push notifications (`?month=&year=`) |

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
| **Firebase Email + Google Auth** | Familiar login flows; Google Sign-In available in native builds |
| **Gemini 2.5 Flash** | Best available model on free tier; handles Hebrew text and receipt images |
| **Express REST API** | Simple, stateless — easy to deploy anywhere |
| **SQLite + Prisma** | Zero setup, single-file DB. Swap `provider = "postgresql"` + update `DATABASE_URL` to migrate to Postgres with no code changes |
| **Expo Push Notifications** | Handles FCM/APNs complexity; requires EAS for production tokens |
| **node-cron** | Lightweight scheduler for recurring transactions and monthly reports |
| **react-native-chart-kit** | Simple chart library with line/bar/pie support; preference saved per device |

---

## Common Issues & Fixes

| Symptom | Cause | Fix |
|---|---|---|
| "לא ניתן לנתח את התמונה" | Express body too large (413) | Already fixed: `express.json({ limit: '10mb' })` |
| Prisma client doesn't know `recurringTransaction` | DLL lock prevented regeneration on Windows | Restart backend — it regenerates on start |
| Google Sign-In crashes in Expo Go | Google blocks `exp://` redirect URIs | Expected — works only in native/standalone builds |

---

## Notes

- **Push tokens**: `getExpoPushTokenAsync()` requires an EAS project. During local development this step is gracefully skipped.
- **Gemini free tier**: 1,500 req/day, 15 req/min — sufficient for personal/household use.
- **Firebase private key**: Set `FIREBASE_PRIVATE_KEY` with literal `\n` characters in `.env`; Node.js will parse them correctly.
- **SQLite dev.db** is gitignored; re-run `npx prisma db push` after cloning.
