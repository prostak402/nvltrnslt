"use client";

import {
  Users,
  CreditCard,
  Globe,
  TrendingUp,
  UserPlus,
  MessageSquare,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";

const stats = [
  { label: "Всего пользователей", value: "1,247", change: "+23", positive: true, icon: Users },
  { label: "Активных сегодня", value: "342", change: "+12%", positive: true, icon: TrendingUp },
  { label: "Новых за неделю", value: "89", change: "+15%", positive: true, icon: UserPlus },
  { label: "Выручка за месяц", value: "$3,842", change: "+8%", positive: true, icon: CreditCard },
  { label: "Переводов сегодня", value: "8,491", change: "-3%", positive: false, icon: Globe },
  { label: "Открытых тикетов", value: "7", change: "+2", positive: false, icon: MessageSquare },
];

const recentUsers = [
  { id: 1, name: "Алексей Петров", email: "alex@mail.ru", plan: "Базовый", registeredAt: "10.04.2026", status: "active" },
  { id: 2, name: "Мария Иванова", email: "maria@gmail.com", plan: "Расширенный", registeredAt: "09.04.2026", status: "active" },
  { id: 3, name: "Дмитрий Козлов", email: "dkozlov@yandex.ru", plan: "Бесплатный", registeredAt: "09.04.2026", status: "active" },
  { id: 4, name: "Екатерина Смирнова", email: "kate.s@mail.ru", plan: "Базовый", registeredAt: "08.04.2026", status: "banned" },
  { id: 5, name: "Андрей Волков", email: "volkov.a@gmail.com", plan: "Бесплатный", registeredAt: "08.04.2026", status: "active" },
];

const recentTickets = [
  { id: 101, user: "Мария Иванова", subject: "Проблема с синхронизацией", status: "open", date: "10.04.2026" },
  { id: 102, user: "Дмитрий Козлов", subject: "Не приходит код доступа", status: "open", date: "09.04.2026" },
  { id: 103, user: "Андрей Волков", subject: "Вопрос об оплате", status: "in_progress", date: "09.04.2026" },
  { id: 104, user: "Иван Сидоров", subject: "Мод не работает с Clannad", status: "resolved", date: "08.04.2026" },
];

const alerts = [
  { text: "Увеличенная задержка API переводов (>2с)", level: "warning" },
  { text: "7 нерассмотренных тикетов поддержки", level: "info" },
  { text: "3 неудачных попытки оплаты за последний час", level: "danger" },
];

const planBadge: Record<string, string> = {
  "Бесплатный": "bg-foreground-muted/20 text-foreground-muted",
  "Базовый": "bg-accent-light text-accent",
  "Расширенный": "bg-accent-secondary-light text-accent-secondary",
};

const statusBadge: Record<string, { label: string; cls: string }> = {
  active: { label: "Активен", cls: "bg-success/15 text-success" },
  banned: { label: "Заблокирован", cls: "bg-danger-light text-danger" },
  inactive: { label: "Неактивен", cls: "bg-foreground-muted/20 text-foreground-muted" },
};

const ticketStatusBadge: Record<string, { label: string; cls: string }> = {
  open: { label: "Открыт", cls: "bg-warning/15 text-warning" },
  in_progress: { label: "В работе", cls: "bg-accent-light text-accent" },
  resolved: { label: "Решён", cls: "bg-success/15 text-success" },
};

export default function AdminDashboard() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Дашборд</h1>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2 mb-6">
          {alerts.map((alert, i) => (
            <div
              key={i}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-sm ${
                alert.level === "danger"
                  ? "bg-danger-light border-danger/30 text-danger"
                  : alert.level === "warning"
                  ? "bg-warning/10 border-warning/30 text-warning"
                  : "bg-accent-light border-accent/30 text-accent"
              }`}
            >
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {alert.text}
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-background-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <Icon className="w-4 h-4 text-foreground-muted" />
                <span className={`flex items-center gap-0.5 text-xs font-medium ${s.positive ? "text-success" : "text-danger"}`}>
                  {s.positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {s.change}
                </span>
              </div>
              <p className="text-xl font-bold">{s.value}</p>
              <p className="text-xs text-foreground-muted mt-1">{s.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent users */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Новые пользователи</h2>
            <Link href="/admin/users" className="text-sm text-accent hover:text-accent-hover transition-colors">
              Все пользователи
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left text-xs text-foreground-muted uppercase tracking-wider">
                  <th className="pb-2 font-medium">Пользователь</th>
                  <th className="pb-2 font-medium">Тариф</th>
                  <th className="pb-2 font-medium">Статус</th>
                  <th className="pb-2 font-medium">Дата</th>
                </tr>
              </thead>
              <tbody>
                {recentUsers.map((u) => (
                  <tr key={u.id} className="border-b border-border/50">
                    <td className="py-2.5">
                      <p className="text-sm font-medium">{u.name}</p>
                      <p className="text-xs text-foreground-muted">{u.email}</p>
                    </td>
                    <td className="py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${planBadge[u.plan] || ""}`}>
                        {u.plan}
                      </span>
                    </td>
                    <td className="py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge[u.status]?.cls || ""}`}>
                        {statusBadge[u.status]?.label}
                      </span>
                    </td>
                    <td className="py-2.5 text-xs text-foreground-muted">{u.registeredAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Recent tickets */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Последние тикеты</h2>
            <Link href="/admin/tickets" className="text-sm text-accent hover:text-accent-hover transition-colors">
              Все тикеты
            </Link>
          </div>
          <div className="space-y-3">
            {recentTickets.map((t) => (
              <div key={t.id} className="flex items-start justify-between gap-3 py-2.5 border-b border-border/50 last:border-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium">#{t.id} {t.subject}</p>
                  <p className="text-xs text-foreground-muted mt-0.5">{t.user} / {t.date}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${ticketStatusBadge[t.status]?.cls || ""}`}>
                  {ticketStatusBadge[t.status]?.label}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Quick distribution */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <Card>
          <h3 className="text-sm font-medium text-foreground-secondary mb-3">Распределение по тарифам</h3>
          <div className="space-y-2">
            {[
              { plan: "Бесплатный", count: 823, pct: 66 },
              { plan: "Базовый", count: 312, pct: 25 },
              { plan: "Расширенный", count: 112, pct: 9 },
            ].map((p) => (
              <div key={p.plan}>
                <div className="flex justify-between text-xs mb-1">
                  <span>{p.plan}</span>
                  <span className="text-foreground-muted">{p.count} ({p.pct}%)</span>
                </div>
                <div className="h-2 bg-background-hover rounded-full overflow-hidden">
                  <div className="h-full bg-accent rounded-full" style={{ width: `${p.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h3 className="text-sm font-medium text-foreground-secondary mb-3">Популярные новеллы</h3>
          <div className="space-y-2.5">
            {[
              { name: "Doki Doki Literature Club", users: 412 },
              { name: "Everlasting Summer", users: 287 },
              { name: "Katawa Shoujo", users: 234 },
              { name: "Clannad", users: 189 },
              { name: "Steins;Gate", users: 156 },
            ].map((n, i) => (
              <div key={n.name} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="text-xs text-foreground-muted w-4">{i + 1}.</span>
                  {n.name}
                </span>
                <span className="text-foreground-muted text-xs">{n.users}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h3 className="text-sm font-medium text-foreground-secondary mb-3">Система</h3>
          <div className="space-y-3">
            {[
              { label: "API переводов", status: "ok", detail: "~450ms" },
              { label: "Синхронизация", status: "ok", detail: "~120ms" },
              { label: "База данных", status: "ok", detail: "24% нагрузка" },
              { label: "Очередь задач", status: "warning", detail: "12 в ожидании" },
            ].map((s) => (
              <div key={s.label} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${s.status === "ok" ? "bg-success" : "bg-warning"}`} />
                  {s.label}
                </span>
                <span className="text-foreground-muted text-xs">{s.detail}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
