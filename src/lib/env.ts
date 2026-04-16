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
  SITE_URL?: string;
  ALERT_EMAIL_TO?: string[];
  ALERT_EMAIL_FROM?: string;
  SMTP_HOST?: string;
  SMTP_PORT?: number;
  SMTP_SECURE?: boolean;
  SMTP_IGNORE_TLS?: boolean;
  SMTP_USER?: string;
  SMTP_PASSWORD?: string;
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

function validateOptionalBooleanEnv(name: keyof ServerEnv) {
  const rawValue = readTrimmedEnv(name);
  if (!rawValue) {
    return undefined;
  }

  const normalized = rawValue.toLowerCase();
  if (normalized === "true" || normalized === "1" || normalized === "yes") {
    return true;
  }

  if (normalized === "false" || normalized === "0" || normalized === "no") {
    return false;
  }

  throw new Error(
    formatEnvError(`${name} must be a boolean value like true/false.`),
  );
}

function validateOptionalEmail(name: keyof ServerEnv) {
  const rawValue = readTrimmedEnv(name);
  if (!rawValue) {
    return undefined;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawValue)) {
    throw new Error(formatEnvError(`${name} must be a valid email address.`));
  }

  return rawValue;
}

function validateOptionalEmailList(name: keyof ServerEnv) {
  const rawValue = readTrimmedEnv(name);
  if (!rawValue) {
    return undefined;
  }

  const items = rawValue
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (!items.length) {
    return undefined;
  }

  for (const item of items) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item)) {
      throw new Error(
        formatEnvError(`${name} must contain only valid email addresses.`),
      );
    }
  }

  return items;
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

function validateOptionalSiteUrl(name: keyof ServerEnv) {
  const rawValue = readTrimmedEnv(name);
  if (!rawValue) {
    return undefined;
  }

  let parsed: URL;
  try {
    parsed = new URL(rawValue);
  } catch {
    throw new Error(
      formatEnvError(
        `${name} must be a valid absolute URL, for example https://213.159.209.216`,
      ),
    );
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(formatEnvError(`${name} must start with http:// or https://`));
  }

  return parsed.origin;
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
  const SITE_URL = validateOptionalSiteUrl("SITE_URL");
  const ALERT_EMAIL_TO = validateOptionalEmailList("ALERT_EMAIL_TO");
  const ALERT_EMAIL_FROM = validateOptionalEmail("ALERT_EMAIL_FROM");
  const SMTP_HOST = readTrimmedEnv("SMTP_HOST");
  const SMTP_PORT = validateOptionalIntegerEnv("SMTP_PORT", { min: 1 });
  const SMTP_SECURE = validateOptionalBooleanEnv("SMTP_SECURE");
  const SMTP_IGNORE_TLS = validateOptionalBooleanEnv("SMTP_IGNORE_TLS");
  const SMTP_USER = readTrimmedEnv("SMTP_USER");
  const SMTP_PASSWORD = readTrimmedEnv("SMTP_PASSWORD");
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

  const smtpFieldsProvided = [
    Boolean(ALERT_EMAIL_TO?.length),
    Boolean(ALERT_EMAIL_FROM),
    Boolean(SMTP_HOST),
    SMTP_PORT !== undefined,
    SMTP_SECURE !== undefined,
    SMTP_IGNORE_TLS !== undefined,
    Boolean(SMTP_USER),
    Boolean(SMTP_PASSWORD),
  ].some(Boolean);

  if (smtpFieldsProvided) {
    if (!ALERT_EMAIL_TO?.length || !ALERT_EMAIL_FROM || !SMTP_HOST) {
      throw new Error(
        formatEnvError(
          "ALERT_EMAIL_TO, ALERT_EMAIL_FROM, and SMTP_HOST must be provided together to enable email alerts.",
        ),
      );
    }

    if (Boolean(SMTP_USER) !== Boolean(SMTP_PASSWORD)) {
      throw new Error(
        formatEnvError(
          "SMTP_USER and SMTP_PASSWORD must be provided together or left empty together.",
        ),
      );
    }
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
    SITE_URL,
    ALERT_EMAIL_TO,
    ALERT_EMAIL_FROM,
    SMTP_HOST,
    SMTP_PORT: SMTP_HOST ? (SMTP_PORT ?? 25) : undefined,
    SMTP_SECURE: SMTP_HOST ? (SMTP_SECURE ?? (SMTP_PORT === 465)) : undefined,
    SMTP_IGNORE_TLS: SMTP_HOST ? (SMTP_IGNORE_TLS ?? false) : undefined,
    SMTP_USER,
    SMTP_PASSWORD,
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
