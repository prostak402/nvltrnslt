import {
  BILLING_MODES,
  DEFAULT_TRANSLATION_MAX_RETRIES,
  DEFAULT_TRANSLATION_RETRY_DELAY_MS,
  DEFAULT_TRANSLATION_TIMEOUT_MS,
} from "@/lib/config";

type TranslationDegradedMode = "fallback" | "error";
type BillingMode = "disabled" | "manual" | "provider";

type ServerEnv = {
  AUTH_SECRET: string;
  DATABASE_URL: string;
  BILLING_MODE: BillingMode;
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CHAT_ID?: string;
  TELEGRAM_MESSAGE_THREAD_ID?: number;
  YANDEX_TRANSLATE_API_KEY?: string;
  YANDEX_TRANSLATE_FOLDER_ID?: string;
  TRANSLATION_TIMEOUT_MS: number;
  TRANSLATION_MAX_RETRIES: number;
  TRANSLATION_RETRY_DELAY_MS: number;
  TRANSLATION_DEGRADED_MODE: TranslationDegradedMode;
};

function readTrimmedEnv(name: string) {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function formatEnvError(message: string) {
  return `Invalid server environment configuration: ${message}`;
}

function validateRequiredEnv(
  name: keyof ServerEnv,
  options?: { minLength?: number; example?: string },
) {
  const value = readTrimmedEnv(name);
  if (!value) {
    const example = options?.example ? ` Example: ${options.example}` : "";
    throw new Error(formatEnvError(`${name} is required.${example}`));
  }

  if (options?.minLength && value.length < options.minLength) {
    throw new Error(
      formatEnvError(`${name} must be at least ${options.minLength} characters long.`),
    );
  }

  return value;
}

function validateIntegerEnv(
  name: keyof ServerEnv,
  defaultValue: number,
  options: { min: number; max: number },
) {
  const rawValue = readTrimmedEnv(name);
  if (!rawValue) {
    return defaultValue;
  }

  const parsed = Number(rawValue);
  if (!Number.isInteger(parsed)) {
    throw new Error(formatEnvError(`${name} must be an integer.`));
  }

  if (parsed < options.min || parsed > options.max) {
    throw new Error(
      formatEnvError(`${name} must be between ${options.min} and ${options.max}.`),
    );
  }

  return parsed;
}

function validateEnumEnv<TValue extends string>(
  name: keyof ServerEnv,
  allowedValues: readonly TValue[],
  defaultValue: TValue,
) {
  const rawValue = readTrimmedEnv(name);
  if (!rawValue) {
    return defaultValue;
  }

  if (!allowedValues.includes(rawValue as TValue)) {
    throw new Error(
      formatEnvError(`${name} must be one of: ${allowedValues.join(", ")}.`),
    );
  }

  return rawValue as TValue;
}

function validateOptionalIntegerEnv(
  name: keyof ServerEnv,
  options: { min: number },
) {
  const rawValue = readTrimmedEnv(name);
  if (!rawValue) {
    return undefined;
  }

  const parsed = Number(rawValue);
  if (!Number.isInteger(parsed) || parsed < options.min) {
    throw new Error(formatEnvError(`${name} must be an integer >= ${options.min}.`));
  }

  return parsed;
}

function validateDatabaseUrl(databaseUrl: string) {
  let parsed: URL;

  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error(
      formatEnvError(
        "DATABASE_URL must be a valid URL, for example postgres://postgres:postgres@127.0.0.1:55473/nvltrnslt",
      ),
    );
  }

  if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") {
    throw new Error(
      formatEnvError(
        "DATABASE_URL must start with postgres:// or postgresql://",
      ),
    );
  }

  return databaseUrl;
}

function loadServerEnv(): ServerEnv {
  const AUTH_SECRET = validateRequiredEnv("AUTH_SECRET", {
    minLength: 32,
    example: "AUTH_SECRET=replace-with-a-long-random-secret-at-least-32-chars",
  });
  const DATABASE_URL = validateDatabaseUrl(
    validateRequiredEnv("DATABASE_URL", {
      example: "DATABASE_URL=postgres://postgres:postgres@127.0.0.1:55473/nvltrnslt",
    }),
  );
  const BILLING_MODE = validateEnumEnv("BILLING_MODE", BILLING_MODES, "disabled");
  const TELEGRAM_BOT_TOKEN = readTrimmedEnv("TELEGRAM_BOT_TOKEN");
  const TELEGRAM_CHAT_ID = readTrimmedEnv("TELEGRAM_CHAT_ID");
  const TELEGRAM_MESSAGE_THREAD_ID = validateOptionalIntegerEnv(
    "TELEGRAM_MESSAGE_THREAD_ID",
    { min: 1 },
  );
  const YANDEX_TRANSLATE_API_KEY = readTrimmedEnv("YANDEX_TRANSLATE_API_KEY");
  const YANDEX_TRANSLATE_FOLDER_ID = readTrimmedEnv("YANDEX_TRANSLATE_FOLDER_ID");

  if (Boolean(TELEGRAM_BOT_TOKEN) !== Boolean(TELEGRAM_CHAT_ID)) {
    throw new Error(
      formatEnvError(
        "TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID must be provided together or left empty together.",
      ),
    );
  }

  if (Boolean(YANDEX_TRANSLATE_API_KEY) !== Boolean(YANDEX_TRANSLATE_FOLDER_ID)) {
    throw new Error(
      formatEnvError(
        "YANDEX_TRANSLATE_API_KEY and YANDEX_TRANSLATE_FOLDER_ID must be provided together or left empty together.",
      ),
    );
  }

  const TRANSLATION_TIMEOUT_MS = validateIntegerEnv(
    "TRANSLATION_TIMEOUT_MS",
    DEFAULT_TRANSLATION_TIMEOUT_MS,
    { min: 1000, max: 60000 },
  );
  const TRANSLATION_MAX_RETRIES = validateIntegerEnv(
    "TRANSLATION_MAX_RETRIES",
    DEFAULT_TRANSLATION_MAX_RETRIES,
    { min: 0, max: 5 },
  );
  const TRANSLATION_RETRY_DELAY_MS = validateIntegerEnv(
    "TRANSLATION_RETRY_DELAY_MS",
    DEFAULT_TRANSLATION_RETRY_DELAY_MS,
    { min: 0, max: 10000 },
  );
  const TRANSLATION_DEGRADED_MODE = validateEnumEnv(
    "TRANSLATION_DEGRADED_MODE",
    ["fallback", "error"] as const,
    "fallback",
  );

  return {
    AUTH_SECRET,
    DATABASE_URL,
    BILLING_MODE,
    TELEGRAM_BOT_TOKEN,
    TELEGRAM_CHAT_ID,
    TELEGRAM_MESSAGE_THREAD_ID,
    YANDEX_TRANSLATE_API_KEY,
    YANDEX_TRANSLATE_FOLDER_ID,
    TRANSLATION_TIMEOUT_MS,
    TRANSLATION_MAX_RETRIES,
    TRANSLATION_RETRY_DELAY_MS,
    TRANSLATION_DEGRADED_MODE,
  };
}

const globalForEnv = globalThis as typeof globalThis & {
  __nvltrnsltServerEnv?: ServerEnv;
};

export function getServerEnv() {
  if (!globalForEnv.__nvltrnsltServerEnv) {
    globalForEnv.__nvltrnsltServerEnv = loadServerEnv();
  }

  return globalForEnv.__nvltrnsltServerEnv;
}

export const serverEnv = getServerEnv();
