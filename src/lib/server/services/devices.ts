import "server-only";

import { and, eq, isNull } from "drizzle-orm";

import {
  APP_NAME,
  DEVICE_CODE_TTL_MINUTES,
  MAX_ACTIVE_DEVICES,
  PLANS,
} from "@/lib/config";
import { getDb } from "@/lib/db/client";
import {
  deviceLinkCodes,
  devices,
  studyItemOccurrences,
  studyItems,
  translationCache,
} from "@/lib/db/schema";
import type { DeviceRecord, StudyKind } from "@/lib/types";
import {
  addHours,
  countTranslationUnits,
  formatDateTimeRu,
  formatRelativeDateRu,
  makeAccessCode,
  makeDeviceToken,
  normalizeStudyText,
  normalizeWord,
  nowIso,
  sha256,
} from "@/lib/server/utils";

import {
  activationKeyPreview,
  findSettings,
  findUserByActivationKey,
  findUserById,
  getUserDictionaryLimit,
  getUserTranslationLimit,
  getUsageRecord,
  incrementUsageOrThrow,
  logActivity,
  omitPassword,
  toDate,
  toIsoString,
  type DbExecutor,
} from "./shared";
import {
  isStaleCachedTranslation,
  translateText,
  translationProviderIsConfigured,
  type TranslationDegradeReason,
  type TranslationProvider,
} from "./translation";
import {
  assertSiteAccessAllowed,
  getAdminSettingsRecord,
} from "./site-settings";

type DeviceRow = typeof devices.$inferSelect;
type DeviceLinkCodeRow = typeof deviceLinkCodes.$inferSelect;
type UsageRecord = Awaited<ReturnType<typeof getUsageRecord>>;
type TranslationApiProvider = TranslationProvider | "cache";

function mapDeviceRow(row: DeviceRow): DeviceRecord {
  return {
    id: row.id,
    userId: row.userId,
    label: row.label,
    tokenHash: row.tokenHash,
    rawTokenPreview: row.rawTokenPreview,
    linkedAt: toIsoString(row.linkedAt) ?? "",
    lastSeenAt: toIsoString(row.lastSeenAt) ?? "",
    status: row.status as DeviceRecord["status"],
  };
}

function mapDeviceLinkCodeRow(row: DeviceLinkCodeRow) {
  return {
    id: row.id,
    userId: row.userId,
    code: row.code,
    expiresAt: toIsoString(row.expiresAt) ?? "",
    usedAt: toIsoString(row.usedAt),
    createdAt: toIsoString(row.createdAt) ?? "",
  };
}

async function getActiveDeviceContext(executor: DbExecutor, deviceToken: string) {
  const deviceRows = await executor
    .select()
    .from(devices)
    .where(
      and(eq(devices.tokenHash, sha256(deviceToken)), eq(devices.status, "active")),
    )
    .limit(1);

  const deviceRow = deviceRows[0];
  if (!deviceRow) {
    throw new Error("UNAUTHORIZED_DEVICE");
  }

  const userRow = await findUserById(executor, deviceRow.userId);
  if (!userRow) {
    throw new Error("USER_NOT_FOUND");
  }
  await assertSiteAccessAllowed(userRow.role, executor);

  return { deviceRow, userRow };
}

async function getActiveDevicesForUser(executor: DbExecutor, userId: number) {
  return executor
    .select()
    .from(devices)
    .where(and(eq(devices.userId, userId), eq(devices.status, "active")));
}

async function buildLinkedDevicePayload(
  executor: DbExecutor,
  userId: number,
  rawToken: string,
) {
  const userRow = await findUserById(executor, userId);
  const adminSettings = await getAdminSettingsRecord(executor);
  if (!userRow) {
    throw new Error("USER_NOT_FOUND");
  }
  await assertSiteAccessAllowed(userRow.role, executor);

  return {
    deviceToken: rawToken,
    user: omitPassword(userRow),
    settings: await findSettings(executor, userId),
    features: PLANS[userRow.plan].features,
    plan: userRow.plan,
    quotas: {
      dailyTranslations: getUserTranslationLimit(userRow, adminSettings),
    },
  };
}

