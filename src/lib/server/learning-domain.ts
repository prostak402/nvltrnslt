import { LEARNING_DEFAULTS } from "@/lib/config";
import { buildClozeData } from "@/lib/learning/cloze";
import type {
  ReviewRating,
  ReviewTaskType,
  StudyItemRecord,
  StudyStatus,
  UserSettingsRecord,
} from "@/lib/types";
import { addDays, hasReachedReviewDay, startOfDayKey } from "@/lib/server/utils";

const INITIAL_STAGE = 0;
const FINAL_REVIEW_STAGE = 3;
const LEARNED_STAGE = 4;
const DEFAULT_DAILY_NEW_WORDS = 10;

const STAGE_MASTERY_THRESHOLDS = {
  0: 25,
  1: 50,
  2: 75,
  3: 90,
} as const;

const STRONG_TASK_TYPES = new Set<ReviewTaskType>(["ru_en_choice", "cloze_choice"]);

const REVIEW_POINTS: Record<ReviewTaskType, Record<ReviewRating, number>> = {
  pairs: { know: 10, hard: 4, unknown: 0 },
  flashcards: { know: 15, hard: 6, unknown: 0 },
  ru_en_choice: { know: 25, hard: 10, unknown: 0 },
  cloze_choice: { know: 30, hard: 10, unknown: 0 },
};

const MASTERY_DELTAS: Record<ReviewTaskType, Record<ReviewRating, number>> = {
  pairs: { know: 6, hard: 2, unknown: -4 },
  flashcards: { know: 10, hard: 4, unknown: -6 },
  ru_en_choice: { know: 16, hard: 6, unknown: -10 },
  cloze_choice: { know: 18, hard: 6, unknown: -12 },
};

export interface LearningQueueCandidate extends StudyItemRecord {
  hasContext: boolean;
}

export interface LearningQueueResult {
  queueItems: LearningQueueCandidate[];
  itemsToActivate: LearningQueueCandidate[];
  dueCount: number;
  hardDueCount: number;
  newCount: number;
  maintenanceCount: number;
}

export interface RatedReviewEventLike {
  studyItemId: number;
  rating: ReviewRating;
  taskType: ReviewTaskType | null;
  reviewedAt: string;
}

export interface RatedTaskState {
  route: ReviewTaskType[];
  currentTaskType: ReviewTaskType | null;
  completedTaskTypesToday: ReviewTaskType[];
  completedToday: boolean;
  todayPoints: number;
}

export interface LearningReviewResult {
  status: StudyStatus;
  isActive: boolean;
  learningStage: number;
  masteryScore: number;
  strongSuccessStreak: number;
  activatedAt: string | null;
  lastAnswerAt: string;
  lastMasteredAt: string | null;
  maintenanceStage: number;
  correctStreak: number;
  wrongCount: number;
  repetitions: number;
  nextReviewAt: string;
  sessionPoints: number;
}

function isSameDay(leftIso: string | null, right: Date) {
  if (!leftIso) {
    return false;
  }

  const left = new Date(leftIso);
  if (Number.isNaN(left.getTime())) {
    return false;
  }

  return startOfDayKey(left) === startOfDayKey(right);
}

function clampMastery(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)));
}

function stageIntervalDays(stage: number) {
  if (stage <= 1) {
    return 1;
  }

  if (stage === 2) {
    return 2;
  }

  return 4;
}

function maintenanceIntervalDays(stage: number) {
  return LEARNING_DEFAULTS.maintenanceIntervalsDays[
    Math.min(stage, LEARNING_DEFAULTS.maintenanceIntervalsDays.length - 1)
  ];
}

function reviewPoints(taskType: ReviewTaskType, rating: ReviewRating) {
  return REVIEW_POINTS[taskType][rating];
}

function masteryDelta(taskType: ReviewTaskType, rating: ReviewRating) {
  return MASTERY_DELTAS[taskType][rating];
}

function stageThreshold(stage: number) {
  if (stage <= 0) return STAGE_MASTERY_THRESHOLDS[0];
  if (stage === 1) return STAGE_MASTERY_THRESHOLDS[1];
  if (stage === 2) return STAGE_MASTERY_THRESHOLDS[2];
  return STAGE_MASTERY_THRESHOLDS[3];
}

function successfulReviewState(item: StudyItemRecord, taskType: ReviewTaskType, nowIso: string) {
  return {
    repetitions: item.repetitions + 1,
    lastAnswerAt: nowIso,
    masteryScore: clampMastery(item.masteryScore + masteryDelta(taskType, "know")),
    strongSuccessStreak: STRONG_TASK_TYPES.has(taskType)
      ? item.strongSuccessStreak + 1
      : item.strongSuccessStreak,
  };
}

