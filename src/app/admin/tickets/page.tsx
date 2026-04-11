"use client";

import { useState } from "react";
import {
  Search,
  MessageSquare,
  Clock,
  User,
  Send,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Card } from "@/components/ui/Card";

interface Ticket {
  id: number;
  userId: number;
  userName: string;
  email: string;
  subject: string;
  category: "mod" | "sync" | "account" | "payment" | "feature" | "other";
  status: "open" | "in_progress" | "waiting" | "resolved" | "closed";
  createdAt: string;
  updatedAt: string;
  messages: { from: "user" | "admin"; text: string; date: string }[];
}

const mockTickets: Ticket[] = [
  {
    id: 101, userId: 1002, userName: "Мария Иванова", email: "maria@gmail.com",
    subject: "Слова не синхронизируются с кабинетом", category: "sync", status: "open",
    createdAt: "10.04.2026 14:32", updatedAt: "10.04.2026 14:32",
    messages: [
      { from: "user", text: "Здравствуйте! Уже второй день слова, которые я сохраняю в игре, не появляются в кабинете. Код доступа введён правильно, интернет стабильный. Что делать?", date: "10.04.2026 14:32" },
    ],
  },
  {
    id: 102, userId: 1003, userName: "Дмитрий Козлов", email: "dkozlov@yandex.ru",
    subject: "Не приходит код доступа после регистрации", category: "account", status: "open",
    createdAt: "09.04.2026 18:15", updatedAt: "09.04.2026 18:15",
    messages: [
      { from: "user", text: "Зарегистрировался на сайте, но нигде не вижу код доступа. Где его найти?", date: "09.04.2026 18:15" },
    ],
  },
  {
    id: 103, userId: 1005, userName: "Андрей Волков", email: "volkov.a@gmail.com",
    subject: "Вопрос об оплате тарифа", category: "payment", status: "in_progress",
    createdAt: "09.04.2026 11:03", updatedAt: "10.04.2026 09:20",
    messages: [
      { from: "user", text: "Могу ли я оплатить подписку через Qiwi или криптовалюту? Карта не поддерживается.", date: "09.04.2026 11:03" },
      { from: "admin", text: "Здравствуйте! На данный момент поддерживаются банковские карты Visa/Mastercard. Мы рассматриваем подключение альтернативных способов оплаты. Могу ли я помочь с чем-то ещё?", date: "10.04.2026 09:20" },
    ],
  },
  {
    id: 104, userId: 1007, userName: "Иван Сидоров", email: "sidorov@mail.ru",
    subject: "Мод не работает с Clannad", category: "mod", status: "resolved",
    createdAt: "08.04.2026 20:45", updatedAt: "09.04.2026 15:30",
    messages: [
      { from: "user", text: "Установил мод в Clannad, но при запуске игры ничего не появляется. Версия Ren'Py — 6.99.", date: "08.04.2026 20:45" },
      { from: "admin", text: "Clannad использует старую версию Ren'Py (6.99), которая пока поддерживается с ограничениями. Попробуйте скачать версию мода 1.2 — в ней улучшена совместимость.", date: "09.04.2026 10:15" },
      { from: "user", text: "Спасибо, версия 1.2 работает! Перевод появляется.", date: "09.04.2026 15:30" },
    ],
  },
  {
    id: 105, userId: 1006, userName: "Ольга Новикова", email: "olga.n@inbox.ru",
    subject: "Предложение: добавить тёмную тему в мод", category: "feature", status: "closed",
    createdAt: "07.04.2026 12:10", updatedAt: "08.04.2026 14:00",
    messages: [
      { from: "user", text: "Было бы здорово, если бы окно перевода в моде поддерживало тёмную тему, чтобы не слепило при игре в темноте.", date: "07.04.2026 12:10" },
      { from: "admin", text: "Отличная идея! Мы добавили это в план разработки. Спасибо за предложение!", date: "08.04.2026 14:00" },
    ],
  },
  {
    id: 106, userId: 1010, userName: "Наталья Белова", email: "belova@mail.ru",
    subject: "Ошибка при сохранении длинной фразы", category: "mod", status: "open",
    createdAt: "10.04.2026 16:45", updatedAt: "10.04.2026 16:45",
    messages: [
      { from: "user", text: "При попытке сохранить длинную фразу (больше 3 строк) игра зависает на секунду и фраза не сохраняется. Играю в Katawa Shoujo.", date: "10.04.2026 16:45" },
    ],
  },
  {
    id: 107, userId: 1008, userName: "Анна Кузнецова", email: "anna.k@gmail.com",
    subject: "Повторяющиеся слова в словаре", category: "sync", status: "waiting",
    createdAt: "09.04.2026 22:30", updatedAt: "10.04.2026 11:00",
    messages: [
      { from: "user", text: "У меня в словаре некоторые слова дублируются по 2-3 раза. Как можно их объединить?", date: "09.04.2026 22:30" },
      { from: "admin", text: "Это известная проблема при нестабильном соединении. Мы работаем над автодедупликацией. Пока могу ли я вручную очистить дубликаты?", date: "10.04.2026 11:00" },
    ],
  },
];