async function touchDevice(
  executor: DbExecutor,
  deviceId: number,
  timestamp: string,
) {
  await executor
    .update(devices)
    .set({
      lastSeenAt: toDate(timestamp) ?? new Date(),
    })
    .where(eq(devices.id, deviceId));
}

function buildQuotaPayload(
  usage: UsageRecord,
  limit: number | null,
  requestedUnits: number,
  consumedUnits: number,
) {
  return {
    dayKey: usage.dayKey,
    used: usage.count,
    limit,
    remaining: limit === null ? null : Math.max(limit - usage.count, 0),
    requestedUnits,
    consumedUnits,
  };
}

function buildTranslationLogAction(
  cached: boolean,
  degraded: boolean,
) {
  if (cached) {
    return "Перевод из кэша";
  }

  if (degraded) {
    return "Перевод в деградированном режиме";
  }

  return "Перевод слова";
}

function buildTranslationLogDetail(params: {
  text: string;
  translation: string;
  provider: TranslationApiProvider;
  cached: boolean;
  degraded: boolean;
  degradeReason: TranslationDegradeReason | null;
  requestedUnits: number;
  consumedUnits: number;
}) {
  const parts = [
    `${params.text} -> ${params.translation}`,
    `provider=${params.provider}`,
    `cached=${params.cached ? "yes" : "no"}`,
    `degraded=${params.degraded ? "yes" : "no"}`,
    `requestedUnits=${params.requestedUnits}`,
    `consumedUnits=${params.consumedUnits}`,
  ];

  if (params.degradeReason) {
    parts.push(`degradeReason=${params.degradeReason}`);
  }

  return parts.join(" | ");
}

function buildTranslationResponse(params: {
  text: string;
  translation: string;
  cached: boolean;
  provider: TranslationApiProvider;
  degraded: boolean;
  degradeReason: TranslationDegradeReason | null;
  attempts: number;
  usage: UsageRecord;
  limit: number | null;
  requestedUnits: number;
  consumedUnits: number;
}) {
  return {
    text: params.text,
    translation: params.translation,
    cached: params.cached,
    provider: params.provider,
    degraded: params.degraded,
    degradeReason: params.degradeReason,
    attempts: params.attempts,
    quota: buildQuotaPayload(
      params.usage,
      params.limit,
      params.requestedUnits,
      params.consumedUnits,
    ),
  };
}

async function assertTranslationQuotaAvailable(
  executor: DbExecutor,
  user: Awaited<ReturnType<typeof findUserById>>,
  requestedUnits: number,
) {
  if (!user) {
    throw new Error("USER_NOT_FOUND");
  }
  const adminSettings = await getAdminSettingsRecord(executor);
  const usage = await getUsageRecord(executor, user.id);
  const limit = getUserTranslationLimit(user, adminSettings);

  if (limit !== null && usage.count + requestedUnits > limit) {
    throw new Error("TRANSLATION_LIMIT_REACHED");
  }

  return usage;
}

async function findCachedTranslation(executor: DbExecutor, text: string) {
  const rows = await executor
    .select()
    .from(translationCache)
    .where(
      and(eq(translationCache.text, text), eq(translationCache.targetLanguage, "ru")),
    )
    .limit(1);

  return rows[0] ?? null;
}

export async function createDeviceLinkCode(userId: number) {
  return getDb().transaction(async (tx) => {
    const now = nowIso();

    await tx
      .update(deviceLinkCodes)
      .set({
        expiresAt: toDate(now) ?? new Date(),
      })
      .where(and(eq(deviceLinkCodes.userId, userId), isNull(deviceLinkCodes.usedAt)));

    const inserted = await tx
      .insert(deviceLinkCodes)
      .values({
        userId,
        code: makeAccessCode(),
        expiresAt:
          toDate(addHours(now, DEVICE_CODE_TTL_MINUTES / 60)) ?? new Date(),
        usedAt: null,
        createdAt: toDate(now) ?? new Date(),
      })
      .returning();

    const codeRow = inserted[0];
    if (!codeRow) {
      throw new Error("DEVICE_CODE_CREATE_FAILED");
    }

    await logActivity(tx, {
      userId,
      type: "system",
      action: "Создан код доступа",
      detail: codeRow.code,
    });

    return mapDeviceLinkCodeRow(codeRow);
  });
}

