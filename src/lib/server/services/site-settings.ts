import "server-only";

import { eq } from "drizzle-orm";

import { PLANS, PLAN_ORDER } from "@/lib/config";
import { getDb } from "@/lib/db/client";
import { systemState } from "@/lib/db/schema";
import { serverEnv } from "@/lib/env";
import type {
  AdminSettingsRecord,
  PlanId,
  UserRole,
} from "@/lib/types";

import type { DbExecutor } from "./shared";

export const ADMIN_SETTINGS_KEY = "admin_settings";

function defaultPlanLimits(
  selector: (planId: PlanId) => number | null,
): Record<PlanId, number | null> {
  return PLAN_ORDER.reduce<Record<PlanId, number | null>>((acc, planId) => {
    acc[planId] = selector(planId);
    return acc;
  }, {} as Record<PlanId, number | null>);
}

function normalizeNullableLimit(value: unknown, fallback: number | null) {
  if (value === null || value === 0 || value === "0") {
    return null;
  }

  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }

  if (typeof value === "string" && /^\d+$/.test(value)) {
    const parsed = Number(value);
    return parsed > 0 ? parsed : null;
  }

  return fallback;
}

function normalizePlanLimits(
  value: unknown,
  fallback: Record<PlanId, number | null>,
): Record<PlanId, number | null> {
  if (!value || typeof value !== "object") {
    return fallback;
  }

  const record = value as Record<string, unknown>;

  return PLAN_ORDER.reduce<Record<PlanId, number | null>>((acc, planId) => {
    acc[planId] = normalizeNullableLimit(record[planId], fallback[planId]);
    return acc;
  }, {} as Record<PlanId, number | null>);
}

export function defaultAdminSettings(): AdminSettingsRecord {
  return {
    defaultDailyLimit: defaultPlanLimits((planId) => PLANS[planId].dailyTranslations),
    maxDictionarySize: defaultPlanLimits((planId) => PLANS[planId].dictionaryLimit),
    apiTimeoutSec: Math.max(1, Math.round(serverEnv.TRANSLATION_TIMEOUT_MS / 1000)),
    autoBackup: false,
    backupTime: "03:00",
    maintenanceMode: false,
    registrationOpen: true,
    adminNotifications: true,
    errorAlerts: true,
  };
}

export function normalizeAdminSettings(payload: unknown): AdminSettingsRecord {
  const defaults = defaultAdminSettings();

  if (!payload || typeof payload !== "object") {
    return defaults;
  }

  const record = payload as Record<string, unknown>;

  return {
    defaultDailyLimit: normalizePlanLimits(
      record.defaultDailyLimit,
      defaults.defaultDailyLimit,
    ),
    maxDictionarySize: normalizePlanLimits(
      record.maxDictionarySize,
      defaults.maxDictionarySize,
    ),
    apiTimeoutSec:
      typeof record.apiTimeoutSec === "number" &&
      Number.isInteger(record.apiTimeoutSec) &&
      record.apiTimeoutSec >= 1 &&
      record.apiTimeoutSec <= 30
        ? record.apiTimeoutSec
        : defaults.apiTimeoutSec,
    autoBackup: record.autoBackup === true,
    backupTime:
      typeof record.backupTime === "string" &&
      /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(record.backupTime)
        ? record.backupTime
        : defaults.backupTime,
    maintenanceMode: record.maintenanceMode === true,
    registrationOpen: record.registrationOpen !== false,
    adminNotifications: record.adminNotifications !== false,
    errorAlerts: record.errorAlerts !== false,
  };
}

export async function getAdminSettingsRecord(
  executor: DbExecutor = getDb(),
) {
  const [entry] = await executor
    .select({ payload: systemState.payload })
    .from(systemState)
    .where(eq(systemState.key, ADMIN_SETTINGS_KEY))
    .limit(1);

  return normalizeAdminSettings(entry?.payload);
}

export function resolveDailyTranslationLimit(
  settings: AdminSettingsRecord,
  planId: PlanId,
) {
  return settings.defaultDailyLimit[planId];
}

export function resolveDictionaryLimit(
  settings: AdminSettingsRecord,
  planId: PlanId,
) {
  return settings.maxDictionarySize[planId];
}

export function resolveTranslationTimeoutMs(settings: AdminSettingsRecord) {
  return Math.max(1000, settings.apiTimeoutSec * 1000);
}

export async function getRuntimeDailyLimit(
  planId: PlanId,
  executor: DbExecutor = getDb(),
) {
  return resolveDailyTranslationLimit(await getAdminSettingsRecord(executor), planId);
}

export async function getRuntimeDictionaryLimit(
  planId: PlanId,
  executor: DbExecutor = getDb(),
) {
  return resolveDictionaryLimit(await getAdminSettingsRecord(executor), planId);
}

export async function getRuntimeTranslationTimeoutMs(
  executor: DbExecutor = getDb(),
) {
  return resolveTranslationTimeoutMs(await getAdminSettingsRecord(executor));
}

export async function assertRegistrationOpen(
  executor: DbExecutor = getDb(),
) {
  const settings = await getAdminSettingsRecord(executor);

  if (!settings.registrationOpen) {
    throw new Error("REGISTRATION_CLOSED");
  }

  return settings;
}

export async function assertSiteAccessAllowed(
  role: UserRole | string | null | undefined,
  executor: DbExecutor = getDb(),
) {
  const settings = await getAdminSettingsRecord(executor);

  if (settings.maintenanceMode && role !== "admin") {
    throw new Error("MAINTENANCE_MODE");
  }

  return settings;
}

export async function isMaintenanceModeEnabled(
  executor: DbExecutor = getDb(),
) {
  return (await getAdminSettingsRecord(executor)).maintenanceMode;
}
