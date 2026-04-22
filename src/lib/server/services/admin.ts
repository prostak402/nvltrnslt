import "server-only";

import { and, desc, eq, inArray } from "drizzle-orm";

import type {
  AdminAnalyticsResponse,
  AdminDashboardResponse,
  AdminLogEntry,
  AdminUserRow,
} from "@/lib/contracts/admin";
import { getDb } from "@/lib/db/client";
import { serverEnv } from "@/lib/env";
import {
  activityEvents,
  adminAuditLogs,
  devices,
  paymentEvents,
  studyItemOccurrences,
  studyItems,
  subscriptions,
  supportTickets,
  systemState,
  translationUsageDaily,
  users,
} from "@/lib/db/schema";
import type { AdminSettingsPatch, AppState, PlanId } from "@/lib/types";
import {
  average,
  formatDateTimeRu,
  nowIso,
  startOfDayKey,
} from "@/lib/server/utils";

import {
  activationKeyPreview,
  getUserDictionaryLimit,
  getUserRow,
  getUserTranslationLimit,
  logAdmin,
  omitPassword,
  toIsoString,
} from "./shared";
import {
  translationProviderIsConfigured,
  type TranslationDegradeReason,
  type TranslationProvider,
} from "./translation";
import { getBackupStatusRecord } from "./backups";
import { getObservabilitySummary } from "./observability";
import {
  ADMIN_SETTINGS_KEY,
  getAdminSettingsRecord,
  normalizeAdminSettings,
} from "./site-settings";

const TRANSLATION_HEALTH_WINDOW_MS = 30 * 60 * 1000;
const TRANSLATION_STATS_WINDOW_MS = 24 * 60 * 60 * 1000;

function mapSupportTicketRow(row: typeof supportTickets.$inferSelect): AppState["supportTickets"][number] {
  return {
    id: row.id,
    userId: row.userId,
    subject: row.subject,
    category: row.category as AppState["supportTickets"][number]["category"],
    status: row.status as AppState["supportTickets"][number]["status"],
    createdAt: toIsoString(row.createdAt) ?? "",
    updatedAt: toIsoString(row.updatedAt) ?? "",
  };
}

type TranslationActivityProvider = TranslationProvider | "cache";
type ParsedTranslationActivity = {
  createdAtIso: string;
  provider: TranslationActivityProvider | null;
  degraded: boolean;
  degradeReason: TranslationDegradeReason | null;
};

function parseTranslationActivityDetail(
  detail: string,
  createdAtIso: string,
): ParsedTranslationActivity {
  const meta = detail.split(" | ").reduce<Record<string, string>>((acc, part) => {
    const separatorIndex = part.indexOf("=");
    if (separatorIndex <= 0) {
      return acc;
    }

    acc[part.slice(0, separatorIndex)] = part.slice(separatorIndex + 1);
    return acc;
  }, {});

  const provider = meta.provider;
  const degradeReason = meta.degradeReason;

  return {
    createdAtIso,
    provider:
      provider === "cache" || provider === "local" || provider === "yandex"
        ? provider
        : null,
    degraded: meta.degraded === "yes",
    degradeReason:
      degradeReason &&
      [
        "provider_not_configured",
        "provider_timeout",
        "provider_rate_limited",
        "provider_http_error",
        "provider_auth_error",
        "provider_invalid_response",
        "provider_network_error",
      ].includes(degradeReason)
        ? (degradeReason as TranslationDegradeReason)
        : null,
  };
}

