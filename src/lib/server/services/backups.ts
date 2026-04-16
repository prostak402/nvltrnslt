import "server-only";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { eq } from "drizzle-orm";

import { APP_NAME, APP_VERSION } from "@/lib/config";
import { getDb } from "@/lib/db/client";
import {
  activityEvents,
  adminAuditLogs,
  billingCheckoutIntents,
  compatibilityGames,
  deviceLinkCodes,
  devices,
  paymentEvents,
  reviewEvents,
  studyItemOccurrences,
  studyItems,
  subscriptions,
  supportMessages,
  supportTickets,
  systemState,
  translationCache,
  translationUsageDaily,
  userSettings,
  users,
} from "@/lib/db/schema";
import type { BackupStatusRecord } from "@/lib/types";
import { nowIso } from "@/lib/server/utils";

import { logAdmin } from "./shared";
import { getAdminSettingsRecord } from "./site-settings";
import { sendAlertDelivery } from "./alert-delivery";

const BACKUP_STATUS_KEY = "backup_status";
const BACKUPS_DIR = path.join(process.cwd(), "data", "backups");

type BackupTrigger = "manual" | "scheduled";

function buildScheduledDate(
  now: Date,
  backupTime: string,
  dayOffset = 0,
) {
  const [hoursRaw, minutesRaw] = backupTime.split(":");
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);
  const scheduled = new Date(now);

  scheduled.setDate(scheduled.getDate() + dayOffset);
  scheduled.setHours(hours, minutes, 0, 0);

  return scheduled;
}

