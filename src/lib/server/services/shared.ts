import "server-only";

import { and, eq, sql } from "drizzle-orm";

import type { AppDatabase } from "@/lib/db/client";
import {
  activityEvents,
  adminAuditLogs,
  translationUsageDaily,
  userSettings,
  users,
} from "@/lib/db/schema";
import { PLANS } from "@/lib/config";
import type {
  ActivityLevel,
  ActivityType,
  AdminSettingsRecord,
  PlanId,
  TranslationUsageDailyRecord,
  UserRecord,
  UserSettingsRecord,
} from "@/lib/types";
import { nowIso, startOfDayKey } from "@/lib/server/utils";

import {
  getAdminSettingsRecord,
  resolveDailyTranslationLimit,
  resolveDictionaryLimit,
} from "./site-settings";

export type DbTransaction = Parameters<Parameters<AppDatabase["transaction"]>[0]>[0];
export type DbExecutor = AppDatabase | DbTransaction;
export type UserSafe = Omit<UserRecord, "passwordHash" | "activationKey">;

type UserRow = typeof users.$inferSelect;
type UserSettingsRow = typeof userSettings.$inferSelect;
type UsageRow = typeof translationUsageDaily.$inferSelect;

interface ActivityLogInput {
  userId: number;
  type: ActivityType;
  action: string;
  detail: string;
  level?: ActivityLevel;
}

interface AdminLogInput {
  adminUserId: number | null;
  type: ActivityType | "admin";
  action: string;
  detail: string;
  level?: ActivityLevel;
}

export function toDate(value: string | Date | null | undefined) {
  if (!value) return null;
  return value instanceof Date ? value : new Date(value);
}

export function toIsoString(value: string | Date | null | undefined) {
  if (!value) return null;
  return (value instanceof Date ? value : new Date(value)).toISOString();
}

export function mapUserRow(row: UserRow): UserRecord {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.passwordHash,
    activationKey: row.activationKey,
    role: row.role as UserRecord["role"],
    plan: row.plan as PlanId,
    translationLimitOverride: row.translationLimitOverride,
    dictionaryLimitOverride: row.dictionaryLimitOverride,
    status: row.status as UserRecord["status"],
    registeredAt: toIsoString(row.registeredAt) ?? "",
    lastActiveAt: toIsoString(row.lastActiveAt) ?? "",
  };
}

export function mapUserSettingsRow(row: UserSettingsRow): UserSettingsRecord {
  return {
    userId: row.userId,
    dailyWords: row.dailyWords,
    dailyNewWords: row.dailyNewWords,
    prioritizeDifficult: row.prioritizeDifficult,
    includePhrases: row.includePhrases,
    autoSync: row.autoSync,
    poorConnection: row.poorConnection as UserSettingsRecord["poorConnection"],
    reminderEnabled: row.reminderEnabled,
    emailNotifications: row.emailNotifications,
  };
}

export function mapUsageRow(row: UsageRow): TranslationUsageDailyRecord {
  return {
    id: row.id,
    userId: row.userId,
    dayKey: row.dayKey,
    count: row.count,
  };
}

export function omitPassword(user: UserRow | UserRecord): UserSafe {
  if (user.registeredAt instanceof Date) {
    const { passwordHash, activationKey, ...safe } = mapUserRow(user as UserRow);
    void passwordHash;
    void activationKey;
    return safe;
  }

  const { passwordHash, activationKey, ...safe } = user as UserRecord;
  void passwordHash;
  void activationKey;
  return safe;
}

export function getPlanLimit(
  plan: PlanId,
  settings?: AdminSettingsRecord,
) {
  return settings
    ? resolveDailyTranslationLimit(settings, plan)
    : PLANS[plan].dailyTranslations;
}

export function getDictionaryLimit(
  plan: PlanId,
  settings?: AdminSettingsRecord,
) {
  return settings
    ? resolveDictionaryLimit(settings, plan)
    : PLANS[plan].dictionaryLimit;
}

type UserLimitScope = {
  plan: PlanId | string;
  translationLimitOverride?: number | null;
  dictionaryLimitOverride?: number | null;
};

export function getUserTranslationLimit(
  user: UserLimitScope,
  settings?: AdminSettingsRecord,
) {
  return user.translationLimitOverride ?? getPlanLimit(user.plan as PlanId, settings);
}

export function getUserDictionaryLimit(
  user: UserLimitScope,
  settings?: AdminSettingsRecord,
) {
  return user.dictionaryLimitOverride ?? getDictionaryLimit(user.plan as PlanId, settings);
}

export function activationKeyPreview(activationKey: string) {
  if (!activationKey) return "-";
  if (activationKey.length <= 12) return activationKey;
  return `${activationKey.slice(0, 10)}...${activationKey.slice(-6)}`;
}

export async function getUserRow(executor: DbExecutor, userId: number) {
  const rows = await executor.select().from(users).where(eq(users.id, userId)).limit(1);
  return rows[0] ?? null;
}