export async function getDevicesPageData(userId: number) {
  const db = getDb();
  const userRow = await findUserById(db, userId);
  if (!userRow) {
    throw new Error("USER_NOT_FOUND");
  }

  const deviceRows = await db
    .select()
    .from(devices)
    .where(eq(devices.userId, userId));

  return {
    activationKeyPreview: activationKeyPreview(userRow.activationKey),
    activationFileName: "nvl_translate_key.json",
    activationFilePath: "/api/dashboard/activation-file",
    devices: deviceRows.map((deviceRow) => ({
      id: deviceRow.id,
      name: deviceRow.label,
      lastActive: formatRelativeDateRu(
        toIsoString(deviceRow.lastSeenAt) ?? nowIso(),
      ),
      status: deviceRow.status === "active" ? "active" : "inactive",
      linkedAt: formatDateTimeRu(toIsoString(deviceRow.linkedAt) ?? nowIso()),
      tokenPreview: deviceRow.rawTokenPreview,
    })),
    maxDevices: MAX_ACTIVE_DEVICES,
    activeDevices: deviceRows.filter((deviceRow) => deviceRow.status === "active")
      .length,
  };
}

export async function getActivationFilePayload(userId: number, siteUrl: string) {
  const userRow = await findUserById(getDb(), userId);
  if (!userRow) {
    throw new Error("USER_NOT_FOUND");
  }

  return {
    app: APP_NAME,
    version: 1,
    activationKey: userRow.activationKey,
    apiBaseUrl: siteUrl.replace(/\/+$/, ""),
    accountEmail: userRow.email,
    generatedAt: nowIso(),
  };
}

export async function revokeDevice(userId: number, deviceId: number) {
  return getDb().transaction(async (tx) => {
    const now = nowIso();
    const updated = await tx
      .update(devices)
      .set({
        status: "revoked",
        lastSeenAt: toDate(now) ?? new Date(),
      })
      .where(and(eq(devices.id, deviceId), eq(devices.userId, userId)))
      .returning();

    const deviceRow = updated[0];
    if (!deviceRow) {
      throw new Error("DEVICE_NOT_FOUND");
    }

    await logActivity(tx, {
      userId,
      type: "sync",
      action: "Устройство отвязано",
      detail: deviceRow.label,
      level: "warning",
    });

    return mapDeviceRow(deviceRow);
  });
}

export async function linkDeviceFromCode(params: {
  code: string;
  deviceLabel: string;
}) {
  const { code, deviceLabel } = params;

  return getDb().transaction(async (tx) => {
    const now = nowIso();
    const codeRows = await tx
      .select()
      .from(deviceLinkCodes)
      .where(eq(deviceLinkCodes.code, code))
      .limit(1);

    const linkCode = codeRows[0];
    if (!linkCode || linkCode.usedAt || (toIsoString(linkCode.expiresAt) ?? "") < now) {
      throw new Error("INVALID_DEVICE_CODE");
    }

    const userRow = await findUserById(tx, linkCode.userId);
    if (!userRow) {
      throw new Error("USER_NOT_FOUND");
    }
    await assertSiteAccessAllowed(userRow.role, tx);

    const activeDeviceRows = await getActiveDevicesForUser(tx, userRow.id);
    if (activeDeviceRows.length >= MAX_ACTIVE_DEVICES) {
      throw new Error("DEVICE_LIMIT_REACHED");
    }

    const rawToken = makeDeviceToken();
    await tx.insert(devices).values({
      userId: userRow.id,
      label: deviceLabel.trim() || "Ren'Py Device",
      tokenHash: sha256(rawToken),
      rawTokenPreview: rawToken.slice(0, 8),
      linkedAt: toDate(now) ?? new Date(),
      lastSeenAt: toDate(now) ?? new Date(),
      status: "active",
    });

    await tx
      .update(deviceLinkCodes)
      .set({
        usedAt: toDate(now) ?? new Date(),
      })
      .where(eq(deviceLinkCodes.id, linkCode.id));

    await logActivity(tx, {
      userId: userRow.id,
      type: "sync",
      action: "Подключено новое устройство",
      detail: deviceLabel.trim() || "Ren'Py Device",
      level: "success",
    });

    return buildLinkedDevicePayload(tx, userRow.id, rawToken);
  });
}