function toIsoOrNull(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function defaultBackupStatus(): BackupStatusRecord {
  return {
    lastSuccessAt: null,
    lastErrorAt: null,
    lastErrorMessage: "",
    lastFileName: "",
    lastFilePath: "",
    lastTrigger: "",
    nextDueAt: null,
  };
}

function computeNextDueAt(
  backupTime: string,
  lastSuccessAt: string | null,
  now = new Date(),
) {
  const todayScheduled = buildScheduledDate(now, backupTime);
  const lastSuccess = lastSuccessAt ? new Date(lastSuccessAt) : null;

  if (!lastSuccess || lastSuccess.getTime() < todayScheduled.getTime()) {
    return todayScheduled.toISOString();
  }

  return buildScheduledDate(now, backupTime, 1).toISOString();
}

function normalizeBackupStatus(
  payload: unknown,
  backupTime: string,
): BackupStatusRecord {
  if (!payload || typeof payload !== "object") {
    return {
      ...defaultBackupStatus(),
      nextDueAt: computeNextDueAt(backupTime, null),
    };
  }

  const record = payload as Record<string, unknown>;
  const lastSuccessAt = toIsoOrNull(record.lastSuccessAt);

  return {
    lastSuccessAt,
    lastErrorAt: toIsoOrNull(record.lastErrorAt),
    lastErrorMessage:
      typeof record.lastErrorMessage === "string" ? record.lastErrorMessage : "",
    lastFileName: typeof record.lastFileName === "string" ? record.lastFileName : "",
    lastFilePath: "",
    lastTrigger:
      record.lastTrigger === "manual" || record.lastTrigger === "scheduled"
        ? record.lastTrigger
        : "",
    nextDueAt: computeNextDueAt(backupTime, lastSuccessAt),
  };
}

export async function getBackupStatusRecord() {
  const db = getDb();
  const settings = await getAdminSettingsRecord(db);
  const [entry] = await db
    .select({ payload: systemState.payload })
    .from(systemState)
    .where(eq(systemState.key, BACKUP_STATUS_KEY))
    .limit(1);

  return normalizeBackupStatus(entry?.payload, settings.backupTime);
}

async function saveBackupStatus(status: BackupStatusRecord) {
  await getDb()
    .insert(systemState)
    .values({
      key: BACKUP_STATUS_KEY,
      payload: status,
    })
    .onConflictDoUpdate({
      target: systemState.key,
      set: {
        payload: status,
      },
    });
}

async function collectBackupSnapshot() {
  const db = getDb();
  const [
    userRows,
    userSettingsRows,
    deviceRows,
    deviceLinkCodeRows,
    studyItemRows,
    studyItemOccurrenceRows,
    reviewEventRows,
    activityEventRows,
    translationCacheRows,
    translationUsageRows,
    supportTicketRows,
    supportMessageRows,
    compatibilityGameRows,
    subscriptionRows,
    paymentEventRows,
    billingIntentRows,
    adminAuditLogRows,
    systemStateRows,
  ] = await Promise.all([
    db.select().from(users),
    db.select().from(userSettings),
    db.select().from(devices),
    db.select().from(deviceLinkCodes),
    db.select().from(studyItems),
    db.select().from(studyItemOccurrences),
    db.select().from(reviewEvents),
    db.select().from(activityEvents),
    db.select().from(translationCache),
    db.select().from(translationUsageDaily),
    db.select().from(supportTickets),
    db.select().from(supportMessages),
    db.select().from(compatibilityGames),
    db.select().from(subscriptions),
    db.select().from(paymentEvents),
    db.select().from(billingCheckoutIntents),
    db.select().from(adminAuditLogs),
    db.select().from(systemState),
  ]);

  return {
    app: APP_NAME,
    version: APP_VERSION,
    createdAt: nowIso(),
    tables: {
      users: userRows,
      userSettings: userSettingsRows,
      devices: deviceRows,
      deviceLinkCodes: deviceLinkCodeRows,
      studyItems: studyItemRows,
      studyItemOccurrences: studyItemOccurrenceRows,
      reviewEvents: reviewEventRows,
      activityEvents: activityEventRows,
      translationCache: translationCacheRows,
      translationUsageDaily: translationUsageRows,
      supportTickets: supportTicketRows,
      supportMessages: supportMessageRows,
      compatibilityGames: compatibilityGameRows,
      subscriptions: subscriptionRows,
      paymentEvents: paymentEventRows,
      billingCheckoutIntents: billingIntentRows,
      adminAuditLogs: adminAuditLogRows,
      systemState: systemStateRows,
    },
  };
}

export async function ensureBackupStorageAvailable() {
  await mkdir(BACKUPS_DIR, { recursive: true });

  return {
    status: "ok" as const,
    path: BACKUPS_DIR,
  };
}

function buildBackupFileName(timestampIso: string) {
  const compact = timestampIso.replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  return `nvltrnslt-backup-${compact}.json`;
}

export async function runBackupNow(params?: {
  trigger?: BackupTrigger;
  adminUserId?: number | null;
}) {
  const trigger = params?.trigger ?? "manual";
  const adminUserId = params?.adminUserId ?? null;
  const settings = await getAdminSettingsRecord(getDb());
  const startedAt = nowIso();
  const fileName = buildBackupFileName(startedAt);
  const filePath = path.join(BACKUPS_DIR, fileName);

  try {
    await ensureBackupStorageAvailable();

    const snapshot = await collectBackupSnapshot();
    await writeFile(filePath, JSON.stringify(snapshot, null, 2), "utf8");

    const status: BackupStatusRecord = {
      lastSuccessAt: startedAt,
      lastErrorAt: null,
      lastErrorMessage: "",
      lastFileName: fileName,
      lastFilePath: "",
      lastTrigger: trigger,
      nextDueAt: computeNextDueAt(settings.backupTime, startedAt),
    };

    await saveBackupStatus(status);
    await getDb().transaction(async (tx) => {
      await logAdmin(tx, {
        adminUserId,
        type: "system",
        action: trigger === "manual" ? "Бэкап создан вручную" : "Бэкап создан по расписанию",
        detail: fileName,
        level: "success",
      });
    });

    return status;
  } catch (error) {
    const status: BackupStatusRecord = {
      ...(await getBackupStatusRecord()),
      lastErrorAt: startedAt,
      lastErrorMessage: "Не удалось создать бэкап",
      nextDueAt: computeNextDueAt(settings.backupTime, null),
    };

    await saveBackupStatus(status);

    if (settings.errorAlerts) {
      await getDb().transaction(async (tx) => {
        await logAdmin(tx, {
          adminUserId,
          type: "system",
          action: "Ошибка создания бэкапа",
          detail: status.lastErrorMessage,
          level: "error",
        });
      });

      await sendAlertDelivery({
        category: "error",
        title: "Ошибка создания backup",
        lines: [
          `trigger: ${trigger}`,
          `message: ${status.lastErrorMessage}`,
        ],
        dedupeKey: `backup:${trigger}:failure`,
        minIntervalMs: 300_000,
      });
    }

    throw error;
  }
}

export async function runScheduledBackupIfDue() {
  const settings = await getAdminSettingsRecord(getDb());

  if (!settings.autoBackup) {
    return getBackupStatusRecord();
  }

  const status = await getBackupStatusRecord();
  const nextDueAt = status.nextDueAt ? new Date(status.nextDueAt) : null;

  if (!nextDueAt || Date.now() < nextDueAt.getTime()) {
    return status;
  }

  return runBackupNow({ trigger: "scheduled", adminUserId: null });
}