export async function getUserSettingsRow(executor: DbExecutor, userId: number) {
  const rows = await executor
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);
  return rows[0] ?? null;
}

export async function findUserById(executor: DbExecutor, userId: number) {
  const row = await getUserRow(executor, userId);
  return row ? mapUserRow(row) : null;
}

export async function findSettings(executor: DbExecutor, userId: number) {
  const row = await getUserSettingsRow(executor, userId);
  return row ? mapUserSettingsRow(row) : null;
}

export async function findUserByActivationKey(executor: DbExecutor, activationKey: string) {
  const normalized = activationKey.trim().toUpperCase();
  const rows = await executor
    .select()
    .from(users)
    .where(sql`upper(${users.activationKey}) = ${normalized}`)
    .limit(1);
  return rows[0] ?? null;
}

export async function requireUser(executor: DbExecutor, userId: number) {
  const row = await getUserRow(executor, userId);
  if (!row) {
    throw new Error("USER_NOT_FOUND");
  }
  return row;
}

export async function getOrCreateUsageRow(executor: DbExecutor, userId: number) {
  const dayKey = startOfDayKey();
  const existing = await executor
    .select()
    .from(translationUsageDaily)
    .where(and(eq(translationUsageDaily.userId, userId), eq(translationUsageDaily.dayKey, dayKey)))
    .limit(1);

  if (existing[0]) {
    return existing[0];
  }

  const inserted = await executor
    .insert(translationUsageDaily)
    .values({
      userId,
      dayKey,
      count: 0,
    })
    .onConflictDoNothing({
      target: [translationUsageDaily.userId, translationUsageDaily.dayKey],
    })
    .returning();

  if (inserted[0]) {
    return inserted[0];
  }

  const fallback = await executor
    .select()
    .from(translationUsageDaily)
    .where(and(eq(translationUsageDaily.userId, userId), eq(translationUsageDaily.dayKey, dayKey)))
    .limit(1);

  if (!fallback[0]) {
    throw new Error("TRANSLATION_USAGE_NOT_FOUND");
  }

  return fallback[0];
}

export async function getUsageRecord(executor: DbExecutor, userId: number) {
  return mapUsageRow(await getOrCreateUsageRow(executor, userId));
}

export async function incrementUsageWithinQuota(
  executor: DbExecutor,
  user: Pick<UserRecord, "id" | "plan" | "translationLimitOverride">,
  amount = 1,
) {
  const incrementBy = Math.max(1, Math.floor(amount));
  const usage = await getOrCreateUsageRow(executor, user.id);
  const adminSettings = await getAdminSettingsRecord(executor);
  const limit = getUserTranslationLimit(user, adminSettings);

  const updated = await executor
    .update(translationUsageDaily)
    .set({
      count: sql<number>`${translationUsageDaily.count} + ${incrementBy}`,
    })
    .where(
      limit === null
        ? eq(translationUsageDaily.id, usage.id)
        : and(
            eq(translationUsageDaily.id, usage.id),
            sql`${translationUsageDaily.count} + ${incrementBy} <= ${limit}`,
          ),
    )
    .returning();

  if (!updated[0]) {
    throw new Error("TRANSLATION_LIMIT_REACHED");
  }

  return updated[0] ?? { ...usage, count: usage.count + incrementBy };
}

export async function incrementUsageOrThrow(executor: DbExecutor, user: UserRecord, amount = 1) {
  return mapUsageRow(await incrementUsageWithinQuota(executor, user, amount));
}

export async function logActivity(
  executor: DbExecutor,
  userIdOrInput: number | ActivityLogInput,
  type?: ActivityType,
  action?: string,
  detail?: string,
  level: ActivityLevel = "info",
) {
  const input =
    typeof userIdOrInput === "number"
      ? {
          userId: userIdOrInput,
          type: type as ActivityType,
          action: action ?? "",
          detail: detail ?? "",
          level,
        }
      : {
          ...userIdOrInput,
          level: userIdOrInput.level ?? "info",
        };

  await executor.insert(activityEvents).values({
    userId: input.userId,
    type: input.type,
    action: input.action,
    detail: input.detail,
    level: input.level,
    createdAt: toDate(nowIso()) ?? new Date(),
  });
}

export async function logAdmin(
  executor: DbExecutor,
  adminUserIdOrInput: number | null | AdminLogInput,
  type?: ActivityType | "admin",
  action?: string,
  detail?: string,
  level: ActivityLevel = "info",
) {
  const input =
    typeof adminUserIdOrInput === "object" && adminUserIdOrInput !== null
      ? {
          ...adminUserIdOrInput,
          level: adminUserIdOrInput.level ?? "info",
        }
      : {
          adminUserId: adminUserIdOrInput,
          type: type as ActivityType | "admin",
          action: action ?? "",
          detail: detail ?? "",
          level,
        };

  await executor.insert(adminAuditLogs).values({
    adminUserId: input.adminUserId,
    type: input.type,
    action: input.action,
    detail: input.detail,
    level: input.level,
    createdAt: toDate(nowIso()) ?? new Date(),
  });
}
