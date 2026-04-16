"use client";

import Link from "next/link";
import { Languages, Mail, RotateCcw } from "lucide-react";
import { useState } from "react";

import { apiSend, getApiFieldError, isApiError } from "@/lib/client/api";

type ForgotPasswordResponse = {
  accepted: boolean;
  delivery: "preview-link";
  previewUrl: string;
  expiresAt: string;
  note: string;
};

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [result, setResult] = useState<ForgotPasswordResponse | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setServerError("");
    setEmailError("");

    if (!email) {
      setEmailError("Введите email");
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError("Введите корректный email");
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await apiSend<ForgotPasswordResponse>(
        "/api/auth/forgot-password",
        "POST",
        {
          email: email.trim().toLowerCase(),
        },
      );
      setResult(response);
    } catch (error) {
      if (isApiError(error)) {
        setEmailError(getApiFieldError(error, "email") ?? "");
        if (!getApiFieldError(error, "email")) {
          setServerError(error.message);
        }
      } else {
        setServerError(
          error instanceof Error
            ? error.message
            : "Не удалось запустить восстановление доступа",
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="rounded-2xl border border-border bg-background-card p-8 shadow-lg">
        <div className="mb-8 flex items-center justify-center gap-2">
          <Languages className="h-8 w-8 text-accent" />
          <span className="text-2xl font-bold text-foreground">NVLingo</span>
        </div>

        <h1 className="mb-3 text-center text-xl font-semibold text-foreground">
          Восстановление доступа
        </h1>
        <p className="mb-6 text-center text-sm text-foreground-muted">
          Укажите email аккаунта. В текущей сборке ссылка для сброса показывается
          прямо на сайте вместо отправки письма.
        </p>

        {result ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm text-foreground">
              <p className="font-medium text-success">Запрос принят</p>
              <p className="mt-1 text-foreground-secondary">{result.note}</p>
            </div>

            <a
              href={result.previewUrl}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition hover:bg-accent-hover"
            >
              <Mail className="h-4 w-4" />
              Открыть ссылку сброса
            </a>

            <button
              type="button"
              onClick={() => {
                setResult(null);
                setServerError("");
                setEmailError("");
              }}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm transition hover:bg-background-hover"
            >
              <RotateCcw className="h-4 w-4" />
              Ввести другой email
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm font-medium text-foreground-secondary"
              >
                Электронная почта
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-muted" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  className={`w-full rounded-lg border bg-background-secondary py-2.5 pl-10 pr-4 text-foreground placeholder:text-foreground-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/50 ${
                    emailError ? "border-danger" : "border-border"
                  }`}
                />
              </div>
              {emailError ? <p className="mt-1 text-sm text-danger">{emailError}</p> : null}
            </div>

            {serverError ? (
              <p className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
                {serverError}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full cursor-pointer rounded-lg bg-accent py-2.5 font-medium text-white transition hover:bg-accent-hover disabled:opacity-60"
            >
              {isSubmitting ? "Готовим ссылку..." : "Продолжить"}
            </button>
          </form>
        )}

        <div className="mt-6 flex items-center justify-between text-sm">
          <Link href="/auth/login" className="text-accent transition hover:text-accent-hover">
            Вернуться ко входу
          </Link>
          <Link
            href="/auth/register"
            className="text-foreground-muted transition hover:text-foreground-secondary"
          >
            Создать аккаунт
          </Link>
        </div>
      </div>
    </div>
  );
}
