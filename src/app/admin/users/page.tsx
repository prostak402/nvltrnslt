"use client";

import { useState } from "react";
import {
  Search,
  Filter,
  X,
  MoreVertical,
  Ban,
  Trash2,
  KeyRound,
  CreditCard,
  Mail,
  BookOpen,
  MessageSquare,
  Monitor,
  Clock,
  Calendar,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  UserX,
  Edit3,
  Download,
  Shield,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

interface User {
  id: number;
  name: string;
  email: string;
  plan: "free" | "basic" | "extended";
  status: "active" | "banned" | "inactive";
  registeredAt: string;
  lastActive: string;
  wordsCount: number;
  phrasesCount: number;
  translationsToday: number;
  translationLimit: number;
  devicesCount: number;
  totalTranslations: number;
  accessCode: string;
}

const mockUsers: User[] = [
  { id: 1001, name: "Алексей Петров", email: "alex@mail.ru", plan: "basic", status: "active", registeredAt: "15.01.2026", lastActive: "10.04.2026", wordsCount: 247, phrasesCount: 38, translationsToday: 18, translationLimit: 150, devicesCount: 1, totalTranslations: 3420, accessCode: "NVL-A7X9-K2M4" },
  { id: 1002, name: "Мария Иванова", email: "maria@gmail.com", plan: "extended", status: "active", registeredAt: "20.02.2026", lastActive: "10.04.2026", wordsCount: 512, phrasesCount: 94, translationsToday: 42, translationLimit: 500, devicesCount: 2, totalTranslations: 8750, accessCode: "NVL-B3K7-M9P2" },
  { id: 1003, name: "Дмитрий Козлов", email: "dkozlov@yandex.ru", plan: "free", status: "active", registeredAt: "01.03.2026", lastActive: "09.04.2026", wordsCount: 45, phrasesCount: 8, translationsToday: 0, translationLimit: 50, devicesCount: 1, totalTranslations: 520, accessCode: "NVL-C5N2-R4T8" },
  { id: 1004, name: "Екатерина Смирнова", email: "kate.s@mail.ru", plan: "basic", status: "banned", registeredAt: "10.12.2025", lastActive: "05.04.2026", wordsCount: 189, phrasesCount: 22, translationsToday: 0, translationLimit: 150, devicesCount: 0, totalTranslations: 2100, accessCode: "NVL-D8J4-W6X1" },
  { id: 1005, name: "Андрей Волков", email: "volkov.a@gmail.com", plan: "free", status: "active", registeredAt: "25.03.2026", lastActive: "10.04.2026", wordsCount: 23, phrasesCount: 3, translationsToday: 12, translationLimit: 50, devicesCount: 1, totalTranslations: 187, accessCode: "NVL-E2F6-H9L3" },
  { id: 1006, name: "Ольга Новикова", email: "olga.n@inbox.ru", plan: "basic", status: "active", registeredAt: "14.02.2026", lastActive: "09.04.2026", wordsCount: 156, phrasesCount: 31, translationsToday: 5, translationLimit: 150, devicesCount: 1, totalTranslations: 1890, accessCode: "NVL-F7G1-Q5S8" },
  { id: 1007, name: "Иван Сидоров", email: "sidorov@mail.ru", plan: "free", status: "inactive", registeredAt: "05.11.2025", lastActive: "20.02.2026", wordsCount: 67, phrasesCount: 0, translationsToday: 0, translationLimit: 50, devicesCount: 0, totalTranslations: 430, accessCode: "NVL-G4H8-T2V6" },
  { id: 1008, name: "Анна Кузнецова", email: "anna.k@gmail.com", plan: "extended", status: "active", registeredAt: "08.01.2026", lastActive: "10.04.2026", wordsCount: 734, phrasesCount: 128, translationsToday: 67, translationLimit: 500, devicesCount: 2, totalTranslations: 12400, accessCode: "NVL-H1J5-U8W3" },
  { id: 1009, name: "Сергей Морозов", email: "morozov.s@yandex.ru", plan: "basic", status: "active", registeredAt: "19.03.2026", lastActive: "08.04.2026", wordsCount: 98, phrasesCount: 14, translationsToday: 0, translationLimit: 150, devicesCount: 1, totalTranslations: 780, accessCode: "NVL-I6K2-X4Z7" },
  { id: 1010, name: "Наталья Белова", email: "belova@mail.ru", plan: "free", status: "active", registeredAt: "02.04.2026", lastActive: "10.04.2026", wordsCount: 11, phrasesCount: 1, translationsToday: 8, translationLimit: 50, devicesCount: 1, totalTranslations: 94, accessCode: "NVL-J3L7-Y1A5" },
  { id: 1011, name: "Павел Соколов", email: "psokolov@gmail.com", plan: "basic", status: "banned", registeredAt: "22.10.2025", lastActive: "01.03.2026", wordsCount: 302, phrasesCount: 47, translationsToday: 0, translationLimit: 150, devicesCount: 0, totalTranslations: 4200, accessCode: "NVL-K8M3-B6C9" },
  { id: 1012, name: "Елена Попова", email: "elena.pop@yandex.ru", plan: "extended", status: "active", registeredAt: "30.01.2026", lastActive: "10.04.2026", wordsCount: 421, phrasesCount: 73, translationsToday: 35, translationLimit: 500, devicesCount: 1, totalTranslations: 6800, accessCode: "NVL-L5N9-D2E4" },
];

const planLabels: Record<string, string> = { free: "Бесплатный", basic: "Базовый", extended: "Расширенный" };
const planStyles: Record<string, string> = {
  free: "bg-foreground-muted/20 text-foreground-muted",
  basic: "bg-accent-light text-accent",
  extended: "bg-accent-secondary-light text-accent-secondary",
};
const statusLabels: Record<string, string> = { active: "Активен", banned: "Заблокирован", inactive: "Неактивен" };
const statusStyles: Record<string, string> = {
  active: "bg-success/15 text-success",
  banned: "bg-danger-light text-danger",
  inactive: "bg-foreground-muted/20 text-foreground-muted",
};

export default function UsersPage() {
  const [search, setSearch] = useState("");
  const [filterPlan, setFilterPlan] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [actionMenu, setActionMenu] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 10;

  const filtered = mockUsers.filter((u) => {
    if (search) {
      const s = search.toLowerCase();
      if (!u.name.toLowerCase().includes(s) && !u.email.toLowerCase().includes(s) && !String(u.id).includes(s)) return false;
    }
    if (filterPlan !== "all" && u.plan !== filterPlan) return false;
    if (filterStatus !== "all" && u.status !== filterStatus) return false;
    return true;
  });

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  return (
    <div className="flex gap-6">
      <div className={`flex-1 min-w-0 ${selectedUser ? "max-w-[calc(100%-420px)]" : ""}`}>
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold">Пользователи</h1>
          <div className="flex items-center gap-2">
            <span className="text-sm text-foreground-secondary">{filtered.length} из {mockUsers.length}</span>
            <button className="flex items-center gap-1.5 px-3 py-2 text-sm bg-background-card border border-border rounded-lg hover:bg-background-hover transition-colors">
              <Download className="w-4 h-4" /> Экспорт
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
            <input
              type="text"
              placeholder="Поиск по имени, email или ID..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              className="w-full pl-10 pr-4 py-2.5 bg-background-card border border-border rounded-lg text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-accent text-sm"
            />
          </div>
          <select
            value={filterPlan}
            onChange={(e) => { setFilterPlan(e.target.value); setCurrentPage(1); }}
            className="px-3 py-2.5 bg-background-card border border-border rounded-lg text-foreground text-sm appearance-none cursor-pointer focus:outline-none focus:border-accent"
          >
            <option value="all">Все тарифы</option>
            <option value="free">Бесплатный</option>
            <option value="basic">Базовый</option>
            <option value="extended">Расширенный</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
            className="px-3 py-2.5 bg-background-card border border-border rounded-lg text-foreground text-sm appearance-none cursor-pointer focus:outline-none focus:border-accent"
          >
            <option value="all">Все статусы</option>
            <option value="active">Активен</option>
            <option value="banned">Заблокирован</option>
            <option value="inactive">Неактивен</option>
          </select>
        </div>

        {/* Table */}
        <div className="bg-background-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left text-xs text-foreground-muted uppercase tracking-wider">
                  <th className="px-4 py-3 font-medium">ID</th>
                  <th className="px-4 py-3 font-medium">Пользователь</th>
                  <th className="px-4 py-3 font-medium hidden md:table-cell">Тариф</th>
                  <th className="px-4 py-3 font-medium hidden lg:table-cell">Слов</th>
                  <th className="px-4 py-3 font-medium hidden lg:table-cell">Последняя активность</th>
                  <th className="px-4 py-3 font-medium">Статус</th>
                  <th className="px-4 py-3 font-medium w-10"></th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((u) => (
                  <tr
                    key={u.id}
                    onClick={() => { setSelectedUser(u); setActionMenu(null); }}
                    className={`border-b border-border/50 cursor-pointer transition-colors hover:bg-background-hover ${selectedUser?.id === u.id ? "bg-accent-light/50" : ""}`}
                  >
                    <td className="px-4 py-3 text-xs text-foreground-muted font-mono">#{u.id}</td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium">{u.name}</p>
                      <p className="text-xs text-foreground-muted">{u.email}</p>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${planStyles[u.plan]}`}>
                        {planLabels[u.plan]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground-secondary hidden lg:table-cell">{u.wordsCount}</td>
                    <td className="px-4 py-3 text-xs text-foreground-muted hidden lg:table-cell">{u.lastActive}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusStyles[u.status]}`}>
                        {statusLabels[u.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 relative">
                      <button
                        onClick={(e) => { e.stopPropagation(); setActionMenu(actionMenu === u.id ? null : u.id); }}
                        className="p-1 rounded hover:bg-background-hover transition-colors"
                      >
                        <MoreVertical className="w-4 h-4 text-foreground-muted" />
                      </button>
                      {actionMenu === u.id && (
                        <div className="absolute right-4 top-full z-10 bg-background-card border border-border rounded-lg shadow-lg py-1 w-48">
                          <button className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-background-hover transition-colors text-left">
                            <Edit3 className="w-4 h-4" /> Редактировать
                          </button>
                          <button className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-background-hover transition-colors text-left">
                            <CreditCard className="w-4 h-4" /> Сменить тариф
                          </button>
                          <button className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-background-hover transition-colors text-left">
                            <KeyRound className="w-4 h-4" /> Сбросить пароль
                          </button>
                          <button className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-background-hover transition-colors text-left">
                            <Shield className="w-4 h-4" /> Сбросить лимиты
                          </button>
                          {u.status === "banned" ? (
                            <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-success hover:bg-background-hover transition-colors text-left">
                              <UserCheck className="w-4 h-4" /> Разблокировать
                            </button>
                          ) : (
                            <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-warning hover:bg-background-hover transition-colors text-left">
                              <Ban className="w-4 h-4" /> Заблокировать
                            </button>
                          )}
                          <hr className="my-1 border-border" />
                          <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-danger hover:bg-background-hover transition-colors text-left">
                            <Trash2 className="w-4 h-4" /> Удалить
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg bg-background-card border border-border disabled:opacity-40 hover:bg-background-hover"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-foreground-secondary px-3">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg bg-background-card border border-border disabled:opacity-40 hover:bg-background-hover"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* User Detail Panel */}
      {selectedUser && (
        <div className="hidden lg:block w-[400px] flex-shrink-0">
          <div className="sticky top-6 bg-background-card border border-border rounded-xl overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-border">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono text-foreground-muted">#{selectedUser.id}</span>
                <button onClick={() => setSelectedUser(null)} className="text-foreground-muted hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <h2 className="text-lg font-bold">{selectedUser.name}</h2>
              <p className="text-sm text-foreground-muted">{selectedUser.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${planStyles[selectedUser.plan]}`}>
                  {planLabels[selectedUser.plan]}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusStyles[selectedUser.status]}`}>
                  {statusLabels[selectedUser.status]}
                </span>
              </div>
            </div>

            {/* Stats */}
            <div className="p-5 border-b border-border">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <BookOpen className="w-4 h-4 text-foreground-muted" />
                  <div>
                    <p className="text-foreground-muted text-xs">Слов</p>
                    <p className="font-medium">{selectedUser.wordsCount}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <MessageSquare className="w-4 h-4 text-foreground-muted" />
                  <div>
                    <p className="text-foreground-muted text-xs">Фраз</p>
                    <p className="font-medium">{selectedUser.phrasesCount}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Monitor className="w-4 h-4 text-foreground-muted" />
                  <div>
                    <p className="text-foreground-muted text-xs">Устройств</p>
                    <p className="font-medium">{selectedUser.devicesCount}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Filter className="w-4 h-4 text-foreground-muted" />
                  <div>
                    <p className="text-foreground-muted text-xs">Всего переводов</p>
                    <p className="font-medium">{selectedUser.totalTranslations.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Today's usage */}
              <div className="mt-4">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-foreground-muted">Переводов сегодня</span>
                  <span>{selectedUser.translationsToday} / {selectedUser.translationLimit}</span>
                </div>
                <div className="h-2 bg-background-hover rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full"
                    style={{ width: `${Math.min(100, (selectedUser.translationsToday / selectedUser.translationLimit) * 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Meta */}
            <div className="p-5 border-b border-border space-y-2.5 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-foreground-muted" />
                <span className="text-foreground-muted">Регистрация:</span>
                <span>{selectedUser.registeredAt}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-foreground-muted" />
                <span className="text-foreground-muted">Последняя активность:</span>
                <span>{selectedUser.lastActive}</span>
              </div>
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-foreground-muted" />
                <span className="text-foreground-muted">Код:</span>
                <code className="text-xs bg-background-hover px-2 py-0.5 rounded font-mono">{selectedUser.accessCode}</code>
              </div>
            </div>

            {/* Actions */}
            <div className="p-5 space-y-2">
              <h3 className="text-xs font-medium text-foreground-muted uppercase tracking-wider mb-3">Действия</h3>
              <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-accent-light text-accent hover:bg-accent/25 transition-colors">
                <CreditCard className="w-4 h-4" /> Сменить тариф
              </button>
              <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-background-hover text-foreground-secondary hover:text-foreground transition-colors">
                <KeyRound className="w-4 h-4" /> Сбросить пароль
              </button>
              <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-background-hover text-foreground-secondary hover:text-foreground transition-colors">
                <Shield className="w-4 h-4" /> Сбросить дневной лимит
              </button>
              <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-background-hover text-foreground-secondary hover:text-foreground transition-colors">
                <Mail className="w-4 h-4" /> Отправить письмо
              </button>
              {selectedUser.status === "banned" ? (
                <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-success/15 text-success hover:bg-success/25 transition-colors">
                  <UserCheck className="w-4 h-4" /> Разблокировать
                </button>
              ) : (
                <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-warning/15 text-warning hover:bg-warning/25 transition-colors">
                  <Ban className="w-4 h-4" /> Заблокировать
                </button>
              )}
              <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-danger-light text-danger hover:bg-danger/25 transition-colors">
                <Trash2 className="w-4 h-4" /> Удалить пользователя
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
