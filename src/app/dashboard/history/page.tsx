"use client";

import { useState } from "react";
import {
  History,
  BookOpen,
  MessageSquare,
  RefreshCw,
  Settings,
  Download,
  Save,
  Trash2,
  Star,
  CheckCircle,
  AlertTriangle,
  Clock,
  Filter,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

type ActivityType = "translation" | "word" | "phrase" | "system";

type ActivityEntry = {
  id: number;
  type: ActivityType;
  icon: LucideIcon;
  description: string;
  timestamp: string;
  date: string;
};

type FilterTab = {
  key: "all" | ActivityType;
  label: string;
};

const filterTabs: FilterTab[] = [
  { key: "all", label: "Все" },
  { key: "translation", label: "Переводы" },
  { key: "word", label: "Слова" },
  { key: "phrase", label: "Фразы" },
  { key: "system", label: "Система" },
];

const typeBadge: Record<ActivityType, { label: string; variant: "accent" | "success" | "warning" | "default" }> = {
  translation: { label: "Перевод", variant: "accent" },
  word: { label: "Слово", variant: "success" },
  phrase: { label: "Фраза", variant: "warning" },
  system: { label: "Система", variant: "default" },
};

const activities: ActivityEntry[] = [
  { id: 1, type: "translation", icon: BookOpen, description: "Переведено слово: reluctant", timestamp: "14:32", date: "Сегодня" },
  { id: 2, type: "word", icon: Save, description: "Сохранено слово: despair", timestamp: "14:28", date: "Сегодня" },
  { id: 3, type: "phrase", icon: MessageSquare, description: "Сохранена фраза: I can't believe my eyes", timestamp: "14:15", date: "Сегодня" },
  { id: 4, type: "translation", icon: BookOpen, description: "Переведено слово: consciousness", timestamp: "13:50", date: "Сегодня" },
  { id: 5, type: "system", icon: RefreshCw, description: "Синхронизация завершена", timestamp: "13:45", date: "Сегодня" },
  { id: 6, type: "word", icon: Star, description: "Слово помечено как сложное: inevitable", timestamp: "13:30", date: "Сегодня" },
  { id: 7, type: "translation", icon: BookOpen, description: "Переведено слово: perception", timestamp: "12:55", date: "Сегодня" },
  { id: 8, type: "word", icon: Save, description: "Сохранено слово: contradiction", timestamp: "12:40", date: "Сегодня" },
  { id: 9, type: "phrase", icon: MessageSquare, description: "Сохранена фраза: No matter how many times I try", timestamp: "12:20", date: "Сегодня" },
  { id: 10, type: "system", icon: Download, description: "Резервная копия словаря создана", timestamp: "12:00", date: "Сегодня" },
  { id: 11, type: "translation", icon: BookOpen, description: "Переведено слово: magnificent", timestamp: "11:45", date: "Сегодня" },
  { id: 12, type: "word", icon: CheckCircle, description: "Слово выучено: embrace", timestamp: "11:30", date: "Сегодня" },
  { id: 13, type: "system", icon: Settings, description: "Настройки обучения обновлены", timestamp: "18:20", date: "Вчера" },
  { id: 14, type: "translation", icon: BookOpen, description: "Переведено слово: melancholy", timestamp: "17:50", date: "Вчера" },
  { id: 15, type: "word", icon: Save, description: "Сохранено слово: resilience", timestamp: "17:35", date: "Вчера" },
  { id: 16, type: "phrase", icon: MessageSquare, description: "Сохранена фраза: The truth we seek is hidden in plain sight", timestamp: "17:10", date: "Вчера" },
  { id: 17, type: "word", icon: Trash2, description: "Удалено слово: miscellaneous", timestamp: "16:55", date: "Вчера" },
  { id: 18, type: "translation", icon: BookOpen, description: "Переведено слово: ephemeral", timestamp: "16:30", date: "Вчера" },
  { id: 19, type: "system", icon: RefreshCw, description: "Синхронизация с устройством завершена", timestamp: "16:00", date: "Вчера" },
  { id: 20, type: "phrase", icon: MessageSquare, description: "Сохранена фраза: Perhaps this world is just a dream", timestamp: "15:40", date: "Вчера" },
  { id: 21, type: "word", icon: Star, description: "Слово помечено как сложное: ambiguous", timestamp: "15:20", date: "Вчера" },
  { id: 22, type: "system", icon: AlertTriangle, description: "Ошибка синхронизации — повторная попытка успешна", timestamp: "14:00", date: "Вчера" },
  { id: 23, type: "translation", icon: BookOpen, description: "Переведено слово: serendipity", timestamp: "12:10", date: "2 дня назад" },
  { id: 24, type: "word", icon: Save, description: "Сохранено слово: benevolent", timestamp: "11:45", date: "2 дня назад" },
];

export default function HistoryPage() {
  const [activeFilter, setActiveFilter] = useState<"all" | ActivityType>("all");

  const filtered = activeFilter === "all"
    ? activities
    : activities.filter((a) => a.type === activeFilter);

  const grouped = filtered.reduce<Record<string, ActivityEntry[]>>((acc, entry) => {
    if (!acc[entry.date]) acc[entry.date] = [];
    acc[entry.date].push(entry);
    return acc;
  }, {});

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <History className="w-6 h-6 text-accent" />
          История действий
        </h1>
        <p className="text-sm text-foreground-muted mt-1">Полный журнал ваших действий в системе</p>
      </div>

      {/* Filter tabs */}
      <Card>
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-foreground-muted shrink-0" />
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-200 ${
                activeFilter === tab.key
                  ? "bg-accent text-white"
                  : "text-foreground-secondary hover:text-foreground hover:bg-background-hover"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Timeline */}
      <div className="space-y-6">
        {Object.entries(grouped).map(([date, entries]) => (
          <div key={date}>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-sm font-semibold text-foreground-secondary">{date}</span>
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-foreground-muted">{entries.length} действий</span>
            </div>
            <div className="space-y-2">
              {entries.map((entry) => {
                const Icon = entry.icon;
                const badge = typeBadge[entry.type];
                return (
                  <Card key={entry.id} hover className="!p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-9 h-9 rounded-lg bg-accent-light flex items-center justify-center shrink-0">
                        <Icon className="w-4.5 h-4.5 text-accent" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground truncate">{entry.description}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                        <span className="text-xs text-foreground-muted flex items-center gap-1">
                          <Clock className="w-3 h-3" />
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

      {filtered.length === 0 && (
        <Card className="text-center py-12">
          <History className="w-10 h-10 text-foreground-muted mx-auto mb-3" />
          <p className="text-foreground-secondary">Нет записей для выбранного фильтра</p>
        </Card>
      )}
    </div>
  );
}
