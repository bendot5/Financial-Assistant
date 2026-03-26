# FinancialAssistant — Project Guide for Claude

## What This Is
A Hebrew-language household expense tracker.
- **Backend**: Node.js + Express + Prisma (SQLite) + Firebase Auth, runs on port 3000
- **Mobile**: React Native / Expo (expo-router), Hebrew RTL UI, dark/light theme
- **AI**: Google Gemini (`gemini-2.5-flash`) for natural-language and image-based transaction parsing

---

## Monorepo Structure

```
FinancialAssistant/
├── src/                         # Backend (Node/Express)
│   ├── index.ts                 # Entry point — starts server + cron jobs
│   ├── api/
│   │   ├── server.ts            # Express app factory (routes, middleware)
│   │   ├── middleware/auth.ts   # Firebase token verification
│   │   └── routes/
│   │       ├── auth.ts
│   │       ├── profile.ts
│   │       ├── household.ts
│   │       ├── transactions.ts       # POST / | POST /manual | POST /image | GET / | PUT/:id | DELETE/:id
│   │       ├── recurringTransactions.ts
│   │       ├── categoryBudgets.ts
│   │       └── reports.ts
│   ├── services/
│   │   ├── householdService.ts
│   │   ├── transactionService.ts     # logTransaction, getMonthlyTransactions, ...
│   │   ├── recurringTransactionService.ts  # computeNextRunAt, computeCurrentPeriodDate, ...
│   │   ├── categoryBudgetService.ts
│   │   └── reportService.ts
│   ├── ai/
│   │   └── gemini.ts                 # parseTransaction (text) + parseTransactionFromImage (vision)
│   ├── jobs/
│   │   ├── monthlyReport.ts          # cron: monthly report push notification
│   │   └── recurringTransactions.ts  # cron: daily 00:05, fires due recurring items
│   └── db/prisma.ts                  # Prisma client singleton
├── prisma/schema.prisma         # DB models (see below)
├── mobile/                      # Expo app
│   ├── app/
│   │   ├── _layout.tsx          # Root layout, AuthProvider, QueryProvider
│   │   ├── (auth)/signin.tsx    # Email/password + Google Sign-In
│   │   ├── (onboarding)/        # WELCOME → INVITE_PROMPT → INCOME → BUDGET → COMPLETE
│   │   └── (tabs)/
│   │       ├── index.tsx        # Dashboard / Home
│   │       ├── chat.tsx         # AI chat — text + image (camera button)
│   │       ├── history.tsx      # Transaction list
│   │       └── settings.tsx     # Profile, household, budgets, recurring transactions
│   ├── components/
│   │   ├── TransactionFormModal.tsx  # Manual add/edit — exports CATEGORIES array
│   │   ├── RecurringTransactionModal.tsx  # Add recurring transaction
│   │   ├── ChatBubble.tsx
│   │   ├── TransactionCard.tsx
│   │   ├── BudgetGauge.tsx
│   │   └── ChartSection.tsx
│   └── lib/
│       ├── api.ts               # fetch wrapper + all TypeScript interfaces
│       ├── auth.tsx             # AuthContext (Firebase onAuthStateChanged)
│       ├── firebase.ts          # Firebase app init
│       ├── theme.tsx            # Dark/light theme colors + ThemeContext
│       └── pushNotifications.ts
├── .env                         # Backend env (never commit)
├── mobile/.env                  # Mobile env (never commit)
└── CLAUDE.md                    # This file
```

---

## Database Models (Prisma / SQLite)

| Model | Key fields |
|---|---|
| `Household` | `id`, `inviteCode` (unique), `monthlyIncome`, `budgetLimit` |
| `Member` | `email` (unique), `firebaseUid`, `name`, `householdId`, `onboardingStep`, `pushToken` |
| `Transaction` | `householdId`, `memberEmail`, `type` (EXPENSE\|INCOME), `amount`, `category`, `description`, `date?` |
| `RecurringTransaction` | `householdId`, `memberEmail`, `type`, `amount`, `category`, `frequency` (WEEKLY\|MONTHLY), `dayOfWeek?`, `dayOfMonth?`, `nextRunAt`, `isActive` |
| `CategoryBudget` | `householdId`, `category`, `budgetLimit` — unique on `(householdId, category)` |

