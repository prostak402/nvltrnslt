import type {
  ReviewRating,
  ReviewTaskType,
  StudyItemRecord,
  StudyStatus,
  UserSettingsRecord,
} from "@/lib/types";
import { buildClozeData } from "@/lib/learning/cloze";
import { addDays } from "@/lib/server/utils";

const INITIAL_STAGE = 0;
const FINAL_REVIEW_STAGE = 3;
const LEARNED_STAGE = 4;
const DEFAULT_DAILY_NEW_WORDS = 10;

const STRONG_TASK_TYPES = new Set<ReviewTaskType>(["ru_en_choice", "cloze_choice"]);

export interface LearningQueueCandidate extends StudyItemRecord {
  hasContext: boolean;
}

export interface LearningQueueResult {
  queueItems: LearningQueueCandidate[];
  itemsToActivate: LearningQueueCandidate[];
  dueCount: number;
  hardDueCount: number;
  newCount: number;
}

export interface LearningReviewResult {
  status: StudyStatus;
  isActive: boolean;
  learningStage: number;
  activatedAt: string | null;
  lastAnswerAt: string;
  correctStreak: number;
  wrongCount: number;
  repetitions: number;
  nextReviewAt: string;
}

function isSameDay(leftIso: string | null, right: Date) {
  if (!leftIso) {
    return false;
  }

  const left = new Date(leftIso);
  if (Number.isNaN(left.getTime())) {
    return false;
  }

  return left.toISOString().slice(0, 10) === right.toISOString().slice(0, 10);
}

function isDue(item: LearningQueueCandidate, now: Date) {
  if (!item.isActive || item.status === "learned") {
    return false;
  }

  return new Date(item.nextReviewAt).getTime() <= now.getTime();
}

function nextStageDueAt(stage: number, nowIso: string) {
  if (stage <= 0) {
    return addDays(nowIso, 1);
  }

  if (stage === 1) {
    return addDays(nowIso, 2);
  }

  return addDays(nowIso, 4);
}

function sortDueItems(
  left: LearningQueueCandidate,
  right: LearningQueueCandidate,
  prioritizeDifficult: boolean,
) {
  if (prioritizeDifficult && left.status !== right.status) {
    if (left.status === "hard") return -1;
    if (right.status === "hard") return 1;
  }

  const byDue = new Date(left.nextReviewAt).getTime() - new Date(right.nextReviewAt).getTime();
  if (byDue !== 0) {
    return byDue;
  }

  return right.updatedAt.localeCompare(left.updatedAt);
}

function sortInactiveCandidates(left: LearningQueueCandidate, right: LearningQueueCandidate) {
  if (left.hasContext !== right.hasContext) {
    return left.hasContext ? -1 : 1;
  }

  return right.createdAt.localeCompare(left.createdAt);
}

export function canBuildCloze(
  text: string,
  context: string,
  contextWordPosition?: number | null,
) {
  return buildClozeData({
    context,
    answer: text,
    contextWordPosition,
  }).hasCloze;
}

export function buildLearningQueue(
  items: LearningQueueCandidate[],
  settings: Pick<UserSettingsRecord, "dailyWords" | "dailyNewWords" | "prioritizeDifficult" | "includePhrases">,
  nowInput = new Date(),
): LearningQueueResult {
  const now = nowInput instanceof Date ? nowInput : new Date(nowInput);
  const dueItems = items
    .filter((item) => (settings.includePhrases ? true : item.kind !== "phrase"))
    .filter((item) => isDue(item, now))
    .sort((left, right) => sortDueItems(left, right, settings.prioritizeDifficult));

  const activatedTodayCount = items.filter((item) => isSameDay(item.activatedAt, now)).length;
  const remainingNewSlots = Math.max(
    (settings.dailyNewWords ?? DEFAULT_DAILY_NEW_WORDS) - activatedTodayCount,
    0,
  );
  const targetQueueSize = Math.max(settings.dailyWords, dueItems.length);

  const inactiveNewItems = items
    .filter((item) => item.status === "new" && !item.isActive)
    .filter((item) => (settings.includePhrases ? true : item.kind !== "phrase"))
    .sort(sortInactiveCandidates);

  const itemsToActivate = inactiveNewItems.slice(
    0,
    Math.max(Math.min(targetQueueSize - dueItems.length, remainingNewSlots), 0),
  );

  return {
    queueItems: [...dueItems, ...itemsToActivate],
    itemsToActivate,
    dueCount: dueItems.length,
    hardDueCount: dueItems.filter((item) => item.status === "hard").length,
    newCount: itemsToActivate.length,
  };
}