function buildTranslationHealth(
  translationRows: Array<typeof activityEvents.$inferSelect>,
): AdminDashboardResponse["translationHealth"] {
  const providerConfigured = translationProviderIsConfigured();
  const now = Date.now();
  const parsedRows = translationRows
    .map((entry) =>
      parseTranslationActivityDetail(
        entry.detail,
        toIsoString(entry.createdAt) ?? nowIso(),
      ),
    )
    .sort((a, b) => b.createdAtIso.localeCompare(a.createdAtIso));

  const recentRows = parsedRows.filter(
    (entry) =>
      now - new Date(entry.createdAtIso).getTime() <= TRANSLATION_STATS_WINDOW_MS,
  );
  const degradedRecentRows = recentRows.filter((entry) => entry.degraded);
  const lastTranslation = parsedRows[0] ?? null;
  const lastDegraded = parsedRows.find((entry) => entry.degraded) ?? null;
  const lastHealthyUpstream =
    parsedRows.find(
      (entry) => entry.provider === "yandex" && !entry.degraded,
    ) ?? null;

  const degradedReasons = Array.from(
    degradedRecentRows.reduce<Map<TranslationDegradeReason, number>>((acc, entry) => {
      if (!entry.degradeReason) {
        return acc;
      }

      acc.set(entry.degradeReason, (acc.get(entry.degradeReason) ?? 0) + 1);
      return acc;
    }, new Map()),
  )
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3)
    .map(([reason, count]) => ({ reason, count }));

  const degradedIsCurrent =
    Boolean(lastDegraded) &&
    now - new Date(lastDegraded!.createdAtIso).getTime() <=
      TRANSLATION_HEALTH_WINDOW_MS &&
    (!lastHealthyUpstream ||
      new Date(lastHealthyUpstream.createdAtIso).getTime() <
        new Date(lastDegraded!.createdAtIso).getTime());

  const currentStatus: AdminDashboardResponse["translationHealth"]["currentStatus"] =
    !providerConfigured
      ? "not_configured"
      : degradedIsCurrent
        ? "degraded"
        : "healthy";

  return {
    upstreamProvider: providerConfigured ? "yandex" : "local",
    providerConfigured,
    degradedMode: serverEnv.TRANSLATION_DEGRADED_MODE,
    currentStatus,
    currentSource: lastTranslation?.provider ?? null,
    lastTranslationAt: lastTranslation?.createdAtIso ?? null,
    lastHealthyAt: lastHealthyUpstream?.createdAtIso ?? null,
    lastDegradedAt: lastDegraded?.createdAtIso ?? null,
    lastDegradeReason: lastDegraded?.degradeReason ?? null,
    recentRequests24h: recentRows.length,
    degradedEvents24h: degradedRecentRows.length,
    degradedReasons24h: degradedReasons,
  };
}