**Note**: Prisma client may not yet recognise `RecurringTransaction` by name (DLL lock issue on Windows). Access it via `(prisma as any).recurringTransaction`.

---

## Environment Variables

**Backend (`.env`)**:
```
DATABASE_URL="file:./dev.db"
GEMINI_API_KEY=...
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY=...
```

**Mobile (`mobile/.env`)**:
```
EXPO_PUBLIC_API_URL=http://<local-ip>:3000
EXPO_PUBLIC_GOOGLE_CLIENT_ID=...   # Web OAuth client ID from Google Cloud Console
```

---

## Key Design Decisions

### Authentication
- Firebase Auth (Email/Password + Google Sign-In)
- Google Sign-In is hidden in Expo Go (`Constants.appOwnership === 'expo'`) because Google blocks `exp://` redirect URIs
- Backend verifies Firebase ID tokens via `verifyFirebaseToken` middleware

### AI / Gemini
- Text: `parseTransaction(message)` → `ParsedTransaction[]`
- Image: `parseTransactionFromImage(base64, mimeType)` → `ParsedTransaction[]`
- Both return `null` if input is not a financial transaction
- Model: `gemini-2.5-flash` for both text and vision

### Image Upload
- Mobile sends raw base64 (not data URI) in JSON body
- Express body limit set to `10mb` in `server.ts` (default 100KB was too small)

### Recurring Transactions
- Created in Settings → "🔁 תשלומים קבועים"
- On creation: immediately logs a transaction for the **current period** (current month's day / most recent matching weekday) using `computeCurrentPeriodDate()`
- Cron job (`5 0 * * *`) calls `getDueRecurringTransactions` → logs → advances `nextRunAt` via `computeNextRunAt()`
- Soft-deleted (`isActive = false`)

### Categories (Hebrew)
Defined in `mobile/components/TransactionFormModal.tsx`:
`אוכל, תחבורה, דיור, בידור, בריאות, קניות, חיות מחמד, משכורת, פרילנס, חינוך, כללי`

---

## API Routes

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/login` | Firebase token → upsert Member |
| GET/PUT | `/api/profile` | Get/update member profile |
| GET/PUT | `/api/household` | Get/update household settings |
| POST | `/api/household/join` | Join by invite code |
| POST | `/api/transactions` | AI text → log transactions |
| POST | `/api/transactions/manual` | Direct structured log |
| POST | `/api/transactions/image` | AI image → log transactions |
| GET | `/api/transactions` | Monthly transaction list |
| PUT/DELETE | `/api/transactions/:id` | Edit/delete transaction |
| GET | `/api/reports` | Monthly + weekly reports |
| GET/PUT/DELETE | `/api/category-budgets` | Per-category budget goals |
| GET/POST/DELETE | `/api/recurring-transactions` | Recurring transaction management |

---

## Running the Project

```bash
# Backend (from root)
npm run dev          # ts-node watch mode, port 3000

# Mobile (from mobile/)
npx expo start --clear
```

After schema changes:
```bash
npx prisma db push   # from root — syncs DB + regenerates client
```

---

## Common Issues & Fixes

| Symptom | Cause | Fix |
|---|---|---|
| "לא ניתן לנתח את התמונה" | Express body too large (413) | Already fixed: `express.json({ limit: '10mb' })` |
| Prisma client doesn't know `recurringTransaction` | DLL lock prevented regeneration | Restart backend — it regenerates on start |
| Google Sign-In crashes in Expo Go | Google blocks `exp://` URIs | Expected — only works in native builds |
| Adjacent JSX elements error | Modal rendered outside fragment | Wrap return in `<>...</>` |
