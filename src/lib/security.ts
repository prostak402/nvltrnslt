import type { NextRequest } from "next/server";

import { sha256 } from "@/lib/server/utils";

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type RateLimitStore = Map<string, RateLimitEntry>;

export type RateLimitResult = {
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfter: number;
  headers: Headers;
};

const RATE_LIMIT_STORE_KEY = "__nvltrnsltRateLimitStore";
const RATE_LIMIT_SWEEP_KEY = "__nvltrnsltRateLimitSweep";
const DEFAULT_RATE_LIMIT_MESSAGE =
  "Слишком много запросов. Подождите немного и попробуйте ещё раз.";

function getRateLimitStore() {
  const globalState = globalThis as typeof globalThis & {
    [RATE_LIMIT_STORE_KEY]?: RateLimitStore;
    [RATE_LIMIT_SWEEP_KEY]?: number;
  };

  if (!globalState[RATE_LIMIT_STORE_KEY]) {
    globalState[RATE_LIMIT_STORE_KEY] = new Map<string, RateLimitEntry>();
  }

  return globalState[RATE_LIMIT_STORE_KEY];
}

function sweepExpiredEntries(store: RateLimitStore) {
  const globalState = globalThis as typeof globalThis & {
    [RATE_LIMIT_SWEEP_KEY]?: number;
  };

  globalState[RATE_LIMIT_SWEEP_KEY] =
    (globalState[RATE_LIMIT_SWEEP_KEY] ?? 0) + 1;

  if ((globalState[RATE_LIMIT_SWEEP_KEY] ?? 0) % 50 !== 0) {
    return;
  }

  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt <= now) {
      store.delete(key);
    }
  }
}

export class RateLimitExceededError extends Error {
  code: string;
  headers: Headers;

  constructor(message: string, headers: Headers) {
    super(message);
    this.name = "RateLimitExceededError";
    this.code = "RATE_LIMITED";
    this.headers = headers;
  }
}

function buildRateLimitHeaders(params: {
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfter: number;
}) {
  const headers = new Headers();

  headers.set("Retry-After", String(params.retryAfter));
  headers.set("X-RateLimit-Limit", String(params.limit));
  headers.set("X-RateLimit-Remaining", String(params.remaining));
  headers.set("X-RateLimit-Reset", String(Math.ceil(params.resetAt / 1000)));

  return headers;
}

export function clientIpFromRequest(
  request: Pick<NextRequest, "headers"> | Request,
) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const firstAddress = forwardedFor.split(",")[0]?.trim();
    if (firstAddress) {
      return firstAddress;
    }
  }

  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-real-ip") ??
    "local"
  );
}

export function buildRequestRateLimitKey(
  request: Pick<NextRequest, "headers"> | Request,
  ...parts: Array<string | number | null | undefined>
) {
  const clientIp = clientIpFromRequest(request);
  const normalizedParts = parts
    .filter(
      (part): part is string | number =>
        part !== null && part !== undefined && String(part).trim().length > 0,
    )
    .map((part) => String(part).trim());

  if (!normalizedParts.length) {
    return clientIp;
  }

  return `${clientIp}:${sha256(normalizedParts.join(":"))}`;
}

export function enforceRateLimit(params: {
  bucket: string;
  key: string;
  limit: number;
  windowMs: number;
  message?: string;
}) {
  const now = Date.now();
  const store = getRateLimitStore();
  const storeKey = `${params.bucket}:${params.key}`;

  sweepExpiredEntries(store);

  const existing = store.get(storeKey);
  if (!existing || existing.resetAt <= now) {
    const resetAt = now + params.windowMs;
    const nextEntry = {
      count: 1,
      resetAt,
    };
    store.set(storeKey, nextEntry);

    return {
      limit: params.limit,
      remaining: Math.max(params.limit - nextEntry.count, 0),
      resetAt,
      retryAfter: Math.max(Math.ceil((resetAt - now) / 1000), 1),
      headers: buildRateLimitHeaders({
        limit: params.limit,
        remaining: Math.max(params.limit - nextEntry.count, 0),
        resetAt,
        retryAfter: Math.max(Math.ceil((resetAt - now) / 1000), 1),
      }),
    } satisfies RateLimitResult;
  }

  if (existing.count >= params.limit) {
    const retryAfter = Math.max(Math.ceil((existing.resetAt - now) / 1000), 1);
    throw new RateLimitExceededError(
      params.message ?? DEFAULT_RATE_LIMIT_MESSAGE,
      buildRateLimitHeaders({
        limit: params.limit,
        remaining: 0,
        resetAt: existing.resetAt,
        retryAfter,
      }),
    );
  }

  existing.count += 1;
  store.set(storeKey, existing);

  const retryAfter = Math.max(Math.ceil((existing.resetAt - now) / 1000), 1);
  return {
    limit: params.limit,
    remaining: Math.max(params.limit - existing.count, 0),
    resetAt: existing.resetAt,
    retryAfter,
    headers: buildRateLimitHeaders({
      limit: params.limit,
      remaining: Math.max(params.limit - existing.count, 0),
      resetAt: existing.resetAt,
      retryAfter,
    }),
  } satisfies RateLimitResult;
}

