import "server-only";

import { and, desc, eq } from "drizzle-orm";

import {
  activateLearningItem,
  applyLearningReview,
  buildRatedTaskState,
  buildLearningQueue,
  canBuildCloze,
  isMaintenanceReviewDue,
  isLearningItemDue,
  type RatedReviewEventLike,
} from "@/lib/server/learning-domain";
import { buildClozeData } from "@/lib/learning/cloze";
import type {
  DashboardLearningCard,
  DashboardLearningResponse,
  DashboardHistoryResponse,
  DashboardOverviewResponse,
  DashboardProgressResponse,
  DashboardShellSummary,
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
  ReviewSessionMode,
  ReviewTaskType,
  StudyItemOccurrenceRecord,
  StudyItemRecord,
  StudyStatus,
  UserSettingsRecord,
} from "@/lib/types";
import {
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
  getUserTranslationLimit,
  getUsageRecord,
  logActivity,
  omitPassword,
  toIsoString,
} from "./shared";
import { getAdminSettingsRecord } from "./site-settings";

const DEFAULT_LEARNING_SETTINGS: UserSettingsRecord = {
  userId: 0,
  dailyWords: 20,
  dailyNewWords: 10,
  prioritizeDifficult: true,
  includePhrases: true,
  autoSync: true,
  poorConnection: "queue",
  reminderEnabled: true,
  emailNotifications: true,
};

const MODE_ORDER: ReviewTaskType[] = [
  "pairs",
  "flashcards",
  "ru_en_choice",
  "cloze_choice",
];

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
    isActive: row.isActive,
    learningStage: row.learningStage,
    masteryScore: row.masteryScore,
    strongSuccessStreak: row.strongSuccessStreak,
    activatedAt: toIsoString(row.activatedAt),
    lastAnswerAt: toIsoString(row.lastAnswerAt),
    lastMasteredAt: toIsoString(row.lastMasteredAt),
    maintenanceStage: row.maintenanceStage,
    correctStreak: row.correctStreak,
    wrongCount: row.wrongCount,
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
    contextWordPosition: row.contextWordPosition,
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
    taskType: row.taskType as ReviewTaskType | null,
    sessionMode: row.sessionMode as ReviewSessionMode,
    beforeStatus: row.beforeStatus as StudyStatus,
    afterStatus: row.afterStatus as StudyStatus,
    reviewedAt: toIsoString(row.reviewedAt) ?? "",
  };
}