export async function getAdminDashboardData(): Promise<AdminDashboardResponse> {
  const currentMonth = nowIso().slice(0, 7);
  const todayKey = startOfDayKey();
  const weekAgo = new Date(Date.now() - 7 * 86400000);

  const [userRows, ticketRows, usageRowsToday, paidRowsThisMonth, adminSettings, translationActivityRows, backupStatus, observability] = await Promise.all([
    getDb().select().from(users),
    getDb().select().from(supportTickets),
    getDb()
      .select()
      .from(translationUsageDaily)
      .where(eq(translationUsageDaily.dayKey, todayKey)),
    getDb().select().from(paymentEvents),
    getAdminSettingsRecord(getDb()),
    getDb()
      .select()
      .from(activityEvents)
      .where(eq(activityEvents.type, "translation"))
      .orderBy(desc(activityEvents.createdAt))
      .limit(200),
    getBackupStatusRecord(),
    getObservabilitySummary(),
  ]);

  const openTickets = ticketRows.filter((entry) => entry.status === "open").length;
  const translationsToday = usageRowsToday.reduce((sum, entry) => sum + entry.count, 0);
  const monthlyRevenue = paidRowsThisMonth
    .filter((entry) => entry.status === "paid" && (toIsoString(entry.createdAt) ?? "").slice(0, 7) === currentMonth)
    .reduce((sum, entry) => sum + Number(entry.amount), 0)
    .toFixed(2);

  const recentUsers = userRows
    .slice()
    .sort((a, b) => b.registeredAt.getTime() - a.registeredAt.getTime())
    .slice(0, 5)
    .map((user) => omitPassword(user));
  const recentTickets = ticketRows
    .slice()
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, 5)
    .map(mapSupportTicketRow);
  const translationHealth = buildTranslationHealth(translationActivityRows);

  return {
    stats: {
      totalUsers: userRows.length,
      activeToday: userRows.filter((entry) => (toIsoString(entry.lastActiveAt) ?? "").slice(0, 10) === todayKey).length,
      newThisWeek: userRows.filter((entry) => entry.registeredAt >= weekAgo).length,
      monthlyRevenue,
      translationsToday,
      openTickets,
    },
    recentUsers,
    recentTickets,
    translationHealth,
    observability,
    alerts: [
      adminSettings.adminNotifications && translationsToday > 150
        ? "Увеличенная нагрузка на proxy переводов"
        : null,
      adminSettings.adminNotifications && openTickets > 0
        ? `${openTickets} тикетов поддержки требуют внимания`
        : null,
      adminSettings.maintenanceMode ? "Включён режим обслуживания" : null,
      adminSettings.errorAlerts && !translationHealth.providerConfigured
        ? "Yandex Cloud переводчик не настроен. Сервер работает в деградированном режиме."
        : null,
      adminSettings.errorAlerts && translationHealth.currentStatus === "degraded"
        ? "Переводчик сейчас находится в деградации и часть запросов уходит в fallback."
        : null,
      adminSettings.errorAlerts && observability.health.status === "degraded"
        ? "Health-check сообщает о деградации сервиса."
        : null,
      adminSettings.errorAlerts && observability.readiness.status === "not_ready"
        ? "Readiness-check не пройдён. Инстанс нельзя считать готовым к трафику."
        : null,
      adminSettings.errorAlerts && observability.recentErrors15m > 0
        ? `За последние 15 минут зафиксировано ${observability.recentErrors15m} серверных ошибок.`
        : null,
      adminSettings.errorAlerts && backupStatus.lastErrorAt
        ? `Последний бэкап завершился ошибкой: ${backupStatus.lastErrorMessage}`
        : null,
      adminSettings.errorAlerts &&
      adminSettings.autoBackup &&
      backupStatus.nextDueAt !== null &&
      new Date(backupStatus.nextDueAt).getTime() <= Date.now()
        ? "Автоматический бэкап просрочен и ждёт ближайшего health-check."
        : null,
    ].filter((alert): alert is string => Boolean(alert)),
  };
}

export async function getAdminUsersData(): Promise<AdminUserRow[]> {
  const todayKey = startOfDayKey();
  const [userRows, itemRows, usageRows, deviceRows, translationRows, adminSettings] = await Promise.all([
    getDb().select().from(users).orderBy(users.id),
    getDb().select({ userId: studyItems.userId, kind: studyItems.kind }).from(studyItems),
    getDb()
      .select()
      .from(translationUsageDaily)
      .where(eq(translationUsageDaily.dayKey, todayKey)),
    getDb()
      .select({ userId: devices.userId })
      .from(devices)
      .where(eq(devices.status, "active")),
    getDb()
      .select({ userId: activityEvents.userId })
      .from(activityEvents)
      .where(eq(activityEvents.type, "translation")),
    getAdminSettingsRecord(getDb()),
  ]);

  const wordsCountByUser = new Map<number, number>();
  const phrasesCountByUser = new Map<number, number>();
  for (const item of itemRows) {
    if (item.kind === "word") {
      wordsCountByUser.set(item.userId, (wordsCountByUser.get(item.userId) ?? 0) + 1);
    }
    if (item.kind === "phrase") {
      phrasesCountByUser.set(item.userId, (phrasesCountByUser.get(item.userId) ?? 0) + 1);
    }
  }

  const translationsTodayByUser = new Map(usageRows.map((entry) => [entry.userId, entry.count]));
  const devicesCountByUser = new Map<number, number>();
  for (const device of deviceRows) {
    devicesCountByUser.set(device.userId, (devicesCountByUser.get(device.userId) ?? 0) + 1);
  }

  const totalTranslationsByUser = new Map<number, number>();
  for (const entry of translationRows) {
    totalTranslationsByUser.set(entry.userId, (totalTranslationsByUser.get(entry.userId) ?? 0) + 1);
  }

  return userRows.map((user) => ({
    ...omitPassword(user),
    wordsCount: wordsCountByUser.get(user.id) ?? 0,
    phrasesCount: phrasesCountByUser.get(user.id) ?? 0,
    translationsToday: translationsTodayByUser.get(user.id) ?? 0,
    translationLimit: getUserTranslationLimit(user, adminSettings),
    translationLimitOverride: user.translationLimitOverride,
    dictionaryLimit: getUserDictionaryLimit(user, adminSettings),
    dictionaryLimitOverride: user.dictionaryLimitOverride,
    devicesCount: devicesCountByUser.get(user.id) ?? 0,
    totalTranslations: totalTranslationsByUser.get(user.id) ?? 0,
    activationKeyPreview: activationKeyPreview(user.activationKey),
  }));
}