function setHeaderIfMissing(headers: Headers, key: string, value: string) {
  if (!headers.has(key)) {
    headers.set(key, value);
  }
}

function applyCommonSecurityHeaders(headers: Headers) {
  setHeaderIfMissing(headers, "Cross-Origin-Opener-Policy", "same-origin");
  setHeaderIfMissing(headers, "Cross-Origin-Resource-Policy", "same-origin");
  setHeaderIfMissing(headers, "Origin-Agent-Cluster", "?1");
  setHeaderIfMissing(
    headers,
    "Permissions-Policy",
    [
      "accelerometer=()",
      "camera=()",
      "geolocation=()",
      "gyroscope=()",
      "microphone=()",
      "payment=()",
      "usb=()",
    ].join(", "),
  );
  setHeaderIfMissing(headers, "Referrer-Policy", "strict-origin-when-cross-origin");
  setHeaderIfMissing(headers, "X-Content-Type-Options", "nosniff");
  setHeaderIfMissing(headers, "X-DNS-Prefetch-Control", "off");
  setHeaderIfMissing(headers, "X-Frame-Options", "DENY");
  setHeaderIfMissing(headers, "X-Permitted-Cross-Domain-Policies", "none");
}

function buildPageContentSecurityPolicy(isDevelopment: boolean) {
  const scriptSrc = ["'self'", "'unsafe-inline'"];
  const connectSrc = ["'self'", "https://translate.api.cloud.yandex.net"];

  if (isDevelopment) {
    scriptSrc.push("'unsafe-eval'");
    connectSrc.push("http:", "ws:");
  }

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "frame-src 'none'",
    "manifest-src 'self'",
    "object-src 'none'",
    `script-src ${scriptSrc.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "media-src 'self' data: blob:",
    "worker-src 'self' blob:",
    `connect-src ${connectSrc.join(" ")}`,
    ...(isDevelopment ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

function isSecureRequest(
  request: Pick<NextRequest, "headers" | "nextUrl">,
) {
  return (
    request.nextUrl.protocol === "https:" ||
    request.headers.get("x-forwarded-proto") === "https"
  );
}

function isLoopbackIp(ip: string) {
  return (
    ip === "local" ||
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip === "::ffff:127.0.0.1"
  );
}

function isSensitivePagePath(pathname: string) {
  return (
    pathname.startsWith("/auth") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/admin")
  );
}

function applyNoStoreHeaders(headers: Headers) {
  setHeaderIfMissing(headers, "Cache-Control", "private, no-store, max-age=0");
  setHeaderIfMissing(headers, "Pragma", "no-cache");
  setHeaderIfMissing(headers, "Expires", "0");
}

export function applyApiSecurityHeaders(headers: Headers) {
  applyCommonSecurityHeaders(headers);
  headers.set(
    "Content-Security-Policy",
    "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
  );
  applyNoStoreHeaders(headers);
  setHeaderIfMissing(headers, "X-Robots-Tag", "noindex, nofollow, noarchive");
}

export function applyPageSecurityHeaders(
  request: Pick<NextRequest, "headers" | "nextUrl">,
  headers: Headers,
) {
  applyCommonSecurityHeaders(headers);
  headers.set(
    "Content-Security-Policy",
    buildPageContentSecurityPolicy(process.env.NODE_ENV !== "production"),
  );

  if (isSecureRequest(request)) {
    setHeaderIfMissing(
      headers,
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains",
    );
  }

  if (isSensitivePagePath(request.nextUrl.pathname)) {
    applyNoStoreHeaders(headers);
    setHeaderIfMissing(headers, "X-Robots-Tag", "noindex, nofollow, noarchive");
  }
}

export function requestIsFromTrustedLocalhost(
  request: Pick<NextRequest, "headers"> | Request,
) {
  return isLoopbackIp(clientIpFromRequest(request));
}
