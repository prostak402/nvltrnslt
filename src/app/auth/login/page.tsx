"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Languages, Mail, Lock } from "lucide-react";

import { apiSend, getApiFieldError, isApiError } from "@/lib/client/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nextErrors: typeof errors = {};
    setServerError("");
    setErrors({});

    if (!email) nextErrors.email = "Введите email";
    else if (!/\S+@\S+\.\S+/.test(email)) nextErrors.email = "Введите корректный email";

    if (!password) nextErrors.password = "Введите пароль";
    else if (password.length < 6) nextErrors.password = "Пароль должен быть не короче 6 символов";

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    try {
      setIsSubmitting(true);
      const result = await apiSend<{
        user: { role: "user" | "admin" };
      }>("/api/auth/login", "POST", {
        email: email.trim(),
        password,
      });
      router.push(result.user.role === "admin" ? "/admin" : "/dashboard");
      router.refresh();
    } catch (error) {
      if (isApiError(error)) {
        const emailError = getApiFieldError(error, "email");
        const passwordError = getApiFieldError(error, "password");

        setErrors({
          email: emailError ?? undefined,
          password: passwordError ?? undefined,
        });

        if (!emailError && !passwordError) {
          setServerError(error.message);
        }
      } else {
        setServerError(error instanceof Error ? error.message : "Не удалось выполнить вход");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="bg-background-card border border-border rounded-2xl p-8 shadow-lg">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Languages className="w-8 h-8 text-accent" />
          <span className="text-2xl font-bold text-foreground">NVLingo</span>
        </div>

        <h1 className="text-xl font-semibold text-foreground text-center mb-6">Вход в аккаунт</h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-foreground-secondary mb-1.5">
              Электронная почта
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={`w-full pl-10 pr-4 py-2.5 bg-background-secondary border rounded-lg text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition ${
                  errors.email ? "border-danger" : "border-border"
                }`}
              />
            </div>
            {errors.email ? <p className="mt-1 text-sm text-danger">{errors.email}</p> : null}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-foreground-secondary mb-1.5">
              Пароль
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={`w-full pl-10 pr-4 py-2.5 bg-background-secondary border rounded-lg text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition ${
                  errors.password ? "border-danger" : "border-border"
                }`}
              />
            </div>
            {errors.password ? <p className="mt-1 text-sm text-danger">{errors.password}</p> : null}
          </div>

          {serverError ? (
            <p className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
              {serverError}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 bg-accent hover:bg-accent-hover text-white font-medium rounded-lg transition cursor-pointer disabled:opacity-60"
          >
            {isSubmitting ? "Входим..." : "Войти"}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-between text-sm">
          <Link href="/auth/forgot-password" className="text-foreground-muted hover:text-foreground-secondary transition">
            Забыли пароль?
          </Link>
          <Link href="/auth/register" className="text-accent hover:text-accent-hover transition">
            Создать аккаунт
          </Link>
        </div>

        <p className="mt-4 text-center text-xs text-foreground-muted">
          Войдите под своей учетной записью или создайте новую на странице регистрации.
        </p>
      </div>
    </div>
  );
}
