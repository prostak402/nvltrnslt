export const APP_NAME = "NVLingo";
export const APP_VERSION = "0.1.0";
export const DEFAULT_SITE_URL = "http://127.0.0.1:32173";
export const MOD_VERSION = "0.1.0";
export const MOD_DOWNLOAD_FILE = `nvl-translate-mod-v${MOD_VERSION}.zip`;
export const MOD_DOWNLOAD_PATH = `/downloads/${MOD_DOWNLOAD_FILE}`;
export const ACTIVATION_KEY_FILE = "nvl_translate_key.json";

export const PLAN_ORDER = ["free", "basic", "extended"] as const;
export const PLANS = {
  free: {
    id: "free",
    label: "Бесплатный",
    price: "0 ₽",
    shortPrice: "$0",
    publicPrice: "0",
    period: "",
    dailyTranslations: 50,
    dictionaryLimit: 100,
    features: {
      wordTranslation: true,
      phraseTranslation: true,
      sentenceTranslation: false,
      sync: true,
      search: false,
      exercises: false,
      advancedStats: false,
      priorityProcessing: false,
    },
  },
  basic: {
    id: "basic",
    label: "Базовый",
    price: "399 ₽ / мес",
    shortPrice: "$4.99",
    publicPrice: "$4.99",
    period: "/мес",
    dailyTranslations: 200,
    dictionaryLimit: 1000,
    features: {
      wordTranslation: true,
      phraseTranslation: true,
      sentenceTranslation: false,
      sync: true,
      search: true,
      exercises: true,
      advancedStats: false,
      priorityProcessing: false,
    },
  },
  extended: {
    id: "extended",
    label: "Расширенный",
    price: "799 ₽ / мес",
    shortPrice: "$9.99",
    publicPrice: "$9.99",
    period: "/мес",
    dailyTranslations: null,
    dictionaryLimit: null,
    features: {
      wordTranslation: true,
      phraseTranslation: true,
      sentenceTranslation: true,
      sync: true,
      search: true,
      exercises: true,
      advancedStats: true,
      priorityProcessing: true,
    },
  },
} as const;

export const STUDY_STATUSES = ["new", "hard", "learned"] as const;
export const STUDY_KINDS = ["word", "phrase", "sentence"] as const;
export const REVIEW_RATINGS = ["unknown", "hard", "know"] as const;
export const REVIEW_TASK_TYPES = [
  "flashcards",
  "pairs",
  "ru_en_choice",
  "cloze_choice",
] as const;
export const REVIEW_SESSION_MODES = ["rated", "practice"] as const;
export const SUPPORT_CATEGORIES = [
  "mod",
  "sync",
  "account",
  "payment",
  "feature",
  "other",
] as const;
export const TICKET_STATUSES = [
  "open",
  "in_progress",
  "waiting",
  "resolved",
  "closed",
] as const;
export const COMPATIBILITY_STATUSES = [
  "full",
  "partial",
  "testing",
  "unsupported",
] as const;
export const BILLING_MODES = ["disabled", "manual", "provider"] as const;
export const BILLING_INTENT_STATUSES = [
  "pending",
  "requires_action",
  "completed",
  "failed",
  "cancelled",
  "expired",
] as const;

export const SESSION_COOKIE_NAME = "nvltrnslt_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
export const DEVICE_CODE_TTL_MINUTES = 15;
export const PASSWORD_RESET_TTL_MINUTES = 60;
export const MAX_ACTIVE_DEVICES = 3;
export const REVIEW_INTERVALS = {
  unknownHours: 1,
  hardDays: 1,
  knowDays: [3, 7, 14],
  learnedThreshold: 3,
} as const;
export const LEARNING_DEFAULTS = {
  activePoolCap: 30,
  learnedMaintenanceCap: 2,
  learnedMaintenanceShare: 0.15,
  maintenanceIntervalsDays: [7, 21, 45, 90],
} as const;
export const DEFAULT_TRANSLATION_TIMEOUT_MS = 8000;
export const DEFAULT_TRANSLATION_MAX_RETRIES = 2;
export const DEFAULT_TRANSLATION_RETRY_DELAY_MS = 400;