export async function updateAdminUserAccess(
  adminUserId: number,
  input: {
    userId: number;
    plan?: PlanId;
    translationLimitOverride?: number | null;
    dictionaryLimitOverride?: number | null;
  },
): Promise<AdminUserRow> {
  return getDb().transaction(async (tx) => {
    const targetUser = await getUserRow(tx, input.userId);
    if (!targetUser) {
      throw new Error("USER_NOT_FOUND");
    }

    const nextPlan = input.plan ?? (targetUser.plan as PlanId);
    const nextTranslationLimitOverride =
      input.translationLimitOverride !== undefined
        ? input.translationLimitOverride
        : targetUser.translationLimitOverride;
    const nextDictionaryLimitOverride =
      input.dictionaryLimitOverride !== undefined
        ? input.dictionaryLimitOverride
        : targetUser.dictionaryLimitOverride;
    const now = new Date();

    await tx
      .update(users)
      .set({
        plan: nextPlan,
        translationLimitOverride: nextTranslationLimitOverride,
        dictionaryLimitOverride: nextDictionaryLimitOverride,
      })
      .where(eq(users.id, input.userId));

    if (input.plan !== undefined && input.plan !== targetUser.plan) {
      const activeSubscriptions = await tx
        .select({ id: subscriptions.id })
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.userId, input.userId),
            inArray(subscriptions.status, ["active", "trial"]),
          ),
        );

      if (activeSubscriptions.length > 0) {
        await tx
          .update(subscriptions)
          .set({
            status: "cancelled",
            endedAt: now,
            renewalAt: now,
            currentPeriodEnd: now,
            cancelAtPeriodEnd: false,
            cancelledAt: now,
          })
          .where(
            inArray(
              subscriptions.id,
              activeSubscriptions.map((entry) => entry.id),
            ),
          );
      }

      await tx.insert(subscriptions).values({
        userId: input.userId,
        plan: nextPlan,
        status: "active",
        billingProvider: "admin",
        currentPeriodStart: now,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        cancelledAt: null,
        startedAt: now,
        renewalAt: null,
        endedAt: null,
      });
    }

    await logAdmin(tx, {
      adminUserId,
      type: "admin",
      action: "Параметры доступа пользователя обновлены",
      detail: JSON.stringify({
        userId: input.userId,
        planBefore: targetUser.plan,
        planAfter: nextPlan,
        translationLimitOverrideBefore: targetUser.translationLimitOverride,
        translationLimitOverrideAfter: nextTranslationLimitOverride,
        dictionaryLimitOverrideBefore: targetUser.dictionaryLimitOverride,
        dictionaryLimitOverrideAfter: nextDictionaryLimitOverride,
      }),
    });

    const [updatedUser] = await tx
      .select()
      .from(users)
      .where(eq(users.id, input.userId))
      .limit(1);

    if (!updatedUser) {
      throw new Error("USER_NOT_FOUND");
    }

    const [wordsCount, phrasesCount, usageRow, devicesCount, totalTranslations, adminSettings] =
      await Promise.all([
        tx
          .select({ count: studyItems.id })
          .from(studyItems)
          .where(and(eq(studyItems.userId, input.userId), eq(studyItems.kind, "word"))),
        tx
          .select({ count: studyItems.id })
          .from(studyItems)
          .where(and(eq(studyItems.userId, input.userId), eq(studyItems.kind, "phrase"))),
        tx
          .select()
          .from(translationUsageDaily)
          .where(eq(translationUsageDaily.userId, input.userId)),
        tx
          .select({ userId: devices.userId })
          .from(devices)
          .where(and(eq(devices.userId, input.userId), eq(devices.status, "active"))),
        tx
          .select({ userId: activityEvents.userId })
          .from(activityEvents)
          .where(and(eq(activityEvents.userId, input.userId), eq(activityEvents.type, "translation"))),
        getAdminSettingsRecord(tx),
      ]);

    return {
      ...omitPassword(updatedUser),
      wordsCount: wordsCount.length,
      phrasesCount: phrasesCount.length,
      translationsToday:
        usageRow.find((entry) => entry.dayKey === startOfDayKey())?.count ?? 0,
      translationLimit: getUserTranslationLimit(updatedUser, adminSettings),
      translationLimitOverride: updatedUser.translationLimitOverride,
      dictionaryLimit: getUserDictionaryLimit(updatedUser, adminSettings),
      dictionaryLimitOverride: updatedUser.dictionaryLimitOverride,
      devicesCount: devicesCount.length,
      totalTranslations: totalTranslations.length,
      activationKeyPreview: activationKeyPreview(updatedUser.activationKey),
    };
  });
}

