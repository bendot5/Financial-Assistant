import { randomBytes } from 'crypto';
import { prisma } from '../db/prisma.js';

function generateInviteCode(): string {
  // Produces codes like HH-A3B9C2 (6 hex chars → 16^6 ≈ 16M combinations)
  return `HH-${randomBytes(3).toString('hex').toUpperCase()}`;
}

// ─── Member queries ───────────────────────────────────────────────────────────

export async function getMember(email: string) {
  return prisma.member.findUnique({
    where: { email },
    include: { household: true },
  });
}

export async function createMember(email: string) {
  return prisma.member.create({
    data: { email },
    include: { household: true },
  });
}

export async function updateMember(
  email: string,
  data: {
    name?: string;
    householdId?: string | null;
    onboardingStep?: string;
    pendingIncome?: number | null;
    pushToken?: string | null;
  },
) {
  return prisma.member.update({
    where: { email },
    data,
    include: { household: true },
  });
}

/** Look up a member by their Firebase UID (used in API route handlers). */
export async function getMemberByFirebaseUid(uid: string) {
  return prisma.member.findUnique({
    where: { firebaseUid: uid },
    include: { household: true },
  });
}

/**
 * Creates a new member for the given email + Firebase UID if they don't exist,
 * or links the Firebase UID to an existing member record.
 * Returns the member and whether they were just created.
 */
export async function upsertMemberByEmail(email: string, firebaseUid: string) {
  const existing = await prisma.member.findUnique({ where: { email } });
  const isNew = !existing;

  const member = await prisma.member.upsert({
    where: { email },
    create: { email, firebaseUid },
    update: { firebaseUid },
    include: { household: true },
  });

  return { member, isNew };
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

export async function updateHousehold(
  householdId: string,
  data: { monthlyIncome?: number; budgetLimit?: number; name?: string },
) {
  return prisma.household.update({ where: { id: householdId }, data });
}
