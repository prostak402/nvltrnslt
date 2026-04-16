"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

import type { SessionSummary } from "@/lib/contracts/session";

const navLinks = [
  { label: "Как это работает", href: "/#how-it-works" },
  { label: "Тарифы", href: "/#pricing" },
  { label: "Совместимость", href: "/#compatibility" },
  { label: "Скачать мод", href: "/#download" },
];

type HeaderProps = {
  session: SessionSummary;
};

export function Header({ session }: HeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const ctaHref = session.user
    ? session.user.role === "admin"
      ? "/admin"
      : "/dashboard"
    : "/auth/login";
  const ctaLabel = session.user
    ? session.user.role === "admin"
      ? "Админка"
      : "Личный кабинет"
    : "Войти";

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-bold text-lg text-foreground">
            <span className="text-accent">NV</span> Lingo
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-foreground-secondary hover:text-foreground transition-colors duration-200"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center">
            <Link
              href={ctaHref}
              className="px-4 py-2 text-sm font-medium border border-border rounded-lg text-foreground hover:border-border-hover hover:bg-background-hover transition-colors duration-200"
            >
              {ctaLabel}
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 text-foreground-secondary hover:text-foreground transition-colors"
            aria-label="Меню"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-background/95 backdrop-blur-lg">
          <div className="px-4 py-4 space-y-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="block text-sm text-foreground-secondary hover:text-foreground transition-colors py-2"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href={ctaHref}
              onClick={() => setMobileOpen(false)}
              className="block text-center px-4 py-2 text-sm font-medium border border-border rounded-lg text-foreground hover:border-border-hover hover:bg-background-hover transition-colors duration-200"
            >
              {ctaLabel}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
