import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ZodError, z } from "zod";
import type { ZodIssue, ZodType } from "zod";

import {
  applyApiSecurityHeaders,
  RateLimitExceededError,
} from "@/lib/security";
import { captureObservedError } from "@/lib/server/services/observability";

type ValidationIssuePayload = {
  path: string;
  message: string;
};

const FIELD_LABELS: Record<string, string> = {
  name: "имя",
  email: "email",
  password: "пароль",
  subject: "тема",
  category: "категория",
  message: "сообщение",
  ticketId: "ticketId",
  text: "текст",
  status: "статус",
  id: "id",
  itemId: "itemId",
  gameId: "gameId",
  deviceId: "deviceId",
  renpyVersion: "версия Ren'Py",
  comment: "комментарий",
  activationKey: "ключ активации",
  deviceLabel: "название устройства",
  code: "код привязки",
  kind: "тип карточки",
  translation: "перевод",
  note: "заметка",
  contextOriginal: "оригинальный контекст",
  contextTranslation: "переведенный контекст",
  novelTitle: "название новеллы",
  dailyWords: "количество карточек в дневной подборке",
  prioritizeDifficult: "приоритет сложных слов",
  includePhrases: "повторение фраз",
  autoSync: "автосинхронизация",
  poorConnection: "поведение при плохом интернете",
  reminderEnabled: "напоминания",
  emailNotifications: "email-уведомления",
  apiTimeoutSec: "таймаут API",
  autoBackup: "автобэкап",
  backupTime: "время бэкапа",
  maintenanceMode: "режим обслуживания",
  registrationOpen: "открытая регистрация",
  adminNotifications: "уведомления админов",
  errorAlerts: "алерты об ошибках",
  body: "тело запроса",
};

const KNOWN_ROUTE_ERRORS = {
  UNAUTHORIZED: {
    message: "Нужно войти в аккаунт, чтобы продолжить.",
    status: 401,
  },
  FORBIDDEN: {
    message: "Для этого действия не хватает прав.",
    status: 403,
  },
  MAINTENANCE_MODE: {
    message:
      "Сервис временно недоступен: сейчас включен режим обслуживания. Доступ открыт только администраторам.",
    status: 503,
  },
  REGISTRATION_CLOSED: {
    message: "Регистрация временно закрыта.",
    status: 403,
  },
  DICTIONARY_LIMIT_REACHED: {
    message:
      "Лимит карточек в словаре достигнут. Обновите тариф или увеличьте лимит в настройках администратора.",
    status: 409,
  },
} as const;

function normalizeIssuePath(issue: ZodIssue) {
  return issue.path.length
    ? issue.path.map((segment) => String(segment)).join(".")
    : "body";
}

function labelForPath(path: string) {
  if (FIELD_LABELS[path]) {
    return FIELD_LABELS[path];
  }

  if (path.startsWith("defaultDailyLimit.")) {
    return `лимит переводов для тарифа ${path.split(".")[1]}`;
  }

  if (path.startsWith("maxDictionarySize.")) {
    return `лимит словаря для тарифа ${path.split(".")[1]}`;
  }

  return path;
}

function buildIssueMessage(issue: ZodIssue, path: string) {
  const label = labelForPath(path);

  if (path === "body" && issue.code === "too_big") {
    return "Этот запрос не принимает тело";
  }

  if (issue.code === "invalid_type") {
    if (issue.input === undefined) {
      if (path === "email") return "Введите email";
      if (path === "password") return "Введите пароль";
      if (path === "name") return "Введите имя";
      if (path === "subject") return "Введите тему";
      if (path === "message") return "Введите сообщение";
      return `Заполните поле "${label}"`;
    }

    if (
      issue.expected === "number" ||
      issue.expected === "int" ||
      issue.expected === "nan"
    ) {
      return `Поле "${label}" должно быть числом`;
    }

    if (issue.expected === "boolean") {
      return `Поле "${label}" должно иметь значение true или false`;
    }

    return `Поле "${label}" заполнено некорректно`;
  }

  if (issue.code === "invalid_format") {
    if (issue.format === "email") {
      return "Введите корректный email";
    }

    if (path === "backupTime") {
      return "Укажите время в формате ЧЧ:ММ";
    }

    return `Поле "${label}" заполнено в неверном формате`;
  }

  if (issue.code === "invalid_value") {
    return `Поле "${label}" содержит недопустимое значение`;
  }

  if (issue.code === "too_small") {
    if (issue.origin === "string") {
      if (issue.minimum === 1) {
        if (path === "email") return "Введите email";
        if (path === "password") return "Введите пароль";
        if (path === "name") return "Введите имя";
        if (path === "subject") return "Введите тему";
        if (path === "message") return "Введите сообщение";
        return `Заполните поле "${label}"`;
      }

      if (path === "password") {
        return `Пароль должен быть не короче ${issue.minimum} символов`;
      }

      return `Поле "${label}" должно содержать не меньше ${issue.minimum} символов`;
    }

    if (path === "dailyWords") {
      return "Количество карточек в дневной подборке должно быть от 5 до 50";
    }

    return `Поле "${label}" должно быть не меньше ${issue.minimum}`;
  }

  if (issue.code === "too_big") {
    if (path === "dailyWords") {
      return "Количество карточек в дневной подборке должно быть от 5 до 50";
    }

    if (issue.origin === "string") {
      return `Поле "${label}" слишком длинное`;
    }

    return `Поле "${label}" превышает допустимое значение`;
  }

  if (issue.code === "custom") {
    return issue.message;
  }

  return issue.message || `Поле "${label}" заполнено некорректно`;
}