const categoryLabels: Record<string, string> = {
  mod: "Мод", sync: "Синхронизация", account: "Аккаунт", payment: "Оплата", feature: "Предложение", other: "Другое",
};
const statusLabels: Record<string, string> = {
  open: "Открыт", in_progress: "В работе", waiting: "Ожидание", resolved: "Решён", closed: "Закрыт",
};
const statusStyles: Record<string, string> = {
  open: "bg-danger-light text-danger",
  in_progress: "bg-accent-light text-accent",
  waiting: "bg-warning/15 text-warning",
  resolved: "bg-success/15 text-success",
  closed: "bg-foreground-muted/20 text-foreground-muted",
};
const statusIcons: Record<string, typeof AlertCircle> = {
  open: AlertCircle,
  in_progress: Loader2,
  waiting: Clock,
  resolved: CheckCircle,
  closed: CheckCircle,
};

export default function TicketsPage() {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [reply, setReply] = useState("");

  const filtered = mockTickets.filter((t) => {
    if (search) {
      const q = search.toLowerCase();
      if (!t.subject.toLowerCase().includes(q) && !t.userName.toLowerCase().includes(q) && !String(t.id).includes(q)) return false;
    }
    if (filterStatus !== "all" && t.status !== filterStatus) return false;
    return true;
  });

  const openCount = mockTickets.filter((t) => t.status === "open").length;
  const inProgressCount = mockTickets.filter((t) => t.status === "in_progress" || t.status === "waiting").length;

  return (
    <div className="flex gap-6 h-[calc(100vh-7rem)]">
      {/* Ticket List */}
      <div className={`flex flex-col min-w-0 ${selectedTicket ? "w-[400px] flex-shrink-0 hidden lg:flex" : "flex-1"}`}>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Тикеты</h1>
          <div className="flex items-center gap-3 text-sm">
            <span className="flex items-center gap-1.5 text-danger">
              <AlertCircle className="w-4 h-4" /> {openCount} открытых
            </span>
            <span className="flex items-center gap-1.5 text-accent">
              <Loader2 className="w-4 h-4" /> {inProgressCount} в работе
            </span>
          </div>
        </div>

        <div className="flex gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
            <input
              type="text"
              placeholder="Поиск по теме, имени или ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-background-card border border-border rounded-lg text-sm text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-accent"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2.5 bg-background-card border border-border rounded-lg text-sm text-foreground appearance-none cursor-pointer focus:outline-none focus:border-accent"
          >
            <option value="all">Все статусы</option>
            <option value="open">Открыт</option>
            <option value="in_progress">В работе</option>
            <option value="waiting">Ожидание</option>
            <option value="resolved">Решён</option>
            <option value="closed">Закрыт</option>
          </select>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2">
          {filtered.map((ticket) => {
            const StatusIcon = statusIcons[ticket.status];
            return (
              <div
                key={ticket.id}
                onClick={() => setSelectedTicket(ticket)}
                className={`p-4 bg-background-card border rounded-xl cursor-pointer transition-colors hover:border-border-hover ${
                  selectedTicket?.id === ticket.id ? "border-accent bg-accent-light/30" : "border-border"
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <StatusIcon className={`w-4 h-4 shrink-0 ${statusStyles[ticket.status].includes("text-danger") ? "text-danger" : statusStyles[ticket.status].includes("text-accent") ? "text-accent" : statusStyles[ticket.status].includes("text-warning") ? "text-warning" : statusStyles[ticket.status].includes("text-success") ? "text-success" : "text-foreground-muted"}`} />
                    <span className="text-xs text-foreground-muted">#{ticket.id}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${statusStyles[ticket.status]}`}>
                    {statusLabels[ticket.status]}
                  </span>
                </div>
                <h3 className="text-sm font-medium mb-1 line-clamp-1">{ticket.subject}</h3>
                <div className="flex items-center justify-between text-xs text-foreground-muted">
                  <span>{ticket.userName}</span>
                  <span>{ticket.createdAt}</span>
                </div>
                <span className="inline-block mt-2 px-2 py-0.5 rounded text-xs bg-background-hover text-foreground-muted">
                  {categoryLabels[ticket.category]}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Ticket Detail */}
      {selectedTicket && (
        <div className="flex-1 flex flex-col min-w-0 bg-background-card border border-border rounded-xl overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-border shrink-0">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-foreground-muted">#{selectedTicket.id}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusStyles[selectedTicket.status]}`}>
                  {statusLabels[selectedTicket.status]}
                </span>
                <span className="px-2 py-0.5 rounded text-xs bg-background-hover text-foreground-muted">
                  {categoryLabels[selectedTicket.category]}
                </span>
              </div>
              <button onClick={() => setSelectedTicket(null)} className="text-foreground-muted hover:text-foreground lg:hidden">
                <X className="w-5 h-5" />
              </button>
            </div>
            <h2 className="font-semibold">{selectedTicket.subject}</h2>
            <div className="flex items-center gap-3 mt-2 text-xs text-foreground-muted">
              <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" />{selectedTicket.userName} ({selectedTicket.email})</span>
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{selectedTicket.createdAt}</span>
            </div>

            {/* Status actions */}
            <div className="flex flex-wrap gap-2 mt-3">
              {["open", "in_progress", "waiting", "resolved", "closed"].map((s) => (
                <button
                  key={s}
                  className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${
                    selectedTicket.status === s
                      ? `${statusStyles[s]} font-medium`
                      : "bg-background-hover text-foreground-muted hover:text-foreground"
                  }`}
                >
                  {statusLabels[s]}
                </button>
              ))}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {selectedTicket.messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.from === "admin" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-xl p-3 ${
                  msg.from === "admin"
                    ? "bg-accent-light text-foreground"
                    : "bg-background-hover text-foreground"
                }`}>
                  <div className="flex items-center gap-2 mb-1.5 text-xs text-foreground-muted">
                    {msg.from === "admin" ? (
                      <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" /> Поддержка</span>
                    ) : (
                      <span className="flex items-center gap-1"><User className="w-3 h-3" /> {selectedTicket.userName}</span>
                    )}
                    <span>{msg.date}</span>
                  </div>
                  <p className="text-sm leading-relaxed">{msg.text}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Reply */}
          <div className="p-4 border-t border-border shrink-0">
            <div className="flex gap-2">
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Написать ответ..."
                rows={2}
                className="flex-1 px-3 py-2 bg-background-hover border border-border rounded-lg text-sm text-foreground placeholder:text-foreground-muted resize-none focus:outline-none focus:border-accent"
              />
              <button
                disabled={!reply.trim()}
                className="px-4 bg-accent hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition-colors self-end"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
