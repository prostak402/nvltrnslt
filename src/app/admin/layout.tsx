"use client";

import { useState } from "react";
import { Menu, Shield } from "lucide-react";
import { AdminSidebar } from "@/components/AdminSidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 border-b border-border bg-background-secondary flex items-center justify-between px-4 lg:px-6 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-foreground-muted hover:text-foreground transition-colors"
              aria-label="Открыть меню"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-danger" />
              <span className="text-sm font-medium text-danger">Панель администратора</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-foreground-muted hidden sm:block">Последний вход: сегодня, 10:42</span>
            <div className="w-8 h-8 rounded-full bg-danger-light flex items-center justify-center text-danger text-sm font-bold">
              A
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
