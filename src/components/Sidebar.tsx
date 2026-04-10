"use client";

import { useState } from "react";
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
  Menu,
  X,
  ChevronRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

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
};

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-5 border-b border-border shrink-0">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg text-foreground">
          <span className="text-accent">NVL</span> Translate
        </Link>
        <button
          onClick={onClose}
          className="lg:hidden p-1 text-foreground-muted hover:text-foreground transition-colors"
          aria-label="Закрыть меню"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Nav items */}
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
              {active && <ChevronRight className="w-4 h-4 ml-auto" />}
            </Link>
          );
        })}
      </nav>

      {/* User info block */}
      <div className="p-4 border-t border-border shrink-0">
        <div className="bg-background-hover rounded-lg p-3">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-accent-light flex items-center justify-center text-accent text-sm font-bold">
              U
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">Пользователь</p>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-accent-light text-accent">
                Бесплатный
              </span>
            </div>
          </div>
          <div className="mt-2">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-foreground-muted">Лимит слов</span>
              <span className="text-foreground-secondary">42 / 100</span>
            </div>
            <div className="w-full h-1.5 bg-background rounded-full overflow-hidden">
              <div className="h-full bg-accent rounded-full" style={{ width: "42%" }} />
            </div>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
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