export async function linkDeviceFromActivationKey(params: {
  activationKey: string;
  deviceLabel: string;
}) {
  const { activationKey, deviceLabel } = params;

  return getDb().transaction(async (tx) => {
    const now = nowIso();
    const userRow = await findUserByActivationKey(tx, activationKey);
    if (!userRow) {
      throw new Error("INVALID_ACTIVATION_KEY");
    }
    if (userRow.status !== "active") {
      throw new Error("USER_NOT_ACTIVE");
    }
    await assertSiteAccessAllowed(userRow.role, tx);

    const normalizedLabel = deviceLabel.trim() || "Ren'Py Device";
    const activeDeviceRows = await getActiveDevicesForUser(tx, userRow.id);
    const existingSameLabel = activeDeviceRows.find(
      (deviceRow) =>
        deviceRow.label.trim().toLowerCase() === normalizedLabel.toLowerCase(),
    );

    if (!existingSameLabel && activeDeviceRows.length >= MAX_ACTIVE_DEVICES) {
      throw new Error("DEVICE_LIMIT_REACHED");
    }

    if (existingSameLabel) {
      await tx
        .update(devices)
        .set({
          status: "revoked",
          lastSeenAt: toDate(now) ?? new Date(),
        })
        .where(eq(devices.id, existingSameLabel.id));
    }

    const rawToken = makeDeviceToken();
    await tx.insert(devices).values({
      userId: userRow.id,
      label: normalizedLabel,
      tokenHash: sha256(rawToken),
      rawTokenPreview: rawToken.slice(0, 8),
      linkedAt: toDate(now) ?? new Date(),
      lastSeenAt: toDate(now) ?? new Date(),
      status: "active",
    });

    await logActivity(tx, {
      userId: userRow.id,
      type: "sync",
      action: existingSameLabel
        ? "Устройство переактивировано"
        : "Устройство активировано",
      detail: normalizedLabel,
      level: "success",
    });

    return buildLinkedDevicePayload(tx, userRow.id, rawToken);
  });
}

export async function getDeviceBootstrap(deviceToken: string) {
  return getDb().transaction(async (tx) => {
    const { deviceRow, userRow } = await getActiveDeviceContext(tx, deviceToken);
    const adminSettings = await getAdminSettingsRecord(tx);
    const usageRow = await getUsageRecord(tx, userRow.id);

    return {
      device: {
        id: deviceRow.id,
        label: deviceRow.label,
        status: deviceRow.status,
        lastSeenAt: toIsoString(deviceRow.lastSeenAt) ?? "",
      },
      user: omitPassword(userRow),
      settings: await findSettings(tx, userRow.id),
        plan: userRow.plan,
        features: PLANS[userRow.plan].features,
        usage: {
          dayKey: usageRow.dayKey,
          count: usageRow.count,
          limit: getUserTranslationLimit(userRow, adminSettings),
        },
      };
  });
}

