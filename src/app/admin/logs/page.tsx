"use client";

import { useState } from "react";
import {
  Search,
  Globe,
  BookOpen,
  MessageSquare,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  User,
  CreditCard,
  Shield,
  Clock,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface LogEntry {
  id: number;
  type: "translation" | "word" | "phrase" | "sync" | "auth" | "payment" | "system" | "error";
  action: string;
  userId?: number;
  userName?: string;
  detail: string;
  timestamp: string;
  level: "info" | "warning" | "error" | "success";
}

const typeConfig: Record<string, { label: string; icon: LucideIcon; cls: string }> = {
  translation: { label: "Перевод", icon: Globe, cls: "text-accent" },
  word: { label: "Слово", icon: BookOpen, cls: "text-accent-secondary" },
  phrase: { label: "Фраза", icon: MessageSquare, cls: "text-accent" },
  sync: { label: "Синхронизация", icon: RefreshCw, cls: "text-foreground-secondary" },
  auth: { label: "Авторизация", icon: User, cls: "text-foreground-secondary" },
  payment: { label: "Оплата", icon: CreditCard, cls: "text-success" },
  system: { label: "Система", icon: Shield, cls: "text-foreground-muted" },
  error: { label: "Ошибка", icon: AlertTriangle, cls: "text-danger" },
};

const levelIcons: Record<string, { icon: LucideIcon; cls: string }> = {
  info: { icon: CheckCircle, cls: "text-foreground-muted" },
  success: { icon: CheckCircle, cls: "text-success" },
  warning: { icon: AlertTriangle, cls: "text-warning" },
  error: { icon: XCircle, cls: "text-danger" },
};

const mockLogs: LogEntry[] = [
  { id: 1, type: "translation", action: "Перевод слова", userId: 1002, userName: "Мария Иванова", detail: "reluctant → неохотный (DDLC)", timestamp: "10.04.2026 16:42:15", level: "info" },
  { id: 2, type: "word", action: "Сохранение слова", userId: 1002, userName: "Мария Иванова", detail: "reluctant добавлено в словарь", timestamp: "10.04.2026 16:42:18", level: "success" },
  { id: 3, type: "sync", action: "Синхронизация", userId: 1002, userName: "Мария Иванова", detail: "3 слова синхронизированы", timestamp: "10.04.2026 16:42:20", level: "success" },
  { id: 4, type: "error", action: "Ошибка перевода", userId: 1005, userName: "Андрей Волков", detail: "API timeout: translation request exceeded 5s limit", timestamp: "10.04.2026 16:40:03", level: "error" },
  { id: 5, type: "auth", action: "Вход в аккаунт", userId: 1008, userName: "Анна Кузнецова", detail: "Успешный вход с IP 185.42.xxx.xxx", timestamp: "10.04.2026 16:38:45", level: "info" },
  { id: 6, type: "payment", action: "Оплата подписки", userId: 1006, userName: "Ольга Новикова", detail: "Базовый тариф: $4.99 — оплата прошла", timestamp: "10.04.2026 16:35:12", level: "success" },
  { id: 7, type: "translation", action: "Перевод фразы", userId: 1008, userName: "Анна Кузнецова", detail: "\"I can't believe you would...\" (Katawa Shoujo)", timestamp: "10.04.2026 16:33:28", level: "info" },
  { id: 8, type: "phrase", action: "Сохранение фразы", userId: 1008, userName: "Анна Кузнецова", detail: "Фраза сохранена (42 символа)", timestamp: "10.04.2026 16:33:30", level: "success" },
  { id: 9, type: "error", action: "Ошибка синхронизации", userId: 1003, userName: "Дмитрий Козлов", detail: "Connection reset: sync failed after 3 retries", timestamp: "10.04.2026 16:30:15", level: "error" },
  { id: 10, type: "system", action: "Очистка кэша", detail: "Автоматическая очистка кэша переводов (14,200 записей)", timestamp: "10.04.2026 16:00:00", level: "info" },
  { id: 11, type: "auth", action: "Неудачная попытка входа", detail: "Email: unknown@test.com — неверный пароль (3/5)", timestamp: "10.04.2026 15:58:42", level: "warning" },
  { id: 12, type: "payment", action: "Неудачная оплата", userId: 1009, userName: "Сергей Морозов", detail: "Карта отклонена: insufficient funds", timestamp: "10.04.2026 15:45:33", level: "error" },
  { id: 13, type: "translation", action: "Перевод слова", userId: 1010, userName: "Наталья Белова", detail: "embrace → обнять (Katawa Shoujo)", timestamp: "10.04.2026 15:42:10", level: "info" },
  { id: 14, type: "sync", action: "Синхронизация", userId: 1001, userName: "Алексей Петров", detail: "7 слов, 2 фразы синхронизированы", timestamp: "10.04.2026 15:40:05", level: "success" },
  { id: 15, type: "system", action: "Обновление лимитов", detail: "Дневные лимиты сброшены для 1,247 пользователей", timestamp: "10.04.2026 00:00:01", level: "info" },
  { id: 16, type: "auth", action: "Регистрация", userId: 1014, userName: "Виктория Лебедева", detail: "Новый аккаунт создан", timestamp: "09.04.2026 23:15:20", level: "success" },
  { id: 17, type: "error", action: "Ошибка API", detail: "Google Translate API: rate limit exceeded (429)", timestamp: "09.04.2026 22:10:05", level: "error" },
  { id: 18, type: "system", action: "Бэкап БД", detail: "Ежедневный бэкап завершён (size: 2.4GB)", timestamp: "09.04.2026 03:00:15", level: "success" },
  { id: 19, type: "auth", action: "Блокировка пользователя", userId: 1004, userName: "Екатерина Смирнова", detail: "Заблокирована администратором (причина: злоупотребление API)", timestamp: "09.04.2026 14:20:00", level: "warning" },
  { id: 20, type: "payment", action: "Возврат средств", userId: 1011, userName: "Павел Соколов", detail: "Возврат $4.99 — запрос пользователя", timestamp: "09.04.2026 11:05:30", level: "warning" },
];

const tabs = [
  { value: "all", label: "Все" },
  { value: "translation", label: "Переводы" },
  { value: "word", label: "Слова" },
  { value: "phrase", label: "Фразы" },
  { value: "sync", label: "Синхронизация" },
  { value: "auth", label: "Авторизация" },
  { value: "payment", label: "Оплата" },
  { value: "system", label: "Система" },
  { value: "error", label: "Ошибки" },
];

export default function LogsPage() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [filterLevel, setFilterLevel] = useState("all");

  const filtered = mockLogs.filter((l) => {
    if (search) {
      const q = search.toLowerCase();
      if (!l.action.toLowerCase().includes(q) && !l.detail.toLowerCase().includes(q) && !(l.userName || "").toLowerCase().includes(q)) return false;
    }
    if (activeTab !== "all" && l.type !== activeTab) return false;
    if (filterLevel !== "all" && l.level !== filterLevel) return false;
    return true;
  });

  const errorCount = mockLogs.filter((l) => l.level === "error").length;
  const warningCount = mockLogs.filter((l) => l.level === "warning").length;

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

      {/* Tabs */}
      <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors ${
              activeTab === tab.value
                ? "bg-accent text-white"
                : "bg-background-card text-foreground-secondary hover:bg-background-hover"
            }`}
          >
            {tab.label}
            {tab.value === "error" && errorCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-xs bg-danger text-white">{errorCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* Search + filter */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
          <input
            type="text"
            placeholder="Поиск по действию, деталям или пользователю..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-background-card border border-border rounded-lg text-sm text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-accent"
          />
        </div>
        <select
          value={filterLevel}
          onChange={(e) => setFilterLevel(e.target.value)}
          className="px-3 py-2.5 bg-background-card border border-border rounded-lg text-sm text-foreground appearance-none cursor-pointer focus:outline-none focus:border-accent"
        >
          <option value="all">Все уровни</option>
          <option value="info">Информация</option>
          <option value="success">Успех</option>
          <option value="warning">Предупреждение</option>
          <option value="error">Ошибка</option>
        </select>
      </div>

      {/* Log list */}
      <div className="space-y-1">
        {filtered.map((log) => {
          const tc = typeConfig[log.type];
          const lc = levelIcons[log.level];
          const TypeIcon = tc.icon;
          const LevelIcon = lc.icon;

          return (
            <div
              key={log.id}
              className={`flex items-start gap-3 px-4 py-3 rounded-lg transition-colors hover:bg-background-card ${
                log.level === "error" ? "bg-danger-light/30" : log.level === "warning" ? "bg-warning/5" : ""
              }`}
            >
              <LevelIcon className={`w-4 h-4 mt-0.5 shrink-0 ${lc.cls}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`flex items-center gap-1 text-xs ${tc.cls}`}>
                    <TypeIcon className="w-3 h-3" />
                    {tc.label}
                  </span>
                  <span className="text-sm font-medium">{log.action}</span>
                  {log.userName && (
                    <span className="text-xs text-foreground-muted">
                      — {log.userName} (#{log.userId})
                    </span>
                  )}
                </div>
                <p className="text-xs text-foreground-muted mt-0.5 truncate">{log.detail}</p>
              </div>
              <span className="text-xs text-foreground-muted whitespace-nowrap shrink-0 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {log.timestamp}
              </span>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-foreground-muted">
          Нет записей по выбранным фильтрам
        </div>
      )}
    </div>
  );
}
