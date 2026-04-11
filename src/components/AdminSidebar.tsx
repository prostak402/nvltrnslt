"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  MessageSquare,
  BarChart3,
  Gamepad2,
  ScrollText,
  Settings,
  X,
  ChevronRight,
  Shield,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

const navItems: NavItem[] = [
  { label: "Дашборд", href: "/admin", icon: LayoutDashboard },
  { label: "Пользователи", href: "/admin/users", icon: Users },
  { label: "Подписки", href: "/admin/subscriptions", icon: CreditCard },
  { label: "Тикеты", href: "/admin/tickets", icon: MessageSquare },
  { label: "Аналитика", href: "/admin/analytics", icon: BarChart3 },
  { label: "Совместимость", href: "/admin/compatibility", icon: Gamepad2 },
  { label: "Логи", href: "/admin/logs", icon: ScrollText },
  { label: "Настройки", href: "/admin/settings", icon: Settings },
];

type AdminSidebarProps = {
  open: boolean;
  onClose: () => void;
};

export function AdminSidebar({ open, onClose }: AdminSidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  };

  const sidebarContent = (
    <>
      <div className="flex items-center justify-between h-16 px-5 border-b border-border shrink-0">
        <Link href="/admin" className="flex items-center gap-2 font-bold text-lg text-foreground">
          <Shield className="w-5 h-5 text-danger" />
          <span className="text-danger">Admin</span>
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
                  ? "bg-danger-light text-danger"
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

      <div className="p-4 border-t border-border shrink-0">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-foreground-secondary hover:text-foreground hover:bg-background-hover transition-colors"
        >
          <LayoutDashboard className="w-4 h-4" />
          Кабинет пользователя
        </Link>
        <div className="mt-3 bg-background-hover rounded-lg p-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-danger-light flex items-center justify-center text-danger text-sm font-bold">
              A
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">Администратор</p>
              <span className="text-xs text-foreground-muted">admin@nvltranslate.com</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}
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
