import { randomBytes } from 'crypto';
import { prisma } from '../db/prisma.js';

function generateInviteCode(): string {
  // Produces codes like HH-A3B9C2 (6 hex chars → 16^6 ≈ 16M combinations)
  return `HH-${randomBytes(3).toString('hex').toUpperCase()}`;
}

// ─── Member queries ───────────────────────────────────────────────────────────

export async function getMember(phone: string) {
  return prisma.member.findUnique({
    where: { phone },
    include: { household: true },
  });
}

export async function createMember(phone: string) {
  return prisma.member.create({
    data: { phone },
    include: { household: true },
  });
}

export async function updateMember(
  phone: string,
  data: {
    name?: string;
    householdId?: string | null;
    onboardingStep?: string;
    pendingIncome?: number | null;
  },
) {
  return prisma.member.update({
    where: { phone },
    data,
    include: { household: true },
  });
}

// ─── Household queries ────────────────────────────────────────────────────────

export async function createHousehold(params: {
  name: string;
  monthlyIncome: number;
  budgetLimit: number;
}) {
  return prisma.household.create({
    data: { ...params, inviteCode: generateInviteCode() },
  });
}

export async function findHouseholdByCode(code: string) {
  return prisma.household.findUnique({
    where: { inviteCode: code.trim().toUpperCase() },
    include: { members: true },
  });
}

export async function getHouseholdMembers(householdId: string) {
  return prisma.member.findMany({
    where: { householdId },
    orderBy: { createdAt: 'asc' },
  });
}
