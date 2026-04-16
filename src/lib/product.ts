import { ACTIVATION_KEY_FILE, MAX_ACTIVE_DEVICES, PLAN_ORDER, PLANS } from "@/lib/config";
import type { PlanId } from "@/lib/types";

type PlanFeatureKey = keyof (typeof PLANS)[PlanId]["features"];

const PLAN_DESCRIPTIONS: Record<PlanId, string> = {
  free: "Для знакомства с платформой",
  basic: "Для регулярного чтения и повторения",
  extended: "Для интенсивного использования без лимитов",
};

const PLAN_HIGHLIGHTS: Record<PlanId, string[]> = {
  free: ["Базовые карточки", "Базовая история в кабинете"],
  basic: ["Полная история и прогресс", "Поиск, фильтры и упражнения"],
  extended: [
    "Автоперевод предложений",
    "Расширенная статистика",
    "Приоритетная обработка",
  ],
};

const PLAN_PREVIEW_HIGHLIGHTS: Record<PlanId, string[]> = {
  free: ["Перевод слов и фраз", "Синхронизация с кабинетом"],
  basic: ["Поиск, фильтры и упражнения", "Полная история и прогресс"],
  extended: ["Автоперевод предложений", "Расширенная статистика"],
};

const FEATURE_LABELS: Record<PlanFeatureKey, string> = {
  wordTranslation: "Перевод слов",
  phraseTranslation: "Перевод фраз",
  sentenceTranslation: "Автоперевод предложений",
  sync: "Синхронизация с кабинетом",
  search: "Поиск и фильтры",
  exercises: "Упражнения",
  advancedStats: "Расширенная статистика",
  priorityProcessing: "Приоритетная обработка",
};

const FEATURE_ORDER: PlanFeatureKey[] = [
  "wordTranslation",
  "phraseTranslation",
  "sentenceTranslation",
  "sync",
  "search",
  "exercises",
  "advancedStats",
  "priorityProcessing",
];

function basePriceLabel(planId: PlanId) {
  const plan = PLANS[planId];

  return `${plan.publicPrice}${plan.period}`;
}

export function translationUnitsShort(planId: PlanId) {
  const limit = PLANS[planId].dailyTranslations;
  return limit === null ? "Безлимит" : String(limit);
}

export function translationUnitsText(planId: PlanId) {
  const limit = PLANS[planId].dailyTranslations;
  return limit === null ? "Безлимит единиц перевода" : `${limit} единиц перевода в день`;
}

export function dictionaryLimitShort(planId: PlanId) {
  const limit = PLANS[planId].dictionaryLimit;
  return limit === null ? "Безлимит" : `${limit}`;
}

export function dictionaryLimitText(planId: PlanId) {
  const limit = PLANS[planId].dictionaryLimit;
  return limit === null ? "Безлимит карточек в словаре" : `До ${limit} карточек в словаре`;
}

function translationModeText(planId: PlanId) {
  const features = PLANS[planId].features;

  if (features.wordTranslation && features.phraseTranslation) {
    return "Перевод слов и фраз";
  }

  if (features.wordTranslation) {
    return "Перевод слов";
  }

  if (features.phraseTranslation) {
    return "Перевод фраз";
  }

  return "Перевод недоступен";
}

export function publicPlanCards() {
  return PLAN_ORDER.map((planId) => ({
    id: planId,
    name: PLANS[planId].label,
    price: basePriceLabel(planId),
    description: PLAN_DESCRIPTIONS[planId],
    highlighted: planId === "basic",
    features: [
      translationUnitsText(planId),
      dictionaryLimitText(planId),
      translationModeText(planId),
      ...(PLANS[planId].features.sync ? ["Синхронизация с кабинетом"] : []),
      ...PLAN_HIGHLIGHTS[planId],
    ],
    previewFeatures: [
      translationUnitsText(planId),
      dictionaryLimitText(planId),
      ...PLAN_PREVIEW_HIGHLIGHTS[planId],
    ],
  }));
}

export function planComparisonRows() {
  return [
    {
      name: "Единиц перевода в день",
      free: translationUnitsShort("free"),
      basic: translationUnitsShort("basic"),
      extended: translationUnitsShort("extended"),
    },
    {
      name: "Карточек в словаре",
      free: dictionaryLimitShort("free"),
      basic: dictionaryLimitShort("basic"),
      extended: dictionaryLimitShort("extended"),
    },
    ...FEATURE_ORDER.map((feature) => ({
      name: FEATURE_LABELS[feature],
      free: PLANS.free.features[feature],
      basic: PLANS.basic.features[feature],
      extended: PLANS.extended.features[feature],
    })),
  ];
}

export function freePlanSummary() {
  return `Бесплатный тариф включает ${translationUnitsText("free").toLowerCase()} и ${dictionaryLimitText("free").toLowerCase()}.`;
}

export function paidPlansSummary() {
  return [
    `Базовый тариф (${basePriceLabel("basic")}) даёт ${translationUnitsText("basic").toLowerCase()}, ${dictionaryLimitText("basic").toLowerCase()}, поиск, упражнения и полную историю.`,
    `Расширенный тариф (${basePriceLabel("extended")}) снимает лимиты и добавляет автоперевод предложений, расширенную статистику и приоритетную обработку.`,
  ].join(" ");
}

export function deviceLimitSummary() {
  return `На одном аккаунте можно держать до ${MAX_ACTIVE_DEVICES} активных устройств.`;
}

export function modDesktopSupportSummary() {
  return "Один zip-архив подходит для desktop-версий Ren'Py 7.x и 8.x на Windows, Linux и macOS.";
}

export function modInstallationSummary() {
  return "Скачайте универсальный desktop-архив мода и распакуйте его в папку game/ вашей визуальной новеллы.";
}

export function activationFilePlacementSummary() {
  return `Скачайте ${ACTIVATION_KEY_FILE} в кабинете и положите его в папку game/ рядом с модом.`;
}

export function activationFilesCheckSummary() {
  return `В папке game/ должны лежать и файлы мода, и ${ACTIVATION_KEY_FILE}.`;
}

export function activationFallbackSummary() {
  return "Если мод не активировался автоматически, откройте F6 и запустите активацию из файла.";
}

export function firstSyncSummary() {
  return "После первой синхронизации слова, история и прогресс появятся в кабинете.";
}

export function activationFlowSummary() {
  return `${activationFilePlacementSummary()} После этого мод активируется автоматически при запуске игры.`;
}
