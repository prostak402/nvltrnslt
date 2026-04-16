"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  MessageSquare,
  GraduationCap,
  BarChart3,
  History,
  Monitor,
  CreditCard,
  Settings,
  HelpCircle,
  X,
  ChevronRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { initials, planLabel } from "@/lib/client/presentation";
import type { DashboardShellSummary } from "@/lib/contracts/dashboard";
import type { PlanId, UserRole } from "@/lib/types";

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

const navItems: NavItem[] = [
  { label: "Обзор", href: "/dashboard", icon: LayoutDashboard },
  { label: "Слова", href: "/dashboard/words", icon: BookOpen },
  { label: "Фразы", href: "/dashboard/phrases", icon: MessageSquare },
  { label: "Обучение", href: "/dashboard/learning", icon: GraduationCap },
  { label: "Прогресс", href: "/dashboard/progress", icon: BarChart3 },
  { label: "История", href: "/dashboard/history", icon: History },
  { label: "Устройства", href: "/dashboard/devices", icon: Monitor },
  { label: "Тариф", href: "/dashboard/plan", icon: CreditCard },
  { label: "Настройки", href: "/dashboard/settings", icon: Settings },
  { label: "Поддержка", href: "/dashboard/support", icon: HelpCircle },
];

type SidebarProps = {
  open: boolean;
  onClose: () => void;
  user?: {
    name: string;
    email: string;
    role: UserRole;
    plan: PlanId;
  } | null;
  shellSummary?: DashboardShellSummary | null;
  onLogout?: () => void;
};

export function Sidebar({ open, onClose, user, shellSummary, onLogout }: SidebarProps) {
  const pathname = usePathname();
  const translationsUsed = shellSummary?.translationsUsed ?? 0;
  const translationsLimitLabel = shellSummary?.translationsLimit ?? "∞";
  const translationUsagePercent =
    shellSummary?.translationsLimit === null
      ? 100
      : shellSummary?.translationsLimit
        ? Math.min(
            100,
            Math.round((translationsUsed / shellSummary.translationsLimit) * 100),
          )
        : 0;

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  const sidebarContent = (
    <>
      <div className="flex items-center justify-between h-16 px-5 border-b border-border shrink-0">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg text-foreground">
          <span className="text-accent">NV</span> Lingo
        </Link>
        <button
          onClick={onClose}
          className="lg:hidden p-1 text-foreground-muted hover:text-foreground transition-colors"
          aria-label="Закрыть меню"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200 ${
                active
                  ? "bg-accent-light text-accent"
                  : "text-foreground-secondary hover:text-foreground hover:bg-background-hover"
              }`}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {item.label}
              {active ? <ChevronRight className="w-4 h-4 ml-auto" /> : null}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border shrink-0">
        <div className="bg-background-hover rounded-lg p-3">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-accent-light flex items-center justify-center text-accent text-sm font-bold">
              {user ? initials(user.name) : "U"}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{user?.name ?? "Пользователь"}</p>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-accent-light text-accent">
                {user ? planLabel(user.plan) : "План"}
              </span>
            </div>
          </div>
          <p className="text-xs text-foreground-muted truncate">{user?.email ?? "Авторизуйтесь, чтобы синхронизировать мод"}</p>
          <div className="mt-2">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-foreground-muted">Лимит переводов</span>
              <span className="text-foreground-secondary">
                {translationsUsed} / {translationsLimitLabel}
              </span>
            </div>
            <div className="w-full h-1.5 bg-background rounded-full overflow-hidden">
              <div
                className="h-full bg-accent rounded-full"
                style={{ width: `${translationUsagePercent}%` }}
              />
            </div>
          </div>
          {user?.role === "admin" ? (
            <Link
              href="/admin"
              onClick={onClose}
              className="mt-3 inline-flex text-xs text-accent hover:text-accent-hover transition-colors"
            >
              Открыть админ-панель
            </Link>
          ) : null}
          {onLogout ? (
            <button
              type="button"
              onClick={onLogout}
              className="mt-3 block text-xs text-foreground-secondary hover:text-foreground transition-colors"
            >
              Выйти из аккаунта
            </button>
          ) : null}
        </div>
      </div>
    </>
  );

  return (
    <>
      {open ? <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={onClose} /> : null}

      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-background-secondary border-r border-border flex flex-col transition-transform duration-300 lg:translate-x-0 lg:static lg:z-auto ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
