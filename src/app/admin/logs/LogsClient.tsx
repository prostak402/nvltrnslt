"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle,
  Clock,
  CreditCard,
  Globe,
  GraduationCap,
  LifeBuoy,
  MessageSquare,
  RefreshCw,
  Search,
  Shield,
  User,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { AdminLogEntry } from "@/lib/contracts/admin";

type LogEntry = AdminLogEntry;

const typeConfig: Record<LogEntry["type"], { label: string; icon: LucideIcon; className: string }> = {
  translation: { label: "Перевод", icon: Globe, className: "text-accent" },
  word: { label: "Слово", icon: BookOpen, className: "text-accent-secondary" },
  phrase: { label: "Фраза", icon: MessageSquare, className: "text-accent" },
  review: { label: "Повторение", icon: GraduationCap, className: "text-success" },
  sync: { label: "Синхронизация", icon: RefreshCw, className: "text-foreground-secondary" },
  auth: { label: "Авторизация", icon: User, className: "text-foreground-secondary" },
  payment: { label: "Оплата", icon: CreditCard, className: "text-success" },
  support: { label: "Поддержка", icon: LifeBuoy, className: "text-warning" },
  system: { label: "Система", icon: Shield, className: "text-foreground-muted" },
};

const levelConfig: Record<LogEntry["level"], { icon: LucideIcon; className: string }> = {
  info: { icon: CheckCircle, className: "text-foreground-muted" },
  success: { icon: CheckCircle, className: "text-success" },
  warning: { icon: AlertTriangle, className: "text-warning" },
  error: { icon: XCircle, className: "text-danger" },
};

const tabs: Array<{ value: "all" | LogEntry["type"]; label: string }> = [
  { value: "all", label: "Все" },
  { value: "translation", label: "Переводы" },
  { value: "word", label: "Слова" },
  { value: "phrase", label: "Фразы" },
  { value: "review", label: "Повторения" },
  { value: "sync", label: "Синхронизация" },
  { value: "auth", label: "Авторизация" },
  { value: "payment", label: "Оплата" },
  { value: "support", label: "Поддержка" },
  { value: "system", label: "Система" },
];

export default function LogsClient({
  data,
  error,
}: {
  data: LogEntry[];
  error?: string | null;
}) {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]["value"]>("all");
  const [filterLevel, setFilterLevel] = useState<"all" | LogEntry["level"]>("all");

  const filtered = useMemo(
    () =>
      data.filter((entry) => {
        const term = search.trim().toLowerCase();
        if (
          term &&
          !entry.action.toLowerCase().includes(term) &&
          !entry.detail.toLowerCase().includes(term) &&
          !(entry.userName ?? "").toLowerCase().includes(term) &&
          !String(entry.userId ?? "").includes(term)
        ) {
          return false;
        }
        if (activeTab !== "all" && entry.type !== activeTab) {
          return false;
        }
        if (filterLevel !== "all" && entry.level !== filterLevel) {
          return false;
        }
        return true;
      }),
    [activeTab, data, filterLevel, search],
  );

  const errorCount = data.filter((entry) => entry.level === "error").length;
  const warningCount = data.filter((entry) => entry.level === "warning").length;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">Системные логи</h1>
        <div className="flex items-center gap-3 text-sm">
          <span className="flex items-center gap-1.5 text-danger">
            <XCircle className="w-4 h-4" /> {errorCount} ошибок
          </span>
          <span className="flex items-center gap-1.5 text-warning">
            <AlertTriangle className="w-4 h-4" /> {warningCount} предупреждений
          </span>
        </div>
      </div>

      {error ? (
        <div className="mb-6 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          Не удалось загрузить логи: {error}
        </div>
      ) : null}

      <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setActiveTab(tab.value)}
            className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors ${
              activeTab === tab.value
                ? "bg-accent text-white"
                : "bg-background-card text-foreground-secondary hover:bg-background-hover"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
          <input
            type="text"
            placeholder="Поиск по действию, деталям, пользователю или ID..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-background-card border border-border rounded-lg text-sm text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-accent"
          />
        </div>
        <select
          value={filterLevel}
          onChange={(event) => setFilterLevel(event.target.value as "all" | LogEntry["level"])}
          className="px-3 py-2.5 bg-background-card border border-border rounded-lg text-sm text-foreground appearance-none cursor-pointer focus:outline-none focus:border-accent"
        >
          <option value="all">Все уровни</option>
          <option value="info">Информация</option>
          <option value="success">Успех</option>
          <option value="warning">Предупреждение</option>
          <option value="error">Ошибка</option>
        </select>
      </div>

      <div className="space-y-1">
        {filtered.map((entry) => {
          const typeMeta = typeConfig[entry.type] ?? typeConfig.system;
          const levelMeta = levelConfig[entry.level];
          const TypeIcon = typeMeta.icon;
          const LevelIcon = levelMeta.icon;

          return (
            <div
              key={entry.id}
              className={`flex items-start gap-3 px-4 py-3 rounded-lg transition-colors hover:bg-background-card ${
                entry.level === "error" ? "bg-danger-light/30" : entry.level === "warning" ? "bg-warning/5" : ""
              }`}
            >
              <LevelIcon className={`w-4 h-4 mt-0.5 shrink-0 ${levelMeta.className}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`flex items-center gap-1 text-xs ${typeMeta.className}`}>
                    <TypeIcon className="w-3 h-3" />
                    {typeMeta.label}
                  </span>
                  <span className="text-sm font-medium">{entry.action}</span>
                  {entry.userName ? (
                    <span className="text-xs text-foreground-muted">
                      — {entry.userName}
                      {entry.userId ? ` (#${entry.userId})` : ""}
                    </span>
                  ) : null}
                </div>
                <p className="text-xs text-foreground-muted mt-0.5 break-words">{entry.detail}</p>
              </div>
              <span className="text-xs text-foreground-muted whitespace-nowrap shrink-0 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {entry.timestamp}
              </span>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-foreground-muted">Нет записей по выбранным фильтрам.</div>
      ) : null}
    </div>
  );
}
