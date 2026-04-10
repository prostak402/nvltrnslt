"use client";

import { useState } from "react";
import { Menu, User } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 shrink-0 border-b border-border bg-background-secondary flex items-center justify-between px-4 sm:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 text-foreground-secondary hover:text-foreground transition-colors"
            aria-label="Открыть меню"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="hidden lg:block" />

          <div className="flex items-center gap-4">
            {/* Limit counter */}
            <div className="hidden sm:flex items-center gap-2 text-sm">
              <span className="text-foreground-muted">Слов:</span>
              <span className="text-foreground-secondary font-medium">42 / 100</span>
            </div>

            {/* Plan badge */}
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-accent-light text-accent">
              Бесплатный
            </span>

            {/* User avatar */}
            <button className="w-8 h-8 rounded-full bg-background-hover border border-border flex items-center justify-center text-foreground-secondary hover:text-foreground transition-colors">
              <User className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