function buildValidationIssues(issues: ZodIssue[]) {
  return issues.map<ValidationIssuePayload>((issue) => {
    const path = normalizeIssuePath(issue);
    return {
      path,
      message: buildIssueMessage(issue, path),
    };
  });
}

function buildFieldErrors(issues: ValidationIssuePayload[]) {
  return issues.reduce<Record<string, string[]>>((acc, issue) => {
    acc[issue.path] = [...(acc[issue.path] ?? []), issue.message];
    return acc;
  }, {});
}

function mergeHeaders(...headersList: Array<HeadersInit | undefined>) {
  const headers = new Headers();

  for (const headersInit of headersList) {
    if (!headersInit) {
      continue;
    }

    const nextHeaders = new Headers(headersInit);
    for (const [key, value] of nextHeaders.entries()) {
      headers.set(key, value);
    }
  }

  return headers;
}

export function withApiSecurityHeaders(init?: ResponseInit) {
  const headers = mergeHeaders(init?.headers);
  applyApiSecurityHeaders(headers);

  return {
    ...init,
    headers,
  } satisfies ResponseInit;
}

export function ok(data: unknown, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, withApiSecurityHeaders(init));
}

export function fail(
  message: string,
  status = 400,
  extra?: Record<string, unknown>,
  init?: ResponseInit,
) {
  return NextResponse.json(
    {
      ok: false,
      error: message,
      ...(extra ?? {}),
    },
    withApiSecurityHeaders({
      ...init,
      status,
    }),
  );
}

export async function parseJson<T>(request: NextRequest): Promise<T>;
export async function parseJson<T>(
  request: NextRequest,
  schema: ZodType<T>,
): Promise<T>;
export async function parseJson<T>(
  request: NextRequest,
  schema?: ZodType<T>,
) {
  try {
    const payload = (await request.json()) as unknown;
    return schema ? schema.parse(payload) : (payload as T);
  } catch (error) {
    if (error instanceof ZodError) {
      throw error;
    }

    throw new Error("INVALID_JSON");
  }
}

export function parseWithSchema<T>(value: unknown, schema: ZodType<T>) {
  return schema.parse(value);
}

export async function assertNoBody(request: Request) {
  const body = await request.text();
  z.string().trim().max(0).parse(body);
}

function genericFailureMessage(status: number) {
  if (status >= 500) {
    return "Сервис временно недоступен. Попробуйте ещё раз позже.";
  }

  return "Не удалось обработать запрос. Проверьте данные и попробуйте ещё раз.";
}

function reportUnexpectedRouteError(error: unknown, fallback: string) {
  console.error(`[route:${fallback}]`, error);
}

export function failForRouteError(
  error: unknown,
  fallback: string,
  status = 400,
  init?: ResponseInit,
) {
  if (error instanceof ZodError) {
    const issues = buildValidationIssues(error.issues);
    return fail(
      issues[0]?.message ?? "Некорректные данные запроса",
      400,
      {
        issues,
        fieldErrors: buildFieldErrors(issues),
      },
      init,
    );
  }

  if (error instanceof Error && error.message === "INVALID_JSON") {
    return fail("Некорректный JSON в теле запроса", 400, undefined, init);
  }

  if (error instanceof RateLimitExceededError) {
    return fail(
      error.message,
      429,
      {
        errorCode: error.code,
      },
      {
        ...init,
        headers: mergeHeaders(init?.headers, error.headers),
      },
    );
  }

  if (error instanceof Error) {
    const knownError =
      KNOWN_ROUTE_ERRORS[error.message as keyof typeof KNOWN_ROUTE_ERRORS];

    if (knownError) {
      return fail(
        knownError.message,
        knownError.status,
        {
          errorCode: error.message,
        },
        init,
      );
    }
  }

  reportUnexpectedRouteError(error, fallback);
  void captureObservedError({
    source: fallback,
    code: fallback,
    status,
    message: error instanceof Error ? error.message : fallback,
  }).catch((trackingError) => {
    console.error("[observability:captureObservedError]", trackingError);
  });

  return fail(
    genericFailureMessage(status),
    status,
    {
      errorCode: fallback,
    },
    init,
  );
}

export function deviceTokenFromRequest(request: NextRequest) {
  return (
    request.headers.get("x-device-token") ??
    request.nextUrl.searchParams.get("deviceToken") ??
    ""
  );
}
