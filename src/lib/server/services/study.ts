import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { REVIEW_INTERVALS } from "@/lib/config";
import type {
  DashboardHistoryResponse,
  DashboardOverviewResponse,
  DashboardProgressResponse,
  DashboardSettingsResponse,
} from "@/lib/contracts/dashboard";
import { getDb } from "@/lib/db/client";
import {
  activityEvents,
  reviewEvents,
  studyItemOccurrences,
  studyItems,
  translationUsageDaily,
  userSettings,
} from "@/lib/db/schema";
import type {
  ReviewEventRecord,
  ReviewRating,
  StudyItemOccurrenceRecord,
  StudyItemRecord,
  StudyStatus,
  UserSettingsRecord,
} from "@/lib/types";
import {
  addDays,
  addHours,
  average,
  formatDateRu,
  formatDateTimeRu,
  formatRelativeDateRu,
  nowIso,
  startOfDayKey,
} from "@/lib/server/utils";

import {
  findSettings,
  findUserById,
  getPlanLimit,
  logActivity,
  omitPassword,
  toIsoString,
} from "./shared";
import { getAdminSettingsRecord } from "./site-settings";

const DEFAULT_LEARNING_SETTINGS: UserSettingsRecord = {
  userId: 0,
  dailyWords: 20,
  prioritizeDifficult: true,
  includePhrases: true,
  autoSync: true,
  poorConnection: "queue",
  reminderEnabled: true,
  emailNotifications: true,
};

function mapStudyItemRow(row: typeof studyItems.$inferSelect): StudyItemRecord {
  return {
    id: row.id,
    userId: row.userId,
    kind: row.kind as StudyItemRecord["kind"],
    text: row.text,
    normalizedText: row.normalizedText,
    translation: row.translation,
    note: row.note,
    status: row.status as StudyStatus,
    correctStreak: row.correctStreak,
    repetitions: row.repetitions,
    totalViews: row.totalViews,
    nextReviewAt: toIsoString(row.nextReviewAt) ?? "",
    createdAt: toIsoString(row.createdAt) ?? "",
    updatedAt: toIsoString(row.updatedAt) ?? "",
    lastSeenAt: toIsoString(row.lastSeenAt) ?? "",
  };
}

function mapOccurrenceRow(row: typeof studyItemOccurrences.$inferSelect): StudyItemOccurrenceRecord {
  return {
    id: row.id,
    studyItemId: row.studyItemId,
    userId: row.userId,
    novelTitle: row.novelTitle,
    contextOriginal: row.contextOriginal,
    contextTranslation: row.contextTranslation,
    source: row.source as StudyItemOccurrenceRecord["source"],
    createdAt: toIsoString(row.createdAt) ?? "",
  };
}

function mapReviewRow(row: typeof reviewEvents.$inferSelect): ReviewEventRecord {
  return {
    id: row.id,
    userId: row.userId,
    studyItemId: row.studyItemId,
    rating: row.rating as ReviewRating,
    beforeStatus: row.beforeStatus as StudyStatus,
    afterStatus: row.afterStatus as StudyStatus,
    reviewedAt: toIsoString(row.reviewedAt) ?? "",
  };
}

function computeNextReview(
  status: StudyStatus,
  correctStreak: number,
  rating: ReviewRating,
  currentIso: string,
) {
  if (rating === "unknown") {
    return {
      nextReviewAt: addHours(currentIso, REVIEW_INTERVALS.unknownHours),
      status: "new" as const,
      correctStreak: 0,
    };
  }

  if (rating === "hard") {
    return {
      nextReviewAt: addDays(currentIso, REVIEW_INTERVALS.hardDays),
      status: "hard" as const,
      correctStreak: Math.max(correctStreak, 1),
    };
  }

  const nextStreak = correctStreak + 1;
  const dayIndex = Math.min(nextStreak - 1, REVIEW_INTERVALS.knowDays.length - 1);
  return {
    nextReviewAt: addDays(currentIso, REVIEW_INTERVALS.knowDays[dayIndex]),
    status: nextStreak >= REVIEW_INTERVALS.learnedThreshold ? ("learned" as const) : status,
    correctStreak: nextStreak,
  };
}

