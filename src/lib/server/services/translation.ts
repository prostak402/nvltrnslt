import "server-only";

import { serverEnv } from "@/lib/env";
import { normalizeWord } from "@/lib/server/utils";

import { getRuntimeTranslationTimeoutMs } from "./site-settings";

export type TranslationProvider = "yandex" | "local";
export type TranslationDegradeReason =
  | "provider_not_configured"
  | "provider_timeout"
  | "provider_rate_limited"
  | "provider_http_error"
  | "provider_auth_error"
  | "provider_invalid_response"
  | "provider_network_error";

export type TranslationResult = {
  translatedText: string;
  cacheable: boolean;
  consumesQuota: boolean;
  provider: TranslationProvider;
  degraded: boolean;
  degradeReason: TranslationDegradeReason | null;
  attempts: number;
};

type TranslationProviderErrorCode =
  | "TRANSLATION_PROVIDER_MISCONFIGURED"
  | "TRANSLATION_PROVIDER_UNAVAILABLE";

type TranslationProviderError = Error & {
  code: TranslationProviderErrorCode;
  degradeReason: TranslationDegradeReason;
  attempts: number;
};

const YANDEX_TRANSLATE_URL =
  "https://translate.api.cloud.yandex.net/translate/v2/translate";
const TRANSIENT_HTTP_STATUSES = new Set([408, 429, 500, 502, 503, 504]);
const STALE_TRANSLATION_MARKERS = [
  "[degraded]",
  "Yandex Cloud proxy",
  "Локальный перевод для",
  "Сервис перевода временно недоступен",
  "Р Р…Р ВµР С•РЎвЂ¦",
  "Р С•РЎвЂљРЎвЂЎ",
  "Р Р…Р ВµР С‘Р В·",
  "Р С—РЎР‚Р С•РЎвЂљ",
  "РЎРѓР С•Р В·Р Р…",
  "Р С—Р ВµРЎР‚Р ВµР Р†Р С•Р Т‘",
];

const LOCAL_TRANSLATION_DICTIONARY: Record<string, string> = {
  reluctant: "неохотный",
  despair: "отчаяние",
  inevitable: "неизбежный",
  contradiction: "противоречие",
  consciousness: "сознание",
};

export function translationProviderIsConfigured() {
  return Boolean(
    serverEnv.YANDEX_TRANSLATE_API_KEY && serverEnv.YANDEX_TRANSLATE_FOLDER_ID,
  );
}

function sleep(ms: number) {
  if (ms <= 0) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function buildProviderError(
  code: TranslationProviderErrorCode,
  degradeReason: TranslationDegradeReason,
  attempts: number,
) {
  const error = new Error(code) as TranslationProviderError;
  error.code = code;
  error.degradeReason = degradeReason;
  error.attempts = attempts;
  return error;
}

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === "AbortError";
}

function fallbackMessageForReason(
  reason: TranslationDegradeReason,
  text: string,
) {
  const label = text.trim() || "этого текста";

  if (reason === "provider_not_configured") {
    return `[degraded] Переводчик не настроен. Добавьте Yandex Cloud переменные окружения и повторите запрос для "${label}".`;
  }

  if (reason === "provider_auth_error") {
    return `[degraded] Переводчик настроен некорректно. Проверьте Yandex Cloud ключ и folderId, затем повторите запрос для "${label}".`;
  }

  if (reason === "provider_rate_limited") {
    return `[degraded] Сервис перевода временно перегружен. Повторите попытку позже для "${label}".`;
  }

  return `[degraded] Сервис перевода временно недоступен. Повторите попытку позже для "${label}".`;
}

function buildLocalFallback(
  text: string,
  reason: TranslationDegradeReason,
  attempts: number,
): TranslationResult {
  const normalized = normalizeWord(text);
  const dictionaryTranslation = LOCAL_TRANSLATION_DICTIONARY[normalized];

  return {
    translatedText:
      dictionaryTranslation ?? fallbackMessageForReason(reason, text),
    cacheable: false,
    consumesQuota: false,
    provider: "local",
    degraded: true,
    degradeReason: reason,
    attempts,
  };
}