function buildLearningCard(
  item: StudyItemRecord,
  latestByItemId: Map<number, StudyItemOccurrenceRecord>,
  taskState?: ReturnType<typeof buildRatedTaskState>,
): DashboardLearningCard {
  const latestOccurrence = latestByItemId.get(item.id);
  const context = latestOccurrence?.contextOriginal ?? "";
  const contextWordPosition = latestOccurrence?.contextWordPosition ?? null;
  const cloze = buildClozeData({
    context,
    answer: item.text,
    contextWordPosition,
  });

  return {
    id: item.id,
    en: item.text,
    ru: item.translation,
    context,
    contextTranslation: latestOccurrence?.contextTranslation ?? "",
    contextWordPosition,
    kind: item.kind,
    novel: latestOccurrence?.novelTitle ?? "РќРµ СѓРєР°Р·Р°РЅРѕ",
    status: item.status,
    isActive: item.isActive,
    isDue: isLearningItemDue(item, new Date()) || isMaintenanceReviewDue(item, new Date()),
    isMaintenance: item.status === "learned" && isMaintenanceReviewDue(item, new Date()),
    completedToday: taskState?.completedToday ?? false,
    currentTaskType: taskState?.currentTaskType ?? null,
    completedTaskTypesToday: taskState?.completedTaskTypesToday ?? [],
    learningStage: item.learningStage,
    masteryScore: item.masteryScore,
    strongSuccessStreak: item.strongSuccessStreak,
    todayPoints: taskState?.todayPoints ?? 0,
    hasCloze: canBuildCloze(item.text, context, contextWordPosition),
    clozeText: cloze.clozeText,
    clozeAnswer: cloze.clozeAnswer,
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

function sortRatedSessionCards(left: DashboardLearningCard, right: DashboardLearningCard) {
  if (left.completedToday !== right.completedToday) {
    return left.completedToday ? 1 : -1;
  }

  const leftModeIndex = left.currentTaskType ? MODE_ORDER.indexOf(left.currentTaskType) : MODE_ORDER.length;
  const rightModeIndex = right.currentTaskType ? MODE_ORDER.indexOf(right.currentTaskType) : MODE_ORDER.length;
  if (leftModeIndex !== rightModeIndex) {
    return leftModeIndex - rightModeIndex;
  }

  if (left.isMaintenance !== right.isMaintenance) {
    return left.isMaintenance ? 1 : -1;
  }

  if (left.status !== right.status) {
    if (left.status === "hard") return -1;
    if (right.status === "hard") return 1;
  }

  if (left.kind !== right.kind) {
    if (left.kind === "word") return -1;
    if (right.kind === "word") return 1;
  }

  return left.en.localeCompare(right.en, "en");
}

function reviewsForToday(reviews: ReviewEventRecord[]) {
  const todayKey = startOfDayKey();
  return reviews.filter((review) => review.sessionMode === "rated" && review.reviewedAt.slice(0, 10) === todayKey);
}

function groupReviewsByItem(reviews: ReviewEventRecord[]) {
  const byItem = new Map<number, RatedReviewEventLike[]>();
  for (const review of reviews) {
    const existing = byItem.get(review.studyItemId) ?? [];
    existing.push({
      studyItemId: review.studyItemId,
      rating: review.rating,
      taskType: review.taskType,
      reviewedAt: review.reviewedAt,
    });
    byItem.set(review.studyItemId, existing);
  }

  for (const entry of byItem.values()) {
    entry.sort((left, right) => left.reviewedAt.localeCompare(right.reviewedAt));
  }

  return byItem;
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
    isActive: item.isActive,
    learningStage: item.learningStage,
    masteryScore: item.masteryScore,
    strongSuccessStreak: item.strongSuccessStreak,
    activatedAt: item.activatedAt,
    lastAnswerAt: item.lastAnswerAt,
    lastMasteredAt: item.lastMasteredAt,
    maintenanceStage: item.maintenanceStage,
    wrongCount: item.wrongCount,
    note: item.note,
    repetitions: item.repetitions,
    kind: item.kind,
    nextReviewAt: item.nextReviewAt,
    isDue:
      isLearningItemDue(item, new Date()) || isMaintenanceReviewDue(item, new Date()),
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

export async function getDashboardShellSummary(
  userId: number,
): Promise<DashboardShellSummary> {
  const [user, usage, adminSettings] = await Promise.all([
    findUserById(getDb(), userId),
    getUsageRecord(getDb(), userId),
    getAdminSettingsRecord(getDb()),
  ]);

  if (!user) {
    throw new Error("USER_NOT_FOUND");
  }

  return {
    translationsUsed: usage.count,
    translationsLimit: getUserTranslationLimit(user, adminSettings),
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
  const dueItems = items.filter(
    (entry) =>
      (entry.isActive || entry.status === "learned") &&
      (isLearningItemDue(entry, new Date()) || isMaintenanceReviewDue(entry, new Date())),
  ).length;

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
      translationsLimit: getUserTranslationLimit(user, adminSettings),
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
    isActive: boolean;
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

    if (patch.status === "learned") {
      throw new Error("STATUS_PATCH_NOT_ALLOWED");
    }

    const mappedItem = mapStudyItemRow(existingItem);
    const shouldActivate = patch.isActive === true && !existingItem.isActive && existingItem.status !== "learned";
    const activationPatch = shouldActivate ? activateLearningItem(mappedItem, new Date()) : null;
    const nextStatus =
      patch.status !== undefined
        ? patch.status
        : patch.isActive === true && existingItem.status === "hard"
          ? existingItem.status
          : existingItem.status;
    const statusForUpdate = nextStatus === "hard" ? "hard" : existingItem.status;
    const nextIsActive =
      patch.status === "hard"
        ? true
        : patch.isActive !== undefined
          ? patch.isActive && existingItem.status !== "learned"
          : activationPatch?.isActive ?? existingItem.isActive;
    const nextReviewAt =
      patch.status === "hard"
        ? new Date()
        : activationPatch?.nextReviewAt
          ? new Date(activationPatch.nextReviewAt)
          : existingItem.nextReviewAt;
    const nextActivatedAt =
      activationPatch?.activatedAt !== undefined
        ? (activationPatch.activatedAt ? new Date(activationPatch.activatedAt) : null)
        : existingItem.activatedAt;
    const nextLearningStage =
      patch.status === "hard"
        ? Math.max(existingItem.learningStage, 0)
        : activationPatch?.learningStage ?? existingItem.learningStage;

    const [updatedItem] = await tx
      .update(studyItems)
      .set({
        translation: patch.translation !== undefined ? patch.translation.trim() : existingItem.translation,
        note: patch.note !== undefined ? patch.note.trim() : existingItem.note,
        status: statusForUpdate,
        isActive: nextIsActive,
        learningStage: nextLearningStage,
        masteryScore:
          patch.status === "hard"
            ? Math.min(existingItem.masteryScore, 60)
            : activationPatch?.masteryScore ?? existingItem.masteryScore,
        strongSuccessStreak:
          patch.status === "hard"
            ? 0
            : activationPatch?.strongSuccessStreak ?? existingItem.strongSuccessStreak,
        activatedAt: nextActivatedAt,
        lastAnswerAt:
          activationPatch?.lastAnswerAt !== undefined
            ? (activationPatch.lastAnswerAt ? new Date(activationPatch.lastAnswerAt) : null)
            : existingItem.lastAnswerAt,
        lastMasteredAt: existingItem.lastMasteredAt,
        maintenanceStage:
          patch.status === "hard"
            ? 0
            : activationPatch?.maintenanceStage ?? existingItem.maintenanceStage,
        nextReviewAt,
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
  return getDb().transaction(async (tx) => {
    const [settings, itemRows, occurrenceRows, reviewRows] = await Promise.all([
      findSettings(tx, userId),
      tx.select().from(studyItems).where(eq(studyItems.userId, userId)),
      tx.select().from(studyItemOccurrences).where(eq(studyItemOccurrences.userId, userId)),
      tx.select().from(reviewEvents).where(eq(reviewEvents.userId, userId)),
    ]);

    const resolvedSettings = settings
      ? settings
      : {
          ...DEFAULT_LEARNING_SETTINGS,
          userId,
        };
    const latestByItemId = latestOccurrenceMap(occurrenceRows.map(mapOccurrenceRow));
    const allItems = itemRows
      .map(mapStudyItemRow)
      .map((item) => ({
        ...item,
        hasContext: Boolean((latestByItemId.get(item.id)?.contextOriginal ?? "").trim()),
      }))
      .sort((a, b) => a.nextReviewAt.localeCompare(b.nextReviewAt));
    const queue = buildLearningQueue(allItems, resolvedSettings, new Date());
    const activationNow = new Date();
    const activatedPatches = new Map<number, ReturnType<typeof activateLearningItem>>();

    for (const item of queue.itemsToActivate) {
      const activation = activateLearningItem(item, activationNow);
      activatedPatches.set(item.id, activation);

      await tx
        .update(studyItems)
        .set({
          isActive: activation.isActive,
          learningStage: activation.learningStage,
          masteryScore: activation.masteryScore,
          strongSuccessStreak: activation.strongSuccessStreak,
          activatedAt: activation.activatedAt ? new Date(activation.activatedAt) : null,
          lastAnswerAt: activation.lastAnswerAt ? new Date(activation.lastAnswerAt) : null,
          lastMasteredAt: activation.lastMasteredAt ? new Date(activation.lastMasteredAt) : null,
          maintenanceStage: activation.maintenanceStage,
          correctStreak: activation.correctStreak,
          wrongCount: activation.wrongCount,
          nextReviewAt: new Date(activation.nextReviewAt),
          updatedAt: activationNow,
        })
        .where(eq(studyItems.id, item.id));
    }

    const updatedItems = allItems.map((item) => {
      const patch = activatedPatches.get(item.id);
      return patch ? { ...item, ...patch } : item;
    });
    const updatedItemsById = new Map(updatedItems.map((item) => [item.id, item]));
    const todayRatedReviews = reviewsForToday(reviewRows.map(mapReviewRow));
    const reviewsByItem = groupReviewsByItem(todayRatedReviews);
    const sessionItemIds = new Set<number>([
      ...queue.queueItems.map((item) => item.id),
      ...todayRatedReviews.map((review) => review.studyItemId),
    ]);
    const queueWords = Array.from(sessionItemIds)
      .map((itemId) => updatedItemsById.get(itemId))
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .map((item) =>
        buildLearningCard(
          item,
          latestByItemId,
          buildRatedTaskState({
            item,
            eventsToday: reviewsByItem.get(item.id) ?? [],
            hasContext: item.hasContext,
            now: activationNow,
          }),
        ),
      )
      .sort(sortRatedSessionCards);
    const practicePool = updatedItems
      .slice()
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map((item) => buildLearningCard(item, latestByItemId));
    const availableByMode = {
      pairs: queueWords.filter((card) => !card.completedToday && card.currentTaskType === "pairs").length,
      flashcards: queueWords.filter((card) => !card.completedToday && card.currentTaskType === "flashcards").length,
      ru_en_choice: queueWords.filter((card) => !card.completedToday && card.currentTaskType === "ru_en_choice").length,
      cloze_choice: queueWords.filter((card) => !card.completedToday && card.currentTaskType === "cloze_choice").length,
    };
    const completedWords = queueWords.filter((card) => card.completedToday).length;
    const sessionPoints = queueWords.reduce((sum, card) => sum + card.todayPoints, 0);

    const response: DashboardLearningResponse & {
      cards: DashboardLearningCard[];
      summary: {
        dueCount: number;
        hardDueCount: number;
        newCount: number;
        totalCount: number;
        maintenanceCount: number;
        sessionPoints: number;
        completedWords: number;
        remainingWords: number;
      };
      categories: Array<{ label: string; count: number }>;
    } = {
      ratedSession: {
        queueWords,
        availableByMode,
        sessionPoints,
        completedWords,
        remainingWords: Math.max(queueWords.length - completedWords, 0),
        totalWords: queueWords.length,
        newCount: queueWords.filter((card) => !card.isMaintenance && card.status === "new").length,
        hardCount: queueWords.filter((card) => card.status === "hard").length,
        maintenanceCount: queueWords.filter((card) => card.isMaintenance).length,
      },
      practicePool,
      novels: ["Все новеллы", ...new Set(practicePool.map((card) => card.novel))],
      settings: resolvedSettings,
      cards: queueWords,
      summary: {
        dueCount: queue.dueCount,
        hardDueCount: queue.hardDueCount,
        newCount: queue.newCount,
        totalCount: queueWords.length,
        maintenanceCount: queue.maintenanceCount,
        sessionPoints,
        completedWords,
        remainingWords: Math.max(queueWords.length - completedWords, 0),
      },
      categories: [
        {
          label: "Новые слова",
          count: queueWords.filter((entry) => entry.kind === "word" && !entry.isMaintenance && entry.status === "new").length,
        },
        {
          label: "Сложные слова",
          count: queueWords.filter((entry) => entry.kind === "word" && entry.status === "hard").length,
        },
        {
          label: "Фразы",
          count: queueWords.filter((entry) => entry.kind === "phrase").length,
        },
        {
          label: "Случайная подборка",
          count: queueWords.length,
        },
      ],
    };

    return response;
  });
}
export async function recordReview(
  userId: number,
  itemId: number,
  rating: ReviewRating,
  taskType: ReviewTaskType,
  sessionMode: ReviewSessionMode,
) {
  return getDb().transaction(async (tx) => {
    const [item] = await tx
      .select()
      .from(studyItems)
      .where(and(eq(studyItems.id, itemId), eq(studyItems.userId, userId)))
      .limit(1);

    if (!item) {
      throw new Error("ITEM_NOT_FOUND");
    }

    if (sessionMode === "practice") {
      return {
        ...mapStudyItemRow(item),
        sessionMode,
        sessionPoints: 0,
      };
    }

    const currentIso = nowIso();
    const [latestOccurrence, priorReviewRows] = await Promise.all([
      tx
        .select()
        .from(studyItemOccurrences)
        .where(and(eq(studyItemOccurrences.studyItemId, itemId), eq(studyItemOccurrences.userId, userId)))
        .orderBy(desc(studyItemOccurrences.createdAt))
        .limit(1)
        .then((rows) => rows[0] ?? null),
      tx
        .select()
        .from(reviewEvents)
        .where(and(eq(reviewEvents.userId, userId), eq(reviewEvents.studyItemId, itemId)))
        .orderBy(desc(reviewEvents.reviewedAt)),
    ]);
    const priorRatedEventsToday = reviewsForToday(priorReviewRows.map(mapReviewRow)).map((review) => ({
      studyItemId: review.studyItemId,
      rating: review.rating,
      taskType: review.taskType,
      reviewedAt: review.reviewedAt,
    }));
    const update = applyLearningReview({
      item: mapStudyItemRow(item),
      rating,
      taskType,
      priorRatedEventsToday,
      hasContext: Boolean((latestOccurrence?.contextOriginal ?? "").trim()),
      now: new Date(currentIso),
    });

    const [updatedItem] = await tx
      .update(studyItems)
      .set({
        status: update.status,
        isActive: update.isActive,
        learningStage: update.learningStage,
        masteryScore: update.masteryScore,
        strongSuccessStreak: update.strongSuccessStreak,
        activatedAt: update.activatedAt ? new Date(update.activatedAt) : null,
        lastAnswerAt: new Date(update.lastAnswerAt),
        lastMasteredAt: update.lastMasteredAt ? new Date(update.lastMasteredAt) : null,
        maintenanceStage: update.maintenanceStage,
        correctStreak: update.correctStreak,
        wrongCount: update.wrongCount,
        repetitions: update.repetitions,
        nextReviewAt: new Date(update.nextReviewAt),
        updatedAt: new Date(currentIso),
      })
      .where(eq(studyItems.id, itemId))
      .returning();

    await tx.insert(reviewEvents).values({
      userId,
      studyItemId: itemId,
      rating,
      taskType,
      sessionMode,
      beforeStatus: item.status,
      afterStatus: update.status,
      reviewedAt: new Date(currentIso),
    });

    await logActivity(tx, {
      userId,
      type: "review",
      action: "Рейтинг-повторение",
      detail: item.text + " -> " + rating + " (" + taskType + ")",
      level: rating === "know" ? "success" : rating === "hard" ? "warning" : "info",
    });

    return {
      ...mapStudyItemRow(updatedItem),
      sessionMode,
      sessionPoints: update.sessionPoints,
    };
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

  const dueItems = items.filter(
    (entry) => isLearningItemDue(entry, new Date()) || isMaintenanceReviewDue(entry, new Date()),
  ).length;
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
    dailyNewWords: number;
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
        dailyNewWords: input.dailyNewWords,
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
      dailyNewWords: settings.dailyNewWords,
      prioritizeDifficult: settings.prioritizeDifficult,
      includePhrases: settings.includePhrases,
      autoSync: settings.autoSync,
      poorConnection: settings.poorConnection as UserSettingsRecord["poorConnection"],
      reminderEnabled: settings.reminderEnabled,
      emailNotifications: settings.emailNotifications,
    };
  });
}


