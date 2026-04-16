"use client";

import { useCallback, useEffect, useState } from "react";

import type {
  ApiEnvelope,
  ApiFailureEnvelope,
  ApiFieldErrors,
  ApiIssue,
} from "@/lib/contracts/api";

export type { ApiFieldErrors, ApiIssue } from "@/lib/contracts/api";

export class ApiError extends Error {
  status: number;
  issues: ApiIssue[];
  fieldErrors: ApiFieldErrors;

  constructor(message: string, options?: {
    status?: number;
    issues?: ApiIssue[];
    fieldErrors?: ApiFieldErrors;
  }) {
    super(message);
    this.name = "ApiError";
    this.status = options?.status ?? 400;
    this.issues = options?.issues ?? [];
    this.fieldErrors = options?.fieldErrors ?? {};
  }

  firstFieldError(path: string) {
    return this.fieldErrors[path]?.[0] ?? null;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function getApiFieldError(error: unknown, path: string) {
  return isApiError(error) ? error.firstFieldError(path) : null;
}

async function parseResponse<T>(response: Response) {
  const payload = (await response.json()) as ApiEnvelope<T>;
  if (response.ok && payload.ok) {
    return payload.data as T;
  }

  const failure = payload as ApiFailureEnvelope;
  throw new ApiError(failure.error ?? "REQUEST_FAILED", {
      status: response.status,
      issues: failure.issues,
      fieldErrors: failure.fieldErrors,
    });
}

export async function apiGet<T>(url: string) {
  const response = await fetch(url, {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
  });
  return parseResponse<T>(response);
}

export async function apiSend<T>(url: string, method: "POST" | "PATCH" | "DELETE", body?: unknown) {
  const response = await fetch(url, {
    method,
    credentials: "same-origin",
    cache: "no-store",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  return parseResponse<T>(response);
}

export function useApiData<T>(url: string, initial: T) {
  const [data, setData] = useState<T>(initial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const next = await apiGet<T>(url);
      setData(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "LOAD_FAILED");
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, setData, loading, error, reload };
}