export async function getAdminLogsData(): Promise<AdminLogEntry[]> {
  const [userRows, activityRows, adminRows] = await Promise.all([
    getDb().select().from(users),
    getDb().select().from(activityEvents),
    getDb().select().from(adminAuditLogs),
  ]);

  const userMap = new Map(userRows.map((user) => [user.id, user]));
  const combined = [
    ...activityRows.map((entry) => ({
      id: `activity-${entry.id}`,
      type: entry.type as AdminLogEntry["type"],
      action: entry.action,
      userId: entry.userId,
      userName: userMap.get(entry.userId)?.name,
      detail: entry.detail,
      timestampIso: toIsoString(entry.createdAt) ?? nowIso(),
      level: entry.level as AdminLogEntry["level"],
    })),
    ...adminRows.map((entry) => ({
      id: `admin-${entry.id}`,
      type:
        entry.type === "admin"
          ? "system"
          : (entry.type as AdminLogEntry["type"]),
      action: entry.action,
      userId: entry.adminUserId ?? undefined,
      userName: entry.adminUserId ? userMap.get(entry.adminUserId)?.name : "System",
      detail: entry.detail,
      timestampIso: toIsoString(entry.createdAt) ?? nowIso(),
      level: entry.level as AdminLogEntry["level"],
    })),
  ]
    .sort((a, b) => b.timestampIso.localeCompare(a.timestampIso))
    .map(({ timestampIso, ...entry }) => ({
      ...entry,
      timestamp: formatDateTimeRu(timestampIso),
    }));

  return combined;
}