export async function translateForDevice(params: {
  deviceToken: string;
  text: string;
}) {
  const { deviceToken, text } = params;
  const normalizedText = normalizeStudyText(text);
  const translationUnits = countTranslationUnits(text);

  const cachedResponse = await getDb().transaction(async (tx) => {
    const { deviceRow, userRow } = await getActiveDeviceContext(tx, deviceToken);
    const adminSettings = await getAdminSettingsRecord(tx);
    const cacheRow = await findCachedTranslation(tx, normalizedText);
    if (!cacheRow || isStaleCachedTranslation(cacheRow.translatedText)) {
      if (cacheRow && isStaleCachedTranslation(cacheRow.translatedText)) {
        await tx.delete(translationCache).where(eq(translationCache.id, cacheRow.id));
      }
      return null;
    }

    const usageRow = await getUsageRecord(tx, userRow.id);
    const limit = getUserTranslationLimit(userRow, adminSettings);
    const now = nowIso();

    await touchDevice(tx, deviceRow.id, now);
    await logActivity(tx, {
      userId: userRow.id,
      type: "translation",
      action: buildTranslationLogAction(true, false),
      detail: buildTranslationLogDetail({
        text,
        translation: cacheRow.translatedText,
        provider: "cache",
        cached: true,
        degraded: false,
        degradeReason: null,
        requestedUnits: translationUnits,
        consumedUnits: 0,
      }),
    });

    return buildTranslationResponse({
      text,
      translation: cacheRow.translatedText,
      cached: true,
      provider: "cache",
      degraded: false,
      degradeReason: null,
      attempts: 0,
      usage: usageRow,
      limit,
      requestedUnits: translationUnits,
      consumedUnits: 0,
    });
  });

  if (cachedResponse) {
    return cachedResponse;
  }

  if (translationProviderIsConfigured()) {
    await getDb().transaction(async (tx) => {
      const { userRow } = await getActiveDeviceContext(tx, deviceToken);
      await assertTranslationQuotaAvailable(
        tx,
        userRow,
        translationUnits,
      );
    });
  }

  const translationResult = await translateText(text);

  return getDb().transaction(async (tx) => {
    const { deviceRow, userRow } = await getActiveDeviceContext(tx, deviceToken);
    const adminSettings = await getAdminSettingsRecord(tx);
    const limit = getUserTranslationLimit(userRow, adminSettings);
    const cacheRow = await findCachedTranslation(tx, normalizedText);

    if (cacheRow && !isStaleCachedTranslation(cacheRow.translatedText)) {
      const usageRow = await getUsageRecord(tx, userRow.id);
      const now = nowIso();

      await touchDevice(tx, deviceRow.id, now);
      await logActivity(tx, {
        userId: userRow.id,
        type: "translation",
        action: buildTranslationLogAction(true, false),
        detail: buildTranslationLogDetail({
          text,
          translation: cacheRow.translatedText,
          provider: "cache",
          cached: true,
          degraded: false,
          degradeReason: null,
          requestedUnits: translationUnits,
          consumedUnits: 0,
        }),
      });

      return buildTranslationResponse({
        text,
        translation: cacheRow.translatedText,
        cached: true,
        provider: "cache",
        degraded: false,
        degradeReason: null,
        attempts: 0,
        usage: usageRow,
        limit,
        requestedUnits: translationUnits,
        consumedUnits: 0,
      });
    }

    if (cacheRow && isStaleCachedTranslation(cacheRow.translatedText)) {
      await tx.delete(translationCache).where(eq(translationCache.id, cacheRow.id));
    }

    const usageRow = translationResult.consumesQuota
      ? await incrementUsageOrThrow(tx, userRow, translationUnits)
      : await getUsageRecord(tx, userRow.id);

    const now = nowIso();

    if (translationResult.cacheable) {
      await tx
        .insert(translationCache)
        .values({
          text: normalizedText,
          targetLanguage: "ru",
          translatedText: translationResult.translatedText,
          createdAt: toDate(now) ?? new Date(),
        })
        .onConflictDoUpdate({
          target: [translationCache.text, translationCache.targetLanguage],
          set: {
            translatedText: translationResult.translatedText,
            createdAt: toDate(now) ?? new Date(),
          },
        });
    }

    await touchDevice(tx, deviceRow.id, now);
    await logActivity(tx, {
      userId: userRow.id,
      type: "translation",
      action: buildTranslationLogAction(false, translationResult.degraded),
      detail: buildTranslationLogDetail({
        text,
        translation: translationResult.translatedText,
        provider: translationResult.provider,
        cached: false,
        degraded: translationResult.degraded,
        degradeReason: translationResult.degradeReason,
        requestedUnits: translationUnits,
        consumedUnits: translationResult.consumesQuota ? translationUnits : 0,
      }),
      level: translationResult.degraded ? "warning" : "info",
    });

    return buildTranslationResponse({
      text,
      translation: translationResult.translatedText,
      cached: false,
      provider: translationResult.provider,
      degraded: translationResult.degraded,
      degradeReason: translationResult.degradeReason,
      attempts: translationResult.attempts,
      usage: usageRow,
      limit,
      requestedUnits: translationUnits,
      consumedUnits: translationResult.consumesQuota ? translationUnits : 0,
    });
  });
}

