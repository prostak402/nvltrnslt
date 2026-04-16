"use client";

import Link from "next/link";
import { Languages, Lock, RotateCcw, ShieldCheck } from "lucide-react";
import { useState } from "react";

import { apiSend, getApiFieldError, isApiError } from "@/lib/client/api";

export default function ResetPasswordClient({
  initialToken,
}: {
  initialToken: string;
}) {
  const [token] = useState(initialToken);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<{
    token?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});
  const [serverError, setServerError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setServerError("");
    setErrors({});

    const nextErrors: typeof errors = {};

    if (!token) {
      nextErrors.token = "Ссылка восстановления недействительна";
    }

    if (!newPassword) {
      nextErrors.newPassword = "Введите новый пароль";
    } else if (newPassword.length < 6) {
      nextErrors.newPassword = "Пароль должен быть не короче 6 символов";
    }

    if (!confirmPassword) {
      nextErrors.confirmPassword = "Подтвердите новый пароль";
    } else if (confirmPassword !== newPassword) {
      nextErrors.confirmPassword = "Пароли не совпадают";
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    try {
      setIsSubmitting(true);
      await apiSend("/api/auth/reset-password", "POST", {
        token,
        newPassword,
        confirmPassword,
      });
      setIsSuccess(true);
    } catch (error) {
      if (isApiError(error)) {
        const tokenError = getApiFieldError(error, "token");
        const newPasswordError = getApiFieldError(error, "newPassword");
        const confirmPasswordError = getApiFieldError(error, "confirmPassword");

        setErrors({
          token: tokenError ?? undefined,
          newPassword: newPasswordError ?? undefined,
          confirmPassword: confirmPasswordError ?? undefined,
        });

        if (!tokenError && !newPasswordError && !confirmPasswordError) {
          setServerError(error.message);
        }
      } else {
        setServerError(
          error instanceof Error
            ? error.message
            : "Не удалось завершить сброс пароля",
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
          Новый пароль
        </h1>

        {isSuccess ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm text-foreground">
              <p className="font-medium text-success">Пароль обновлен</p>
              <p className="mt-1 text-foreground-secondary">
                Теперь можно войти в аккаунт с новым паролем.
              </p>
            </div>

            <Link
              href="/auth/login"
              className="flex w-full items-center justify-center rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition hover:bg-accent-hover"
            >
              Перейти ко входу
            </Link>
          </div>
        ) : (
          <>
            <p className="mb-6 text-center text-sm text-foreground-muted">
              Установите новый пароль для доступа к аккаунту.
            </p>

            {errors.token ? (
              <div className="mb-5 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
                {errors.token}
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="newPassword"
                  className="mb-1.5 block text-sm font-medium text-foreground-secondary"
                >
                  Новый пароль
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-muted" />
                  <input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    placeholder="••••••••"
                    className={`w-full rounded-lg border bg-background-secondary py-2.5 pl-10 pr-4 text-foreground placeholder:text-foreground-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/50 ${
                      errors.newPassword ? "border-danger" : "border-border"
                    }`}
                  />
                </div>
                {errors.newPassword ? (
                  <p className="mt-1 text-sm text-danger">{errors.newPassword}</p>
                ) : null}
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="mb-1.5 block text-sm font-medium text-foreground-secondary"
                >
                  Подтверждение пароля
                </label>
                <div className="relative">
                  <ShieldCheck className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-muted" />
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="••••••••"
                    className={`w-full rounded-lg border bg-background-secondary py-2.5 pl-10 pr-4 text-foreground placeholder:text-foreground-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/50 ${
                      errors.confirmPassword ? "border-danger" : "border-border"
                    }`}
                  />
                </div>
                {errors.confirmPassword ? (
                  <p className="mt-1 text-sm text-danger">{errors.confirmPassword}</p>
                ) : null}
              </div>

              {serverError ? (
                <p className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
                  {serverError}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting || Boolean(errors.token)}
                className="w-full cursor-pointer rounded-lg bg-accent py-2.5 font-medium text-white transition hover:bg-accent-hover disabled:opacity-60"
              >
                {isSubmitting ? "Обновляем пароль..." : "Сохранить новый пароль"}
              </button>
            </form>

            <div className="mt-6 flex items-center justify-between text-sm">
              <Link href="/auth/login" className="text-accent transition hover:text-accent-hover">
                Ко входу
              </Link>
              <Link
                href="/auth/forgot-password"
                className="flex items-center gap-1 text-foreground-muted transition hover:text-foreground-secondary"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Запросить новую ссылку
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