function latestOccurrenceMap(occurrences: StudyItemOccurrenceRecord[]) {
  const map = new Map<number, StudyItemOccurrenceRecord>();
  for (const occurrence of [...occurrences].sort((a, b) => b.createdAt.localeCompare(a.createdAt))) {
    if (!map.has(occurrence.studyItemId)) {
      map.set(occurrence.studyItemId, occurrence);
    }
  }
  return map;
}

function buildStudyItemMeta(
  item: StudyItemRecord,
  latestByItemId: Map<number, StudyItemOccurrenceRecord>,
) {
  const latestOccurrence = latestByItemId.get(item.id);

  return {
    id: item.id,
    word: item.text,
    phrase: item.text,
    translation: item.translation,
    context: latestOccurrence?.contextOriginal ?? "",
    contextTranslation: latestOccurrence?.contextTranslation ?? "",
    novel: latestOccurrence?.novelTitle ?? "Не указано",
    date: formatDateRu(item.createdAt),
    relativeDate: formatRelativeDateRu(item.createdAt),
    status: item.status,
    note: item.note,
    repetitions: item.repetitions,
    kind: item.kind,
    nextReviewAt: item.nextReviewAt,
  };
}

function groupOccurrencesByNovel(occurrences: StudyItemOccurrenceRecord[]) {
  const map = new Map<string, number>();
  for (const occurrence of occurrences) {
    map.set(occurrence.novelTitle, (map.get(occurrence.novelTitle) ?? 0) + 1);
  }
  return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
}

async function loadStudyData(userId: number) {
  const [itemRows, occurrenceRows, reviewRows] = await Promise.all([
    getDb().select().from(studyItems).where(eq(studyItems.userId, userId)),
    getDb().select().from(studyItemOccurrences).where(eq(studyItemOccurrences.userId, userId)),
    getDb().select().from(reviewEvents).where(eq(reviewEvents.userId, userId)),
  ]);

  return {
    items: itemRows.map(mapStudyItemRow),
    occurrences: occurrenceRows.map(mapOccurrenceRow),
    reviews: reviewRows.map(mapReviewRow),
  };
}

export async function getDashboardOverview(
  userId: number,
): Promise<DashboardOverviewResponse> {
  const [user, studyData, usage, adminSettings] = await Promise.all([
    findUserById(getDb(), userId),
    loadStudyData(userId),
    getDb()
      .select()
      .from(translationUsageDaily)
      .where(and(eq(translationUsageDaily.userId, userId), eq(translationUsageDaily.dayKey, startOfDayKey())))
      .limit(1)
      .then((rows) => rows[0] ?? null),
    getAdminSettingsRecord(getDb()),
  ]);

  if (!user) {
    throw new Error("USER_NOT_FOUND");
  }

  const { items, occurrences, reviews } = studyData;
  const words = items.filter((entry) => entry.kind === "word");
  const phrases = items.filter((entry) => entry.kind === "phrase");
  const latestByItemId = latestOccurrenceMap(occurrences);
  const todayKey = startOfDayKey();
  const dueItems = items.filter((entry) => entry.nextReviewAt <= nowIso()).length;

  const recentWords = words
    .slice()
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 5)
    .map((item) => buildStudyItemMeta(item, latestByItemId));
  const recentPhrases = phrases
    .slice()
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 3)
    .map((item) => buildStudyItemMeta(item, latestByItemId));

  const sevenDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const dayKey = startOfDayKey(date);
    return {
      day: new Intl.DateTimeFormat("ru-RU", { weekday: "short" }).format(date),
      saved: items.filter((entry) => entry.createdAt.slice(0, 10) === dayKey).length,
      reviewed: reviews.filter((entry) => entry.reviewedAt.slice(0, 10) === dayKey).length,
    };
  });

  return {
    user: omitPassword(user),
    recentWords,
    recentPhrases,
    weeklyActivity: sevenDays,
    summary: {
      wordsCount: words.length,
      phrasesCount: phrases.length,
      newCount: items.filter((entry) => entry.status === "new").length,
      learnedCount: items.filter((entry) => entry.status === "learned").length,
      hardCount: items.filter((entry) => entry.status === "hard").length,
      dueCount: dueItems,
      translationsToday: usage?.count ?? 0,
      translationsLimit: getPlanLimit(user.plan, adminSettings),
      savesToday: items.filter((entry) => entry.createdAt.slice(0, 10) === todayKey).length,
      reviewsToday: reviews.filter((entry) => entry.reviewedAt.slice(0, 10) === todayKey).length,
    },
  };
}

