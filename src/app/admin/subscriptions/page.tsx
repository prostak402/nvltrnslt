"use client";

import { useState } from "react";
import {
  Search,
  Filter,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Gift,
  Zap,
  Crown,
} from "lucide-react";
import { Card } from "@/components/ui/Card";

const stats = [
  { label: "Активных подписок", value: "424", change: "+18", positive: true },
  { label: "MRR", value: "$3,842", change: "+8%", positive: true },
  { label: "Отмен за месяц", value: "12", change: "-3", positive: true },
  { label: "Конверсия Free→Paid", value: "14.2%", change: "+1.1%", positive: true },
];

interface Subscription {
  id: number;
  userId: number;
  userName: string;
  email: string;
  plan: "free" | "basic" | "extended";
  status: "active" | "cancelled" | "expired" | "trial";
  startDate: string;
  nextBilling: string;
  amount: string;
  autoRenew: boolean;
}

const mockSubs: Subscription[] = [
  { id: 1, userId: 1001, userName: "Алексей Петров", email: "alex@mail.ru", plan: "basic", status: "active", startDate: "10.01.2026", nextBilling: "10.05.2026", amount: "$4.99", autoRenew: true },
  { id: 2, userId: 1002, userName: "Мария Иванова", email: "maria@gmail.com", plan: "extended", status: "active", startDate: "20.02.2026", nextBilling: "20.05.2026", amount: "$9.99", autoRenew: true },
  { id: 3, userId: 1006, userName: "Ольга Новикова", email: "olga.n@inbox.ru", plan: "basic", status: "active", startDate: "14.02.2026", nextBilling: "14.05.2026", amount: "$4.99", autoRenew: true },
  { id: 4, userId: 1008, userName: "Анна Кузнецова", email: "anna.k@gmail.com", plan: "extended", status: "active", startDate: "08.01.2026", nextBilling: "08.05.2026", amount: "$9.99", autoRenew: true },
  { id: 5, userId: 1009, userName: "Сергей Морозов", email: "morozov.s@yandex.ru", plan: "basic", status: "active", startDate: "19.03.2026", nextBilling: "19.05.2026", amount: "$4.99", autoRenew: true },
  { id: 6, userId: 1004, userName: "Екатерина Смирнова", email: "kate.s@mail.ru", plan: "basic", status: "cancelled", startDate: "10.12.2025", nextBilling: "—", amount: "$4.99", autoRenew: false },
  { id: 7, userId: 1011, userName: "Павел Соколов", email: "psokolov@gmail.com", plan: "basic", status: "expired", startDate: "22.10.2025", nextBilling: "—", amount: "$4.99", autoRenew: false },
  { id: 8, userId: 1012, userName: "Елена Попова", email: "elena.pop@yandex.ru", plan: "extended", status: "active", startDate: "30.01.2026", nextBilling: "30.05.2026", amount: "$9.99", autoRenew: true },
  { id: 9, userId: 1013, userName: "Игорь Тимофеев", email: "igor.t@mail.ru", plan: "basic", status: "trial", startDate: "05.04.2026", nextBilling: "05.05.2026", amount: "$4.99", autoRenew: false },
  { id: 10, userId: 1014, userName: "Виктория Лебедева", email: "vika.l@gmail.com", plan: "extended", status: "trial", startDate: "07.04.2026", nextBilling: "07.05.2026", amount: "$9.99", autoRenew: false },
];

const planLabels: Record<string, string> = { free: "Бесплатный", basic: "Базовый", extended: "Расширенный" };
const planIcons: Record<string, typeof Gift> = { free: Gift, basic: Zap, extended: Crown };
const planStyles: Record<string, string> = {
  free: "bg-foreground-muted/20 text-foreground-muted",
  basic: "bg-accent-light text-accent",
  extended: "bg-accent-secondary-light text-accent-secondary",
};
const statusLabels: Record<string, string> = { active: "Активна", cancelled: "Отменена", expired: "Истекла", trial: "Пробный" };
const statusStyles: Record<string, string> = {
  active: "bg-success/15 text-success",
  cancelled: "bg-warning/15 text-warning",
  expired: "bg-foreground-muted/20 text-foreground-muted",
  trial: "bg-accent-light text-accent",
};

