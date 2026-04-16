"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Menu, Shield } from "lucide-react";

import { AdminSidebar } from "@/components/AdminSidebar";
import { apiSend } from "@/lib/client/api";
import type { SessionSummary } from "@/lib/contracts/session";

export function AdminLayoutShell({
  children,
  session,
}: {
  children: React.ReactNode;
  session: SessionSummary;
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

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AdminSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        user={session.user}
        onLogout={handleLogout}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-background-secondary px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="p-2 text-foreground-muted transition-colors hover:text-foreground lg:hidden"
              aria-label="Открыть меню"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-danger" />
              <span className="text-sm font-medium text-danger">
                Панель администратора
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-foreground-muted sm:block">
              {session.user?.email ?? "admin@nvltranslate.com"}
            </span>
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              title="Выйти"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-danger-light text-sm font-bold text-danger disabled:opacity-60"
            >
              A
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
