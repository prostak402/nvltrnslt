"use client";

import { useState } from "react";
import Link from "next/link";
import { Languages, Mail, Lock } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>(
    {}
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const newErrors: typeof errors = {};

    if (!email) newErrors.email = "Введите электронную почту";
    else if (!/\S+@\S+\.\S+/.test(email))
      newErrors.email = "Некорректный адрес электронной почты";

    if (!password) newErrors.password = "Введите пароль";
    else if (password.length < 6)
      newErrors.password = "Пароль должен быть не менее 6 символов";

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      // No actual auth logic
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="bg-background-card border border-border rounded-2xl p-8 shadow-lg">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <Languages className="w-8 h-8 text-accent" />
          <span className="text-2xl font-bold text-foreground">
            NVL Translate
          </span>
        </div>

        <h1 className="text-xl font-semibold text-foreground text-center mb-6">
          Вход в аккаунт
        </h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-foreground-secondary mb-1.5"
            >
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
            {errors.email && (
              <p className="mt-1 text-sm text-danger">{errors.email}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-foreground-secondary mb-1.5"
            >
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
            {errors.password && (
              <p className="mt-1 text-sm text-danger">{errors.password}</p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="w-full py-2.5 bg-accent hover:bg-accent-hover text-white font-medium rounded-lg transition cursor-pointer"
          >
            Войти
          </button>
        </form>

        {/* Links */}
        <div className="mt-6 flex items-center justify-between text-sm">
          <Link
            href="/auth/login"
            className="text-foreground-muted hover:text-foreground-secondary transition"
          >
            Забыли пароль?
          </Link>
          <Link
            href="/auth/register"
            className="text-accent hover:text-accent-hover transition"
          >
            Создать аккаунт
          </Link>
        </div>
      </div>
    </div>
  );
}
