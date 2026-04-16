"use client";

import { useMemo, useState } from "react";
import { BookOpen, Clock, Filter, History, MessageSquare, RefreshCw, Save } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import type { DashboardHistoryResponse } from "@/lib/contracts/dashboard";
import { activityLevelMeta } from "@/lib/client/presentation";

type ActivityType = DashboardHistoryResponse["activities"][number]["type"];
type FilterKey = "all" | ActivityType;

const filterTabs = [
  { key: "all", label: "Все" },
  { key: "translation", label: "Переводы" },
  { key: "word", label: "Слова" },
  { key: "phrase", label: "Фразы" },
  { key: "system", label: "Система" },
] as const satisfies Array<{ key: FilterKey; label: string }>;

const iconMap: Record<ActivityType, LucideIcon> = {
  translation: BookOpen,
  word: Save,
  phrase: MessageSquare,
  system: RefreshCw,
};

export function HistoryClient({
  data,
}: {
  data: DashboardHistoryResponse;
}) {
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");

  const filtered = useMemo(
    () => (activeFilter === "all" ? data.activities : data.activities.filter((entry) => entry.type === activeFilter)),
    [activeFilter, data.activities],
  );

  const grouped = filtered.reduce<Record<string, DashboardHistoryResponse["activities"]>>((accumulator, entry) => {
    if (!accumulator[entry.date]) {
      accumulator[entry.date] = [];
    }
    accumulator[entry.date].push(entry);
    return accumulator;
  }, {});

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
          <History className="h-6 w-6 text-accent" />
          История действий
        </h1>
        <p className="mt-1 text-sm text-foreground-muted">
          Журнал переводов, обновлений словаря, синхронизаций и системных событий.
        </p>
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 shrink-0 text-foreground-muted" />
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveFilter(tab.key)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors duration-200 ${
                activeFilter === tab.key
                  ? "bg-accent text-white"
                  : "text-foreground-secondary hover:bg-background-hover hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </Card>

      <div className="space-y-6">
        {Object.entries(grouped).map(([date, entries]) => (
          <div key={date}>
            <div className="mb-3 flex items-center gap-3">
              <span className="text-sm font-semibold text-foreground-secondary">{date}</span>
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-foreground-muted">{entries.length} событий</span>
            </div>
            <div className="space-y-2">
              {entries.map((entry) => {
                const Icon = iconMap[entry.type] ?? RefreshCw;
                const levelMeta = activityLevelMeta[entry.level];

                return (
                  <Card key={entry.id} hover className="!p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-light">
                        <Icon className="h-4.5 w-4.5 text-accent" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-foreground">{entry.description}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <Badge variant={levelMeta.variant}>{levelMeta.label}</Badge>
                        <span className="flex items-center gap-1 text-xs text-foreground-muted">
                          <Clock className="h-3 w-3" />
                          {entry.timestamp}
                        </span>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card className="py-12 text-center">
          <History className="mx-auto mb-3 h-10 w-10 text-foreground-muted" />
          <p className="text-foreground-secondary">Нет записей для выбранного фильтра.</p>
        </Card>
      ) : null}
    </div>
  );
}