export async function getAdminAnalyticsData(): Promise<AdminAnalyticsResponse> {
  const [userRows, usageRows, occurrenceRows, paymentRows, itemRows] = await Promise.all([
    getDb().select().from(users),
    getDb().select().from(translationUsageDaily),
    getDb().select().from(studyItemOccurrences),
    getDb().select().from(paymentEvents),
    getDb().select({ userId: studyItems.userId }).from(studyItems),
  ]);

  const registrationData = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (6 - index));
    const label = new Intl.DateTimeFormat("ru-RU", { month: "short" }).format(date);
    const prefix = date.toISOString().slice(0, 7);
    return {
      month: label,
      value: userRows.filter((user) => (toIsoString(user.registeredAt) ?? "").slice(0, 7) === prefix).length,
    };
  });

  const translationVolume = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const label = new Intl.DateTimeFormat("ru-RU", { weekday: "short" }).format(date);
    const key = startOfDayKey(date);
    return {
      day: label,
      value: usageRows.filter((entry) => entry.dayKey === key).reduce((sum, entry) => sum + entry.count, 0),
    };
  });

  const novelMap = new Map<string, { users: Set<number>; words: number }>();
  for (const occurrence of occurrenceRows) {
    const current = novelMap.get(occurrence.novelTitle) ?? { users: new Set<number>(), words: 0 };
    current.users.add(occurrence.userId);
    current.words += 1;
    novelMap.set(occurrence.novelTitle, current);
  }

  const topNovels = Array.from(novelMap.entries())
    .map(([name, meta]) => ({ name, users: meta.users.size, words: meta.words, pct: meta.words }))
    .sort((a, b) => b.words - a.words)
    .slice(0, 8);
  const totalWords = topNovels.reduce((sum, entry) => sum + entry.words, 0) || 1;

  const dictionarySizeByUser = new Map<number, number>();
  for (const item of itemRows) {
    dictionarySizeByUser.set(item.userId, (dictionarySizeByUser.get(item.userId) ?? 0) + 1);
  }

  return {
    registrationData,
    translationVolume,
    topNovels: topNovels.map((entry) => ({ ...entry, pct: Math.round((entry.words / totalWords) * 100) })),
    retentionData: [
      { label: "День 1", value: 72 },
      { label: "День 7", value: 48 },
      { label: "День 14", value: 35 },
      { label: "День 30", value: 24 },
      { label: "День 60", value: 18 },
      { label: "День 90", value: 14 },
    ],
    kpis: {
      totalUsers: userRows.length,
      dauMau: "27.4%",
      arpu:
        paymentRows.length > 0
          ? `$${average(paymentRows.filter((entry) => entry.status === "paid").map((entry) => Number(entry.amount))).toFixed(2)}`
          : "$0.00",
      translationsMonth: usageRows
        .filter((entry) => entry.dayKey.slice(0, 7) === nowIso().slice(0, 7))
        .reduce((sum, entry) => sum + entry.count, 0),
      wordsSaved: itemRows.length,
      averageDictionary: average(userRows.map((user) => dictionarySizeByUser.get(user.id) ?? 0)).toFixed(1),
    },
  };
}



export async function getAdminSettingsData() {
  const [adminRows, adminSettings] = await Promise.all([
    getDb().select().from(users).where(eq(users.role, "admin")),
    getAdminSettingsRecord(getDb()),
  ]);

  return {
    admins: adminRows.map((entry) => omitPassword(entry)),
    adminSettings,
  };
}

export async function saveAdminSettings(
  adminUserId: number,
  patch: AdminSettingsPatch,
) {
  return getDb().transaction(async (tx) => {
    const currentSettings = await getAdminSettingsRecord(tx);
    const nextSettings = normalizeAdminSettings({
      ...currentSettings,
      defaultDailyLimit: {
        ...currentSettings.defaultDailyLimit,
        ...patch.defaultDailyLimit,
      },
      maxDictionarySize: {
        ...currentSettings.maxDictionarySize,
        ...patch.maxDictionarySize,
      },
      ...patch,
    });

    await tx
      .insert(systemState)
      .values({
        key: ADMIN_SETTINGS_KEY,
        payload: nextSettings,
      })
      .onConflictDoUpdate({
        target: systemState.key,
        set: {
          payload: nextSettings,
        },
      });

    await logAdmin(tx, {
      adminUserId,
      type: "admin",
      action: "Настройки администрирования обновлены",
      detail: JSON.stringify(patch),
    });

    return nextSettings;
  });
}