export async function getWordsPageData(userId: number) {
  const [itemRows, occurrenceRows] = await Promise.all([
    getDb()
      .select()
      .from(studyItems)
      .where(and(eq(studyItems.userId, userId), eq(studyItems.kind, "word"))),
    getDb().select().from(studyItemOccurrences).where(eq(studyItemOccurrences.userId, userId)),
  ]);

  const latestByItemId = latestOccurrenceMap(occurrenceRows.map(mapOccurrenceRow));
  const words = itemRows
    .map(mapStudyItemRow)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map((item) => buildStudyItemMeta(item, latestByItemId));

  return {
    words,
    novels: ["Все новеллы", ...new Set(words.map((word) => word.novel))],
  };
}

export async function getPhrasesPageData(userId: number) {
  const [itemRows, occurrenceRows] = await Promise.all([
    getDb()
      .select()
      .from(studyItems)
      .where(and(eq(studyItems.userId, userId), eq(studyItems.kind, "phrase"))),
    getDb().select().from(studyItemOccurrences).where(eq(studyItemOccurrences.userId, userId)),
  ]);

  const latestByItemId = latestOccurrenceMap(occurrenceRows.map(mapOccurrenceRow));
  const phrases = itemRows
    .map(mapStudyItemRow)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map((item) => buildStudyItemMeta(item, latestByItemId));

  return {
    phrases,
    novels: ["Все новеллы", ...new Set(phrases.map((phrase) => phrase.novel))],
  };
}

export async function updateStudyItem(
  userId: number,
  itemId: number,
  patch: Partial<{
    translation: string;
    note: string;
    status: StudyStatus;
  }>,
) {
  return getDb().transaction(async (tx) => {
    const [existingItem] = await tx
      .select()
      .from(studyItems)
      .where(and(eq(studyItems.id, itemId), eq(studyItems.userId, userId)))
      .limit(1);

    if (!existingItem) {
      throw new Error("ITEM_NOT_FOUND");
    }

    const [updatedItem] = await tx
      .update(studyItems)
      .set({
        translation: patch.translation !== undefined ? patch.translation.trim() : existingItem.translation,
        note: patch.note !== undefined ? patch.note.trim() : existingItem.note,
        status: patch.status !== undefined ? patch.status : existingItem.status,
        updatedAt: new Date(),
      })
      .where(eq(studyItems.id, itemId))
      .returning();

    await logActivity(tx, {
      userId,
      type: existingItem.kind === "word" ? "word" : "phrase",
      action: "Карточка обновлена",
      detail: existingItem.text,
    });

    return mapStudyItemRow(updatedItem);
  });
}

export async function deleteStudyItem(userId: number, itemId: number) {
  return getDb().transaction(async (tx) => {
    const [item] = await tx
      .select()
      .from(studyItems)
      .where(and(eq(studyItems.id, itemId), eq(studyItems.userId, userId)))
      .limit(1);

    if (!item) {
      throw new Error("ITEM_NOT_FOUND");
    }

    await tx.delete(reviewEvents).where(eq(reviewEvents.studyItemId, itemId));
    await tx.delete(studyItemOccurrences).where(eq(studyItemOccurrences.studyItemId, itemId));
    await tx.delete(studyItems).where(eq(studyItems.id, itemId));

    await logActivity(tx, {
      userId,
      type: item.kind === "word" ? "word" : "phrase",
      action: "Карточка удалена",
      detail: item.text,
      level: "warning",
    });
  });
}