function shouldRetryOnStatus(status: number) {
  return TRANSIENT_HTTP_STATUSES.has(status);
}

function isTranslationProviderError(
  error: unknown,
): error is TranslationProviderError {
  return (
    error instanceof Error &&
    typeof (error as TranslationProviderError).code === "string" &&
    typeof (error as TranslationProviderError).degradeReason === "string"
  );
}

async function fetchYandexTranslation(text: string) {
  const apiKey = serverEnv.YANDEX_TRANSLATE_API_KEY;
  const folderId = serverEnv.YANDEX_TRANSLATE_FOLDER_ID;

  if (!translationProviderIsConfigured() || !apiKey || !folderId) {
    throw buildProviderError(
      "TRANSLATION_PROVIDER_MISCONFIGURED",
      "provider_not_configured",
      0,
    );
  }

  const maxAttempts = serverEnv.TRANSLATION_MAX_RETRIES + 1;
  const timeoutMs = await getRuntimeTranslationTimeoutMs();
  const retryDelayMs = serverEnv.TRANSLATION_RETRY_DELAY_MS;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(YANDEX_TRANSLATE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Api-Key ${apiKey}`,
        },
        body: JSON.stringify({
          folderId,
          targetLanguageCode: "ru",
          texts: [text],
        }),
        cache: "no-store",
        signal: controller.signal,
      });

      if (!response.ok) {
        const degradeReason =
          response.status === 401 || response.status === 403
            ? "provider_auth_error"
            : response.status === 429
              ? "provider_rate_limited"
              : "provider_http_error";

        if (attempt < maxAttempts && shouldRetryOnStatus(response.status)) {
          await sleep(retryDelayMs * attempt);
          continue;
        }

        throw buildProviderError(
          response.status === 401 || response.status === 403
            ? "TRANSLATION_PROVIDER_MISCONFIGURED"
            : "TRANSLATION_PROVIDER_UNAVAILABLE",
          degradeReason,
          attempt,
        );
      }

      const payload = (await response.json()) as {
        translations?: Array<{ text?: string }>;
      };
      const translatedText = payload.translations?.[0]?.text?.trim();

      if (!translatedText) {
        throw buildProviderError(
          "TRANSLATION_PROVIDER_UNAVAILABLE",
          "provider_invalid_response",
          attempt,
        );
      }

      return {
        translatedText,
        cacheable: true,
        consumesQuota: true,
        provider: "yandex" as const,
        degraded: false,
        degradeReason: null,
        attempts: attempt,
      };
    } catch (error) {
      if (isTranslationProviderError(error)) {
        throw error;
      }

      const degradeReason = isAbortError(error)
        ? "provider_timeout"
        : "provider_network_error";

      if (attempt < maxAttempts) {
        await sleep(retryDelayMs * attempt);
        continue;
      }

      throw buildProviderError(
        "TRANSLATION_PROVIDER_UNAVAILABLE",
        degradeReason,
        attempt,
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw buildProviderError(
    "TRANSLATION_PROVIDER_UNAVAILABLE",
    "provider_network_error",
    maxAttempts,
  );
}

export function isStaleCachedTranslation(translatedText: string) {
  return STALE_TRANSLATION_MARKERS.some((marker) =>
    translatedText.includes(marker),
  );
}

export async function translateText(text: string): Promise<TranslationResult> {
  try {
    return await fetchYandexTranslation(text);
  } catch (error) {
    if (!isTranslationProviderError(error)) {
      throw error;
    }

    if (serverEnv.TRANSLATION_DEGRADED_MODE === "error") {
      throw new Error(error.code);
    }

    return buildLocalFallback(text, error.degradeReason, error.attempts);
  }
}