export function activateLearningItem(
  item: StudyItemRecord,
  nowInput = new Date(),
): Pick<
  StudyItemRecord,
  "isActive" | "learningStage" | "activatedAt" | "lastAnswerAt" | "correctStreak" | "wrongCount" | "nextReviewAt"
> {
  const nowIso = (nowInput instanceof Date ? nowInput : new Date(nowInput)).toISOString();

  return {
    isActive: true,
    learningStage: INITIAL_STAGE,
    activatedAt: item.activatedAt ?? nowIso,
    lastAnswerAt: item.lastAnswerAt,
    correctStreak: 0,
    wrongCount: item.wrongCount,
    nextReviewAt: nowIso,
  };
}

function getSuccessfulReviewState(
  item: StudyItemRecord,
  taskType: ReviewTaskType,
  nowIso: string,
): LearningReviewResult {
  const nextRepetitions = item.repetitions + 1;
  const nextCorrectStreak = item.correctStreak + 1;
  const currentStage = item.learningStage;
  const activatedAt = item.activatedAt ?? nowIso;

  if (
    currentStage >= FINAL_REVIEW_STAGE &&
    STRONG_TASK_TYPES.has(taskType) &&
    new Date(activatedAt).getTime() <= new Date(addDays(nowIso, -7)).getTime()
  ) {
    return {
      status: "learned",
      isActive: false,
      learningStage: LEARNED_STAGE,
      activatedAt,
      lastAnswerAt: nowIso,
      correctStreak: nextCorrectStreak,
      wrongCount: item.wrongCount,
      repetitions: nextRepetitions,
      nextReviewAt: addDays(nowIso, 30),
    };
  }

  if (taskType === "pairs") {
    const nextStage = Math.min(currentStage + 1, 2);
    return {
      status: item.status === "hard" ? "new" : item.status,
      isActive: true,
      learningStage: nextStage,
      activatedAt,
      lastAnswerAt: nowIso,
      correctStreak: nextCorrectStreak,
      wrongCount: item.wrongCount,
      repetitions: nextRepetitions,
      nextReviewAt: nextStageDueAt(nextStage, nowIso),
    };
  }

  const nextStage = Math.min(currentStage + 1, FINAL_REVIEW_STAGE);
  return {
    status: item.status === "hard" ? "new" : item.status,
    isActive: true,
    learningStage: nextStage,
    activatedAt,
    lastAnswerAt: nowIso,
    correctStreak: nextCorrectStreak,
    wrongCount: item.wrongCount,
    repetitions: nextRepetitions,
    nextReviewAt: currentStage >= FINAL_REVIEW_STAGE ? addDays(nowIso, 1) : nextStageDueAt(nextStage, nowIso),
  };
}

export function applyLearningReview(params: {
  item: StudyItemRecord;
  rating: ReviewRating;
  taskType: ReviewTaskType;
  now?: Date;
}): LearningReviewResult {
  const { item, rating, taskType, now = new Date() } = params;
  const nowIso = now.toISOString();

  if (rating === "know") {
    return getSuccessfulReviewState(item, taskType, nowIso);
  }

  if (rating === "hard") {
    return {
      status: "hard",
      isActive: true,
      learningStage: item.learningStage,
      activatedAt: item.activatedAt ?? nowIso,
      lastAnswerAt: nowIso,
      correctStreak: 0,
      wrongCount: item.wrongCount + 1,
      repetitions: item.repetitions + 1,
      nextReviewAt: addDays(nowIso, 1),
    };
  }

  return {
    status: "hard",
    isActive: true,
    learningStage: Math.max(item.learningStage - 1, INITIAL_STAGE),
    activatedAt: item.activatedAt ?? nowIso,
    lastAnswerAt: nowIso,
    correctStreak: 0,
    wrongCount: item.wrongCount + 1,
    repetitions: item.repetitions + 1,
    nextReviewAt: addDays(nowIso, 1),
  };
}