export async function getLearningPageData(userId: number) {
  const [settings, itemRows, occurrenceRows] = await Promise.all([
    findSettings(getDb(), userId),
    getDb().select().from(studyItems).where(eq(studyItems.userId, userId)),
    getDb().select().from(studyItemOccurrences).where(eq(studyItemOccurrences.userId, userId)),
  ]);

  const resolvedSettings = settings
    ? settings
    : {
        ...DEFAULT_LEARNING_SETTINGS,
        userId,
      };
  const currentTime = nowIso();
  const allItems = itemRows
    .map(mapStudyItemRow)
    .sort((a, b) => a.nextReviewAt.localeCompare(b.nextReviewAt));
  const dueItems = allItems.filter((entry) => entry.nextReviewAt <= currentTime);
  const fallbackLimit = Math.max(resolvedSettings.dailyWords, 10);
  const items = dueItems.length
    ? dueItems
    : [...allItems]
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .slice(0, fallbackLimit);
  const latestByItemId = latestOccurrenceMap(occurrenceRows.map(mapOccurrenceRow));

  const cards = items.map((item) => {
    const latestOccurrence = latestByItemId.get(item.id);
    return {
      id: item.id,
      en: item.text,
      ru: item.translation,
      context: latestOccurrence?.contextOriginal ?? "",
      kind: item.kind,
      novel: latestOccurrence?.novelTitle ?? "Не указано",
      status: item.status,
    };
  });

  return {
    cards,
    categories: [
      { label: "Новые слова", count: items.filter((entry) => entry.kind === "word" && entry.status === "new").length },
      { label: "Сложные слова", count: items.filter((entry) => entry.kind === "word" && entry.status === "hard").length },
      { label: "Фразы", count: items.filter((entry) => entry.kind === "phrase").length },
      { label: "Случайная подборка", count: items.length },
    ],
    novels: ["Все новеллы", ...new Set(cards.map((card) => card.novel))],
    settings: resolvedSettings,
  };
}

export async function recordReview(userId: number, itemId: number, rating: ReviewRating) {
  return getDb().transaction(async (tx) => {
    const [item] = await tx
      .select()
      .from(studyItems)
      .where(and(eq(studyItems.id, itemId), eq(studyItems.userId, userId)))
      .limit(1);

    if (!item) {
      throw new Error("ITEM_NOT_FOUND");
    }

    const currentIso = nowIso();
    const update = computeNextReview(
      item.status as StudyStatus,
      item.correctStreak,
      rating,
      currentIso,
    );

    const [updatedItem] = await tx
      .update(studyItems)
      .set({
        status: update.status,
        correctStreak: update.correctStreak,
        repetitions: item.repetitions + 1,
        nextReviewAt: new Date(update.nextReviewAt),
        updatedAt: new Date(currentIso),
      })
      .where(eq(studyItems.id, itemId))
      .returning();

    await tx.insert(reviewEvents).values({
      userId,
      studyItemId: itemId,
      rating,
      beforeStatus: item.status,
      afterStatus: update.status,
      reviewedAt: new Date(currentIso),
    });

    await logActivity(tx, {
      userId,
      type: "review",
      action: "Повторение",
      detail: `${item.text} → ${rating}`,
      level: rating === "know" ? "success" : rating === "hard" ? "warning" : "info",
    });

    return mapStudyItemRow(updatedItem);
  });
}