export default function SubscriptionsPage() {
  const [search, setSearch] = useState("");
  const [filterPlan, setFilterPlan] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const filtered = mockSubs.filter((s) => {
    if (search) {
      const q = search.toLowerCase();
      if (!s.userName.toLowerCase().includes(q) && !s.email.toLowerCase().includes(q) && !String(s.userId).includes(q)) return false;
    }
    if (filterPlan !== "all" && s.plan !== filterPlan) return false;
    if (filterStatus !== "all" && s.status !== filterStatus) return false;
    return true;
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Подписки</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="bg-background-card border border-border rounded-xl p-4">
            <p className="text-xs text-foreground-muted mb-1">{s.label}</p>
            <div className="flex items-center gap-2">
              <p className="text-xl font-bold">{s.value}</p>
              <span className={`flex items-center gap-0.5 text-xs font-medium ${s.positive ? "text-success" : "text-danger"}`}>
                {s.positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {s.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
          <input
            type="text"
            placeholder="Поиск по имени, email или ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-background-card border border-border rounded-lg text-sm text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-accent"
          />
        </div>
        <select
          value={filterPlan}
          onChange={(e) => setFilterPlan(e.target.value)}
          className="px-3 py-2.5 bg-background-card border border-border rounded-lg text-sm text-foreground appearance-none cursor-pointer focus:outline-none focus:border-accent"
        >
          <option value="all">Все тарифы</option>
          <option value="basic">Базовый</option>
          <option value="extended">Расширенный</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2.5 bg-background-card border border-border rounded-lg text-sm text-foreground appearance-none cursor-pointer focus:outline-none focus:border-accent"
        >
          <option value="all">Все статусы</option>
          <option value="active">Активна</option>
          <option value="trial">Пробный</option>
          <option value="cancelled">Отменена</option>
          <option value="expired">Истекла</option>
        </select>
      </div>

      {/* List */}
      <div className="space-y-2">
        {filtered.map((sub) => {
          const Icon = planIcons[sub.plan];
          const expanded = expandedId === sub.id;
          return (
            <div
              key={sub.id}
              className="bg-background-card border border-border rounded-xl overflow-hidden"
            >
              <div
                className="flex items-center gap-4 p-4 cursor-pointer hover:bg-background-hover/50 transition-colors"
                onClick={() => setExpandedId(expanded ? null : sub.id)}
              >
                <Icon className={`w-5 h-5 shrink-0 ${sub.plan === "extended" ? "text-accent-secondary" : sub.plan === "basic" ? "text-accent" : "text-foreground-muted"}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{sub.userName}</span>
                    <span className="text-xs text-foreground-muted">#{sub.userId}</span>
                  </div>
                  <p className="text-xs text-foreground-muted">{sub.email}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${planStyles[sub.plan]}`}>
                  {planLabels[sub.plan]}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium hidden sm:inline ${statusStyles[sub.status]}`}>
                  {statusLabels[sub.status]}
                </span>
                <span className="text-sm font-medium w-16 text-right">{sub.amount}</span>
                {expanded ? <ChevronUp className="w-4 h-4 text-foreground-muted" /> : <ChevronDown className="w-4 h-4 text-foreground-muted" />}
              </div>

              {expanded && (
                <div className="px-4 pb-4 border-t border-border/50">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-3 text-sm">
                    <div>
                      <span className="text-xs text-foreground-muted">Начало подписки</span>
                      <p>{sub.startDate}</p>
                    </div>
                    <div>
                      <span className="text-xs text-foreground-muted">Следующее списание</span>
                      <p>{sub.nextBilling}</p>
                    </div>
                    <div>
                      <span className="text-xs text-foreground-muted">Автопродление</span>
                      <p>{sub.autoRenew ? "Да" : "Нет"}</p>
                    </div>
                    <div>
                      <span className="text-xs text-foreground-muted">Статус</span>
                      <p className="flex items-center gap-1">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusStyles[sub.status]}`}>
                          {statusLabels[sub.status]}
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-accent-light text-accent hover:bg-accent/25 transition-colors">
                      <CreditCard className="w-3.5 h-3.5" /> Сменить тариф
                    </button>
                    <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-background-hover text-foreground-secondary hover:text-foreground transition-colors">
                      <RefreshCw className="w-3.5 h-3.5" /> Продлить
                    </button>
                    {sub.status === "active" && (
                      <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-warning/15 text-warning hover:bg-warning/25 transition-colors">
                        Отменить подписку
                      </button>
                    )}
                    {(sub.status === "cancelled" || sub.status === "expired") && (
                      <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-success/15 text-success hover:bg-success/25 transition-colors">
                        Восстановить
                      </button>
                    )}
                    <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-danger-light text-danger hover:bg-danger/25 transition-colors">
                      Возврат средств
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