export async function saveDeviceStudyItem(params: {
  deviceToken: string;
  kind: StudyKind;
  text: string;
  translation: string;
  note?: string;
  contextOriginal?: string;
  contextTranslation?: string;
  contextWordPosition?: number | null;
  novelTitle?: string;
}) {
  const {
    deviceToken,
    kind,
    text,
    translation,
    note = "",
    contextOriginal = "",
    contextTranslation = "",
    contextWordPosition = null,
    novelTitle = "Неизвестная новелла",
  } = params;

  return getDb().transaction(async (tx) => {
    const { deviceRow, userRow } = await getActiveDeviceContext(tx, deviceToken);
    const adminSettings = await getAdminSettingsRecord(tx);
    const dictionaryLimit = getUserDictionaryLimit(userRow, adminSettings);
    const normalizedText =
      kind === "word" ? normalizeWord(text) : normalizeStudyText(text);
    const now = nowIso();

    const existingRows = await tx
      .select()
      .from(studyItems)
      .where(
        and(
          eq(studyItems.userId, userRow.id),
          eq(studyItems.kind, kind),
          eq(studyItems.normalizedText, normalizedText),
        ),
      )
      .limit(1);

    let itemRow = existingRows[0] ?? null;
    if (!itemRow) {
      if (dictionaryLimit !== null) {
        const existingDictionaryRows = await tx
          .select({ id: studyItems.id })
          .from(studyItems)
          .where(eq(studyItems.userId, userRow.id));

        if (existingDictionaryRows.length >= dictionaryLimit) {
          throw new Error("DICTIONARY_LIMIT_REACHED");
        }
      }

      const inserted = await tx
        .insert(studyItems)
        .values({
          userId: userRow.id,
          kind,
          text: text.trim(),
          normalizedText,
          translation: translation.trim(),
          note: note.trim(),
          status: "new",
          isActive: false,
          learningStage: 0,
          activatedAt: null,
          lastAnswerAt: null,
          correctStreak: 0,
          wrongCount: 0,
          repetitions: 0,
          totalViews: 1,
          nextReviewAt: toDate(addHours(now, 1)) ?? new Date(),
          createdAt: toDate(now) ?? new Date(),
          updatedAt: toDate(now) ?? new Date(),
          lastSeenAt: toDate(now) ?? new Date(),
        })
        .returning();

      itemRow = inserted[0] ?? null;
    } else {
      const updated = await tx
        .update(studyItems)
        .set({
          translation: translation.trim() || itemRow.translation,
          note: note.trim() || itemRow.note,
          updatedAt: toDate(now) ?? new Date(),
          lastSeenAt: toDate(now) ?? new Date(),
          totalViews: itemRow.totalViews + 1,
        })
        .where(eq(studyItems.id, itemRow.id))
        .returning();

      itemRow = updated[0] ?? itemRow;
    }

    if (!itemRow) {
      throw new Error("ITEM_SAVE_FAILED");
    }

    await tx.insert(studyItemOccurrences).values({
      studyItemId: itemRow.id,
      userId: userRow.id,
      novelTitle,
      contextOriginal,
      contextTranslation,
      contextWordPosition,
      source: "mod",
      createdAt: toDate(now) ?? new Date(),
    });

    await touchDevice(tx, deviceRow.id, now);
    await logActivity(tx, {
      userId: userRow.id,
      type: kind === "word" ? "word" : "phrase",
      action: kind === "word" ? "Сохранено слово" : "Сохранена фраза",
      detail: text.trim(),
      level: "success",
    });

    return {
      itemId: itemRow.id,
      queued: false,
    };
  });
}