export async function getProgressPageData(
  userId: number,
): Promise<DashboardProgressResponse> {
  const { items, occurrences, reviews } = await loadStudyData(userId);

  const weeklyData = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const dayKey = startOfDayKey(date);
    return {
      day: new Intl.DateTimeFormat("ru-RU", { weekday: "short" }).format(date),
      saved: items.filter((item) => item.createdAt.slice(0, 10) === dayKey).length,
      reviewed: reviews.filter((review) => review.reviewedAt.slice(0, 10) === dayKey).length,
    };
  });

  const novelStats = groupOccurrencesByNovel(occurrences).map((novel) => {
    const novelOccurrences = occurrences.filter((entry) => entry.novelTitle === novel.name);
    const ids = new Set(novelOccurrences.map((entry) => entry.studyItemId));
    const novelItems = items.filter((entry) => ids.has(entry.id));
    return {
      name: novel.name,
      words: novelItems.length,
      learned: novelItems.filter((entry) => entry.status === "learned").length,
      difficult: novelItems.filter((entry) => entry.status === "hard").length,
      newW: novelItems.filter((entry) => entry.status === "new").length,
    };
  });

  const dueItems = items.filter((entry) => entry.nextReviewAt <= nowIso()).length;
  const recentReviewScores = reviews
    .slice(0, 10)
    .map((review) => (review.rating === "know" ? 1 : review.rating === "hard" ? 0.6 : 0.2));

  return {
    weeklyData,
    novelStats,
    statusBreakdown: [
      { label: "Новые", count: items.filter((entry) => entry.status === "new").length, color: "bg-accent" },
      { label: "Сложные", count: items.filter((entry) => entry.status === "hard").length, color: "bg-warning" },
      { label: "Выученные", count: items.filter((entry) => entry.status === "learned").length, color: "bg-success" },
    ],
    totalWords: items.length,
    streak: Math.max(1, reviews.length ? 7 : 0),
    accuracy: Math.round(average(recentReviewScores) * 100),
    dueItems,
    weeklyAdded: weeklyData.reduce((sum, entry) => sum + entry.saved, 0),
    weeklyReviewed: weeklyData.reduce((sum, entry) => sum + entry.reviewed, 0),
  };
}

export async function getHistoryPageData(
  userId: number,
): Promise<DashboardHistoryResponse> {
  const rows = await getDb()
    .select()
    .from(activityEvents)
    .where(eq(activityEvents.userId, userId))
    .orderBy(desc(activityEvents.createdAt));

  const activities = rows.map((entry) => {
    const createdAt = toIsoString(entry.createdAt) ?? nowIso();
    const type: DashboardHistoryResponse["activities"][number]["type"] =
      entry.type === "translation" || entry.type === "word" || entry.type === "phrase"
        ? entry.type
        : "system";

    return {
      id: entry.id,
      type,
      description: entry.detail ? `${entry.action}: ${entry.detail}` : entry.action,
      timestamp: formatDateTimeRu(createdAt),
      date: formatRelativeDateRu(createdAt),
      level: entry.level as DashboardHistoryResponse["activities"][number]["level"],
    };
  });

  return { activities };
}

export async function getSettingsPageData(
  userId: number,
): Promise<DashboardSettingsResponse> {
  const [user, settings] = await Promise.all([
    findUserById(getDb(), userId),
    findSettings(getDb(), userId),
  ]);

  if (!user || !settings) {
    throw new Error("USER_NOT_FOUND");
  }

  return {
    email: user.email,
    ...settings,
  };
}

export async function saveSettings(
  userId: number,
  input: {
    dailyWords: number;
    prioritizeDifficult: boolean;
    includePhrases: boolean;
    autoSync: boolean;
    poorConnection: "queue" | "retry" | "skip";
    reminderEnabled: boolean;
    emailNotifications: boolean;
  },
): Promise<DashboardSettingsResponse> {
  return getDb().transaction(async (tx) => {
    const user = await findUserById(tx, userId);
    const [settings] = await tx
      .update(userSettings)
      .set({
        dailyWords: input.dailyWords,
        prioritizeDifficult: input.prioritizeDifficult,
        includePhrases: input.includePhrases,
        autoSync: input.autoSync,
        poorConnection: input.poorConnection,
        reminderEnabled: input.reminderEnabled,
        emailNotifications: input.emailNotifications,
      })
      .where(eq(userSettings.userId, userId))
      .returning();

    if (!user || !settings) {
      throw new Error("USER_NOT_FOUND");
    }

    await logActivity(tx, {
      userId,
      type: "system",
      action: "Настройки обновлены",
      detail: "Личные настройки сохранены",
    });

    return {
      email: user.email,
      dailyWords: settings.dailyWords,
      prioritizeDifficult: settings.prioritizeDifficult,
      includePhrases: settings.includePhrases,
      autoSync: settings.autoSync,
      poorConnection: settings.poorConnection as UserSettingsRecord["poorConnection"],
      reminderEnabled: settings.reminderEnabled,
      emailNotifications: settings.emailNotifications,
    };
  });
}