function hardReviewState(item: StudyItemRecord, taskType: ReviewTaskType, nowIso: string) {
  return {
    repetitions: item.repetitions + 1,
    lastAnswerAt: nowIso,
    masteryScore: clampMastery(item.masteryScore + masteryDelta(taskType, "hard")),
  };
}

function failedReviewState(item: StudyItemRecord, taskType: ReviewTaskType, nowIso: string) {
  return {
    repetitions: item.repetitions + 1,
    lastAnswerAt: nowIso,
    masteryScore: clampMastery(item.masteryScore + masteryDelta(taskType, "unknown")),
  };
}

function shouldReleaseHardStatus(item: StudyItemRecord, nextCorrectStreak: number) {
  return item.status === "hard" && nextCorrectStreak >= 2;
}

function getStrongTask(hasContext: boolean): ReviewTaskType {
  return hasContext ? "cloze_choice" : "ru_en_choice";
}

export function getReviewRouteForItem(
  item: Pick<StudyItemRecord, "status" | "learningStage">,
  hasContext: boolean,
): ReviewTaskType[] {
  if (item.status === "learned") {
    return [getStrongTask(hasContext)];
  }

  if (item.learningStage <= 0) {
    return ["pairs", "flashcards"];
  }

  if (item.learningStage === 1) {
    return ["flashcards", "ru_en_choice"];
  }

  if (item.learningStage === 2) {
    return ["ru_en_choice", getStrongTask(hasContext)];
  }

  return [getStrongTask(hasContext)];
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

export function resolveEffectiveNextReviewAt(
  item: Pick<
    StudyItemRecord,
    "learningStage" | "lastAnswerAt" | "activatedAt" | "nextReviewAt" | "status" | "isActive"
  >,
) {
  if (!item.isActive || item.status === "learned" || item.learningStage <= 0) {
    return item.nextReviewAt;
  }

  const anchor = item.lastAnswerAt ?? item.activatedAt;
  if (!anchor) {
    return item.nextReviewAt;
  }

  const expectedReviewAt = addDays(anchor, stageIntervalDays(item.learningStage));
  return new Date(expectedReviewAt).getTime() < new Date(item.nextReviewAt).getTime()
    ? expectedReviewAt
    : item.nextReviewAt;
}

export function isLearningItemDue(
  item: Pick<
    StudyItemRecord,
    "learningStage" | "lastAnswerAt" | "activatedAt" | "nextReviewAt" | "status" | "isActive"
  >,
  now: Date,
) {
  if (!item.isActive || item.status === "learned") {
    return false;
  }

  return hasReachedReviewDay(resolveEffectiveNextReviewAt(item), now);
}

export function isMaintenanceReviewDue(
  item: Pick<StudyItemRecord, "status" | "nextReviewAt">,
  now: Date,
) {
  if (item.status !== "learned") {
    return false;
  }

  return hasReachedReviewDay(item.nextReviewAt, now);
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

  const byDue =
    new Date(resolveEffectiveNextReviewAt(left)).getTime() -
    new Date(resolveEffectiveNextReviewAt(right)).getTime();
  if (byDue !== 0) {
    return byDue;
  }

  return right.updatedAt.localeCompare(left.updatedAt);
}

function sortMaintenanceItems(left: LearningQueueCandidate, right: LearningQueueCandidate) {
  const byReview = new Date(left.nextReviewAt).getTime() - new Date(right.nextReviewAt).getTime();
  if (byReview !== 0) {
    return byReview;
  }

  return (left.lastMasteredAt ?? left.updatedAt).localeCompare(right.lastMasteredAt ?? right.updatedAt);
}

function sortInactiveCandidates(left: LearningQueueCandidate, right: LearningQueueCandidate) {
  if (left.hasContext !== right.hasContext) {
    return left.hasContext ? -1 : 1;
  }

  return right.createdAt.localeCompare(left.createdAt);
}

export function buildLearningQueue(
  items: LearningQueueCandidate[],
  settings: Pick<UserSettingsRecord, "dailyWords" | "dailyNewWords" | "prioritizeDifficult" | "includePhrases">,
  nowInput = new Date(),
): LearningQueueResult {
  const now = nowInput instanceof Date ? nowInput : new Date(nowInput);
  const filteredItems = items.filter((item) => (settings.includePhrases ? true : item.kind !== "phrase"));
  const dueItems = filteredItems
    .filter((item) => isLearningItemDue(item, now))
    .sort((left, right) => sortDueItems(left, right, settings.prioritizeDifficult));
  const maintenanceCandidates = filteredItems
    .filter((item) => isMaintenanceReviewDue(item, now))
    .sort(sortMaintenanceItems);
  const activatedTodayCount = filteredItems.filter(
    (item) => item.status !== "learned" && isSameDay(item.activatedAt, now),
  ).length;
  const activePoolCount = filteredItems.filter(
    (item) => item.status !== "learned" && item.isActive,
  ).length;
  const remainingNewSlots = Math.max(
    Math.min(
      (settings.dailyNewWords ?? DEFAULT_DAILY_NEW_WORDS) - activatedTodayCount,
      LEARNING_DEFAULTS.activePoolCap - activePoolCount,
    ),
    0,
  );
  const targetQueueSize = Math.max(settings.dailyWords, dueItems.length);
  const learnedMaintenanceCap = Math.min(
    LEARNING_DEFAULTS.learnedMaintenanceCap,
    Math.max(1, Math.floor(settings.dailyWords * LEARNING_DEFAULTS.learnedMaintenanceShare)),
  );
  const maintenanceItems = maintenanceCandidates.slice(
    0,
    Math.max(Math.min(targetQueueSize - dueItems.length, learnedMaintenanceCap), 0),
  );

  const inactiveNewItems = filteredItems
    .filter((item) => item.status === "new" && !item.isActive)
    .sort(sortInactiveCandidates);
  const itemsToActivate = inactiveNewItems.slice(
    0,
    Math.max(
      Math.min(targetQueueSize - dueItems.length - maintenanceItems.length, remainingNewSlots),
      0,
    ),
  );

  return {
    queueItems: [...dueItems, ...maintenanceItems, ...itemsToActivate],
    itemsToActivate,
    dueCount: dueItems.length,
    hardDueCount: dueItems.filter((item) => item.status === "hard").length,
    newCount: itemsToActivate.length,
    maintenanceCount: maintenanceItems.length,
  };
}

export function activateLearningItem(
  item: StudyItemRecord,
  nowInput = new Date(),
): Pick<
  StudyItemRecord,
  | "isActive"
  | "learningStage"
  | "masteryScore"
  | "strongSuccessStreak"
  | "activatedAt"
  | "lastAnswerAt"
  | "lastMasteredAt"
  | "maintenanceStage"
  | "correctStreak"
  | "wrongCount"
  | "nextReviewAt"
> {
  const nowIso = (nowInput instanceof Date ? nowInput : new Date(nowInput)).toISOString();

  return {
    isActive: true,
    learningStage: INITIAL_STAGE,
    masteryScore: 0,
    strongSuccessStreak: 0,
    activatedAt: item.activatedAt ?? nowIso,
    lastAnswerAt: item.lastAnswerAt,
    lastMasteredAt: item.lastMasteredAt,
    maintenanceStage: 0,
    correctStreak: 0,
    wrongCount: item.wrongCount,
    nextReviewAt: nowIso,
  };
}

export function buildRatedTaskState(params: {
  item: StudyItemRecord;
  eventsToday: RatedReviewEventLike[];
  hasContext: boolean;
  now?: Date;
}): RatedTaskState {
  const { item, eventsToday, hasContext, now = new Date() } = params;
  const route = getReviewRouteForItem(item, hasContext);
  const todayPoints = eventsToday.reduce((sum, event) => {
    if (!event.taskType) {
      return sum;
    }
    return sum + reviewPoints(event.taskType, event.rating);
  }, 0);

  if (eventsToday.length === 0) {
    return {
      route,
      currentTaskType: route[0] ?? null,
      completedTaskTypesToday: [],
      completedToday: false,
      todayPoints,
    };
  }

  const completedTaskTypesToday: ReviewTaskType[] = [];
  for (const event of eventsToday) {
    if (!event.taskType) {
      continue;
    }

    if (event.rating !== "know") {
      return {
        route,
        currentTaskType: null,
        completedTaskTypesToday,
        completedToday: true,
        todayPoints,
      };
    }

    if (completedTaskTypesToday.length < route.length) {
      completedTaskTypesToday.push(event.taskType);
    }
  }

  const routeFinishedByState =
    isSameDay(item.lastAnswerAt, now) &&
    !isLearningItemDue(item, now) &&
    !isMaintenanceReviewDue(item, now);
  if (routeFinishedByState || completedTaskTypesToday.length >= route.length) {
    return {
      route,
      currentTaskType: null,
      completedTaskTypesToday: route.slice(0, Math.min(completedTaskTypesToday.length, route.length)),
      completedToday: true,
      todayPoints,
    };
  }

  return {
    route,
    currentTaskType: route[completedTaskTypesToday.length] ?? null,
    completedTaskTypesToday,
    completedToday: false,
    todayPoints,
  };
}

function buildLearnedMaintenanceSuccess(
  item: StudyItemRecord,
  taskType: ReviewTaskType,
  nowIso: string,
): LearningReviewResult {
  const base = successfulReviewState(item, taskType, nowIso);
  const nextMaintenanceStage = Math.min(
    item.maintenanceStage + 1,
    LEARNING_DEFAULTS.maintenanceIntervalsDays.length - 1,
  );

  return {
    status: "learned",
    isActive: false,
    learningStage: LEARNED_STAGE,
    masteryScore: base.masteryScore,
    strongSuccessStreak: base.strongSuccessStreak,
    activatedAt: item.activatedAt,
    lastAnswerAt: base.lastAnswerAt,
    lastMasteredAt: item.lastMasteredAt ?? nowIso,
    maintenanceStage: nextMaintenanceStage,
    correctStreak: item.correctStreak + 1,
    wrongCount: item.wrongCount,
    repetitions: base.repetitions,
    nextReviewAt: addDays(nowIso, maintenanceIntervalDays(nextMaintenanceStage)),
    sessionPoints: reviewPoints(taskType, "know"),
  };
}

function buildLearnedMaintenanceHard(
  item: StudyItemRecord,
  taskType: ReviewTaskType,
  nowIso: string,
): LearningReviewResult {
  const base = hardReviewState(item, taskType, nowIso);

  return {
    status: "learned",
    isActive: false,
    learningStage: LEARNED_STAGE,
    masteryScore: base.masteryScore,
    strongSuccessStreak: item.strongSuccessStreak,
    activatedAt: item.activatedAt,
    lastAnswerAt: base.lastAnswerAt,
    lastMasteredAt: item.lastMasteredAt,
    maintenanceStage: item.maintenanceStage,
    correctStreak: 0,
    wrongCount: item.wrongCount,
    repetitions: base.repetitions,
    nextReviewAt: addDays(nowIso, 1),
    sessionPoints: reviewPoints(taskType, "hard"),
  };
}

function buildLearnedMaintenanceFailure(
  item: StudyItemRecord,
  taskType: ReviewTaskType,
  nowIso: string,
): LearningReviewResult {
  const base = failedReviewState(item, taskType, nowIso);

  return {
    status: "hard",
    isActive: true,
    learningStage: 2,
    masteryScore: Math.min(base.masteryScore, 60),
    strongSuccessStreak: 0,
    activatedAt: nowIso,
    lastAnswerAt: base.lastAnswerAt,
    lastMasteredAt: item.lastMasteredAt,
    maintenanceStage: 0,
    correctStreak: 0,
    wrongCount: item.wrongCount + 1,
    repetitions: base.repetitions,
    nextReviewAt: addDays(nowIso, 1),
    sessionPoints: reviewPoints(taskType, "unknown"),
  };
}

export function applyLearningReview(params: {
  item: StudyItemRecord;
  rating: ReviewRating;
  taskType: ReviewTaskType;
  priorRatedEventsToday: RatedReviewEventLike[];
  hasContext: boolean;
  now?: Date;
}): LearningReviewResult {
  const { item, rating, taskType, priorRatedEventsToday, hasContext, now = new Date() } = params;
  const nowIso = now.toISOString();
  const taskState = buildRatedTaskState({
    item,
    eventsToday: priorRatedEventsToday,
    hasContext,
    now,
  });

  if (taskState.completedToday || taskState.currentTaskType === null) {
    throw new Error("ITEM_SESSION_CLOSED");
  }

  if (taskState.currentTaskType !== taskType) {
    throw new Error("TASK_TYPE_NOT_AVAILABLE");
  }

  if (item.status === "learned") {
    if (rating === "know") {
      return buildLearnedMaintenanceSuccess(item, taskType, nowIso);
    }

    if (rating === "hard") {
      return buildLearnedMaintenanceHard(item, taskType, nowIso);
    }

    return buildLearnedMaintenanceFailure(item, taskType, nowIso);
  }

  if (rating === "unknown") {
    const base = failedReviewState(item, taskType, nowIso);

    return {
      status: "hard",
      isActive: true,
      learningStage: Math.max(item.learningStage - 1, INITIAL_STAGE),
      masteryScore: base.masteryScore,
      strongSuccessStreak: 0,
      activatedAt: item.activatedAt ?? nowIso,
      lastAnswerAt: base.lastAnswerAt,
      lastMasteredAt: item.lastMasteredAt,
      maintenanceStage: 0,
      correctStreak: 0,
      wrongCount: item.wrongCount + 1,
      repetitions: base.repetitions,
      nextReviewAt: addDays(nowIso, 1),
      sessionPoints: reviewPoints(taskType, "unknown"),
    };
  }

  if (rating === "hard") {
    const base = hardReviewState(item, taskType, nowIso);

    return {
      status: "hard",
      isActive: true,
      learningStage: item.learningStage,
      masteryScore: base.masteryScore,
      strongSuccessStreak: item.strongSuccessStreak,
      activatedAt: item.activatedAt ?? nowIso,
      lastAnswerAt: base.lastAnswerAt,
      lastMasteredAt: item.lastMasteredAt,
      maintenanceStage: 0,
      correctStreak: 0,
      wrongCount: item.wrongCount,
      repetitions: base.repetitions,
      nextReviewAt: addDays(nowIso, 1),
      sessionPoints: reviewPoints(taskType, "hard"),
    };
  }

  const base = successfulReviewState(item, taskType, nowIso);
  const route = taskState.route;
  const routeWillFinish = taskState.completedTaskTypesToday.length + 1 >= route.length;

  if (!routeWillFinish) {
    return {
      status: item.status,
      isActive: true,
      learningStage: item.learningStage,
      masteryScore: base.masteryScore,
      strongSuccessStreak: base.strongSuccessStreak,
      activatedAt: item.activatedAt ?? nowIso,
      lastAnswerAt: base.lastAnswerAt,
      lastMasteredAt: item.lastMasteredAt,
      maintenanceStage: 0,
      correctStreak: item.correctStreak,
      wrongCount: item.wrongCount,
      repetitions: base.repetitions,
      nextReviewAt: nowIso,
      sessionPoints: reviewPoints(taskType, "know"),
    };
  }

  const nextCorrectStreak = item.correctStreak + 1;
  const resolvedStatus = shouldReleaseHardStatus(item, nextCorrectStreak) ? "new" : item.status;
  const activatedAt = item.activatedAt ?? nowIso;

  if (
    item.learningStage >= FINAL_REVIEW_STAGE &&
    STRONG_TASK_TYPES.has(taskType) &&
    new Date(activatedAt).getTime() <= new Date(addDays(nowIso, -7)).getTime() &&
    base.strongSuccessStreak >= 2 &&
    base.masteryScore >= stageThreshold(3)
  ) {
    return {
      status: "learned",
      isActive: false,
      learningStage: LEARNED_STAGE,
      masteryScore: base.masteryScore,
      strongSuccessStreak: base.strongSuccessStreak,
      activatedAt,
      lastAnswerAt: base.lastAnswerAt,
      lastMasteredAt: nowIso,
      maintenanceStage: 0,
      correctStreak: nextCorrectStreak,
      wrongCount: item.wrongCount,
      repetitions: base.repetitions,
      nextReviewAt: addDays(nowIso, maintenanceIntervalDays(0)),
      sessionPoints: reviewPoints(taskType, "know"),
    };
  }

  let nextStage = item.learningStage;
  let nextReviewAt = addDays(nowIso, 1);

  if (item.learningStage === 0 && base.masteryScore >= stageThreshold(0)) {
    nextStage = 1;
    nextReviewAt = addDays(nowIso, 1);
  } else if (
    item.learningStage === 1 &&
    taskType === "ru_en_choice" &&
    base.masteryScore >= stageThreshold(1)
  ) {
    nextStage = 2;
    nextReviewAt = addDays(nowIso, 2);
  } else if (
    item.learningStage === 2 &&
    STRONG_TASK_TYPES.has(taskType) &&
    base.masteryScore >= stageThreshold(2)
  ) {
    nextStage = 3;
    nextReviewAt = addDays(nowIso, 4);
  } else if (item.learningStage >= FINAL_REVIEW_STAGE) {
    nextReviewAt = addDays(nowIso, 1);
  }

  if (resolvedStatus === "hard") {
    nextReviewAt = addDays(nowIso, 1);
  }

  return {
    status: resolvedStatus,
    isActive: true,
    learningStage: nextStage,
    masteryScore: base.masteryScore,
    strongSuccessStreak: base.strongSuccessStreak,
    activatedAt,
    lastAnswerAt: base.lastAnswerAt,
    lastMasteredAt: item.lastMasteredAt,
    maintenanceStage: 0,
    correctStreak: nextCorrectStreak,
    wrongCount: item.wrongCount,
    repetitions: base.repetitions,
    nextReviewAt,
    sessionPoints: reviewPoints(taskType, "know"),
  };
}
