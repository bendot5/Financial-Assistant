# FinancialAssistant — Project Guide for Claude

## What This Is
A Hebrew-language household expense tracker, targeting **web browsers** (deployed on Vercel).
- **Backend**: Node.js + Express + Prisma (PostgreSQL on Railway, SQLite locally) + Firebase Auth, runs on port 3000
- **Frontend**: React Native / Expo (expo-router) compiled to **web** via Metro bundler, Hebrew RTL UI, dark/light theme
- **AI**: Google Gemini (`gemini-2.5-flash`) for natural-language and image-based transaction parsing

> **Target platform: Web only.** Native iOS/Android builds are NOT the current goal. All UI decisions, API choices, and platform-specific code should favour web compatibility.

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
│   ├── lib/
│   │   ├── firebaseAdmin.ts          # Firebase Admin SDK init
│   │   └── expoPush.ts               # Expo push notification wrapper
│   └── db/prisma.ts                  # Prisma client singleton
├── prisma/schema.prisma         # DB models (see below)
├── mobile/                      # Expo web app (compiled to static files)
│   ├── app/
│   │   ├── _layout.tsx          # Root layout, AuthProvider, QueryProvider
│   │   ├── (auth)/signin.tsx    # Email/password + Google Sign-In
│   │   ├── (onboarding)/        # NAME → INVITE_PROMPT → INCOME → BUDGET → COMPLETE
│   │   └── (tabs)/
│   │       ├── index.tsx        # Dashboard / Home
│   │       ├── chat.tsx         # AI chat — text + image (file picker on web)
│   │       ├── history.tsx      # Transaction list
│   │       └── settings.tsx     # Profile, household, budgets, recurring transactions
│   ├── components/
│   │   ├── TransactionFormModal.tsx  # Manual add/edit — exports CATEGORIES array
│   │   ├── RecurringTransactionModal.tsx  # Add recurring transaction
│   │   ├── ConfirmModal.tsx          # Reusable confirmation modal (replaces Alert.alert)
│   │   ├── ChatBubble.tsx
│   │   ├── TransactionCard.tsx
│   │   ├── BudgetGauge.tsx
│   │   └── ChartSection.tsx
│   ├── lib/
│   │   ├── api.ts               # fetch wrapper + all TypeScript interfaces
│   │   ├── auth.tsx             # AuthContext (Firebase onAuthStateChanged)
│   │   ├── firebase.ts          # Firebase app init (lazy AsyncStorage import for web compat)
│   │   ├── theme.tsx            # Dark/light theme colors + ThemeContext
│   │   └── pushNotifications.ts # Push token registration (no-op on web)
│   └── vercel.json              # SPA rewrite: all routes → /index.html
├── railway.toml                 # Railway deployment config (backend)
├── .env                         # Backend env (never commit)
├── mobile/.env                  # Frontend env (never commit)
└── CLAUDE.md                    # This file
```

---

## Database Models (Prisma)

| Model | Key fields |
|---|---|
| `Household` | `id`, `inviteCode` (unique), `monthlyIncome`, `budgetLimit` |
| `Member` | `email` (unique), `firebaseUid`, `name`, `householdId`, `onboardingStep`, `pushToken` |
| `Transaction` | `householdId`, `memberEmail`, `type` (EXPENSE\|INCOME), `amount`, `category`, `description`, `date?` |
| `RecurringTransaction` | `householdId`, `memberEmail`, `type`, `amount`, `category`, `frequency` (WEEKLY\|MONTHLY), `dayOfWeek?`, `dayOfMonth?`, `nextRunAt`, `isActive` |
| `CategoryBudget` | `householdId`, `category`, `budgetLimit` — unique on `(householdId, category)` |

**Note**: Prisma client may not recognise `RecurringTransaction` by name (DLL lock issue on Windows). Access it via `(prisma as any).recurringTransaction`.

---

## Environment Variables

**Backend (`.env`)**:
```
DATABASE_URL="file:./dev.db"          # local dev (SQLite); Railway uses PostgreSQL
GEMINI_API_KEY=...
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY=...              # escaped newlines — parsed with .replace(/\\n/g, '\n').trim()
```

**Frontend (`mobile/.env`)**:
```
EXPO_PUBLIC_API_URL=http://<local-ip>:3000   # dev; production points to Railway backend
EXPO_PUBLIC_GOOGLE_CLIENT_ID=...             # Web OAuth client ID from Google Cloud Console
```

---

## Deployment

| Service | What | Notes |
|---|---|---|
| **Vercel** | Frontend (static web) | `mobile/vercel.json` rewrites all routes → `/index.html` |
| **Railway** | Backend API + PostgreSQL | `railway.toml` — nixpacks builder, `prisma db push` on start |

**Build pipeline (frontend):**
```bash
cd mobile && npx expo export -p web   # outputs to mobile/dist/
```
Vercel picks up `mobile/dist/` and serves it as a static site with SPA routing.

---

## Key Design Decisions

### Platform: Web First
- `react-native-web`, `react-dom`, and `@expo/metro-runtime` are installed for web compilation.
- All new UI must use web-compatible primitives (no `CameraRoll`, no `Linking` with custom URI schemes, etc.).
- `Platform.OS !== 'web'` guards wrap any native-only code (e.g., expo-notifications setup).
- `Alert.alert()` does NOT work on web — use `ConfirmModal` component instead (already done in history.tsx and settings.tsx).

### Authentication
- Firebase Auth (Email/Password + Google Sign-In via `signInWithPopup`).
- Google Sign-In works in web browsers. The Expo Go restriction is irrelevant for web builds.
- Firebase persistence uses `browserLocalPersistence` on web, `getReactNativePersistence(AsyncStorage)` on native (lazy-imported to avoid web build errors).
- Backend verifies Firebase ID tokens via `verifyFirebaseToken` middleware.

### AI / Gemini
- Text: `parseTransaction(message)` → `ParsedTransaction[]`
- Image: `parseTransactionFromImage(base64, mimeType)` → `ParsedTransaction[]`
- Both return `null` if input is not a financial transaction.
- Model: `gemini-2.5-flash` for both text and vision.

### Image Upload
- On web: `<input type="file">` / `expo-image-picker` web mode → base64 → sent as raw base64 (not data URI) in JSON body.
- Express body limit set to `10mb` in `server.ts`.

### Recurring Transactions
- Created in Settings → "🔁 תשלומים קבועים"
- On creation: immediately logs a transaction for the **current period** using `computeCurrentPeriodDate()`.
- Cron job (`5 0 * * *`) calls `getDueRecurringTransactions` → logs → advances `nextRunAt` via `computeNextRunAt()`.
- Soft-deleted (`isActive = false`).

### Push Notifications
- Expo push notifications are **not available on web**. The cron job still runs on the backend but web clients will not receive push alerts. `pushNotifications.ts` is a no-op on `Platform.OS === 'web'`.

### Categories (Hebrew)
Defined in [mobile/components/TransactionFormModal.tsx](mobile/components/TransactionFormModal.tsx):
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
npm run dev          # tsx watch mode, port 3000

# Frontend web (from mobile/)
npx expo start --web --clear    # dev server with HMR
# OR build static output:
npx expo export -p web          # outputs to mobile/dist/
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
| Build error: `AsyncStorage` not found | AsyncStorage imported at module level | Already fixed: lazy-require inside `Platform.OS !== 'web'` block in `firebase.ts` |
| Notifications crash on web export | expo-notifications not web-compatible | Already fixed: guarded behind `Platform.OS !== 'web'` |
| `Alert.alert()` silently fails on web | React Native Alert not supported in browser | Use `ConfirmModal` component instead |
| Adjacent JSX elements error | Modal rendered outside fragment | Wrap return in `<>...</>` |
| Firebase private key parsing error | Escaped `\n` in env var | Already fixed: `.replace(/\\n/g, '\n').trim()` in `firebaseAdmin.ts` |
