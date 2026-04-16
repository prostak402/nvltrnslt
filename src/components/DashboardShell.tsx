"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Menu, User } from "lucide-react";

import { Sidebar } from "@/components/Sidebar";
import { apiSend } from "@/lib/client/api";
import type { DashboardShellSummary } from "@/lib/contracts/dashboard";
import type { SessionSummary } from "@/lib/contracts/session";
import { planLabel } from "@/lib/client/presentation";

export function DashboardShell({
  children,
  session,
  shellSummary,
}: {
  children: React.ReactNode;
  session: SessionSummary;
  shellSummary: DashboardShellSummary;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await apiSend("/api/auth/logout", "POST");
      router.push("/auth/login");
      router.refresh();
    } finally {
      setIsLoggingOut(false);
    }
  };

  const user = session.user;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        user={user}
        shellSummary={shellSummary}
        onLogout={handleLogout}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-background-secondary px-4 sm:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 text-foreground-secondary transition-colors hover:text-foreground lg:hidden"
            aria-label="Открыть меню"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="hidden lg:block">
            <p className="text-sm font-medium text-foreground">
              {user?.name ?? "Личный кабинет"}
            </p>
            <p className="text-xs text-foreground-muted">
              {user?.email ?? "Синхронизация словаря, прогресса и устройств"}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden items-center gap-2 text-sm sm:flex">
              <span className="text-foreground-muted">Тариф:</span>
              <span className="font-medium text-foreground-secondary">
                {user ? planLabel(user.plan) : "Загрузка..."}
              </span>
            </div>

            <span className="inline-flex items-center rounded-full bg-accent-light px-2.5 py-0.5 text-xs font-medium text-accent">
              {user ? planLabel(user.plan) : "Загрузка..."}
            </span>

            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              title="Выйти"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background-hover text-foreground-secondary transition-colors hover:text-foreground disabled:opacity-60"
            >
              <User className="h-4 w-4" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
