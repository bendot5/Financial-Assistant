import { getAuth } from 'firebase/auth';

const BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

async function authHeader(): Promise<Record<string, string>> {
  const user = getAuth().currentUser;
  if (!user) return {};
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
    ...(await authHeader()),
    ...init?.headers,
  };
  const res = await fetch(`${BASE}/api${path}`, { ...init, headers });
  const json = await res.json();
  if (!res.ok) throw new Error((json as { error?: string }).error ?? `HTTP ${res.status}`);
  return json as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(path: string) =>
    request<T>(path, { method: 'DELETE' }),
};

// ─── Typed helpers ────────────────────────────────────────────────────────────

export interface Household {
  id: string;
  name: string | null;
  inviteCode: string;
  monthlyIncome: number;
  budgetLimit: number;
}

export interface Member {
  id: string;
  phone: string;
  name: string | null;
  householdId: string | null;
  onboardingStep: string;
  pushToken: string | null;
  household?: Household | null;
}

export interface Transaction {
  id: string;
  type: 'EXPENSE' | 'INCOME';
  amount: number;
  category: string;
  description: string;
  memberPhone: string;
  date?: string | null;
  createdAt: string;
}

export interface CategoryBudget {
  id: string;
  category: string;
  budgetLimit: number;
}

export interface MonthlyReport {
  month: number;
  year: number;
  monthName: string;
  householdName: string | null;
  budgetLimit: number;
  totalExpenses: number;
  totalIncome: number;
  budgetUsedPct: number;
  remaining: number;
  topCategories: { category: string; amount: number; pct: number }[];
  incomeCategories: { category: string; amount: number; pct: number }[];
  categoryBudgets: { category: string; budgetLimit: number; spent: number; pct: number }[];
  dailyExpenses: { day: number; amount: number }[];
  transactionCount: number;
}

export interface WeeklyReport {
  weekOf: string;
  totalExpenses: number;
  totalIncome: number;
  weeklyBudget: number;
  budgetUsedPct: number;
  topCategories: { category: string; amount: number; pct: number }[];
  categoryBudgets: { category: string; weeklyLimit: number; spent: number; pct: number }[];
}
