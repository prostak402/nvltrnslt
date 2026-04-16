"use client";

import { useMemo, useState } from "react";
import {
  Search,
  CreditCard,
  Mail,
  BookOpen,
  MessageSquare,
  Monitor,
  Clock,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  Shield,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import type { AdminUserRow } from "@/lib/contracts/admin";
import { planLabel } from "@/lib/client/presentation";

type AdminUser = AdminUserRow;

export default function UsersClient({
  data,
  error,
}: {
  data: AdminUser[];
  error?: string | null;
}) {
  const loading = false;
  const [search, setSearch] = useState("");
  const [filterPlan, setFilterPlan] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 10;

  const filtered = useMemo(
    () =>
      data.filter((user) => {
        const term = search.toLowerCase();
        if (
          term &&
          !user.name.toLowerCase().includes(term) &&
          !user.email.toLowerCase().includes(term) &&
          !String(user.id).includes(term)
        ) {
          return false;
        }
        if (filterPlan !== "all" && user.plan !== filterPlan) {
          return false;
        }
        if (filterStatus !== "all" && user.status !== filterStatus) {
          return false;
        }
        return true;
      }),
    [data, filterPlan, filterStatus, search],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginated = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);
  const selectedUser = data.find((user) => user.id === selectedUserId) ?? null;
  const translationLimitBase = selectedUser
    ? Math.max(selectedUser.translationLimit ?? selectedUser.translationsToday, 1)
    : 1;

  return (
    <div className="flex gap-6">
      <div className={`flex-1 min-w-0 ${selectedUser ? "max-w-[calc(100%-420px)]" : ""}`}>
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold">Пользователи</h1>
          <div className="flex items-center gap-2">
            <span className="text-sm text-foreground-secondary">
              {filtered.length} из {data.length}
            </span>
            <button className="flex items-center gap-1.5 px-3 py-2 text-sm bg-background-card border border-border rounded-lg hover:bg-background-hover transition-colors">
              <Download className="w-4 h-4" /> Экспорт
            </button>
          </div>
        </div>

        {error ? (
          <div className="mb-6 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
            Не удалось загрузить пользователей: {error}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3 mb-4">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
            <input
              type="text"
              placeholder="Поиск по имени, email или ID..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2.5 bg-background-card border border-border rounded-lg text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-accent text-sm"
            />
          </div>
          <select
            value={filterPlan}
            onChange={(e) => {
              setFilterPlan(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2.5 bg-background-card border border-border rounded-lg text-foreground text-sm appearance-none cursor-pointer focus:outline-none focus:border-accent"
          >
            <option value="all">Все тарифы</option>
            <option value="free">Бесплатный</option>
            <option value="basic">Базовый</option>
            <option value="extended">Расширенный</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2.5 bg-background-card border border-border rounded-lg text-foreground text-sm appearance-none cursor-pointer focus:outline-none focus:border-accent"
          >
            <option value="all">Все статусы</option>
            <option value="active">Активен</option>
            <option value="banned">Заблокирован</option>
            <option value="inactive">Неактивен</option>
          </select>
        </div>

        <div className="bg-background-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left text-xs text-foreground-muted uppercase tracking-wider">
                  <th className="px-4 py-3 font-medium">ID</th>
                  <th className="px-4 py-3 font-medium">Пользователь</th>
                  <th className="px-4 py-3 font-medium hidden md:table-cell">Тариф</th>
                  <th className="px-4 py-3 font-medium hidden lg:table-cell">Словарь</th>
                  <th className="px-4 py-3 font-medium hidden lg:table-cell">Последняя активность</th>
                  <th className="px-4 py-3 font-medium">Статус</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((user) => (
                  <tr
                    key={user.id}
                    onClick={() => setSelectedUserId(user.id)}
                    className={`border-b border-border/50 cursor-pointer transition-colors hover:bg-background-hover ${
                      selectedUser?.id === user.id ? "bg-accent-light/40" : ""
                    }`}
                  >
                    <td className="px-4 py-3 text-xs text-foreground-muted font-mono">#{user.id}</td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium">{user.name}</p>
                      <p className="text-xs text-foreground-muted">{user.email}</p>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-sm text-foreground-secondary">{planLabel(user.plan)}</td>
                    <td className="px-4 py-3 text-sm text-foreground-secondary hidden lg:table-cell">
                      {user.wordsCount} слов / {user.phrasesCount} фраз
                    </td>
                    <td className="px-4 py-3 text-xs text-foreground-muted hidden lg:table-cell">
                      {new Date(user.lastActiveAt).toLocaleString("ru-RU")}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={user.status === "active" ? "success" : user.status === "banned" ? "danger" : "default"}>
                        {user.status === "active" ? "Активен" : user.status === "banned" ? "Заблокирован" : "Неактивен"}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {!loading && paginated.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-foreground-muted" colSpan={6}>
                      Пользователи по текущему фильтру не найдены.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        {totalPages > 1 ? (
          <div className="flex items-center justify-center gap-2 mt-4">
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg bg-background-card border border-border disabled:opacity-40 hover:bg-background-hover"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-foreground-secondary px-3">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg bg-background-card border border-border disabled:opacity-40 hover:bg-background-hover"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        ) : null}
      </div>

      {selectedUser ? (
        <div className="hidden lg:block w-[400px] flex-shrink-0">
          <div className="sticky top-6 bg-background-card border border-border rounded-xl overflow-hidden">
            <div className="p-5 border-b border-border">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono text-foreground-muted">#{selectedUser.id}</span>
                <button type="button" onClick={() => setSelectedUserId(null)} className="text-foreground-muted hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <h2 className="text-lg font-bold">{selectedUser.name}</h2>
              <p className="text-sm text-foreground-muted">{selectedUser.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="accent">{planLabel(selectedUser.plan)}</Badge>
                <Badge variant={selectedUser.status === "active" ? "success" : selectedUser.status === "banned" ? "danger" : "default"}>
                  {selectedUser.status === "active" ? "Активен" : selectedUser.status === "banned" ? "Заблокирован" : "Неактивен"}
                </Badge>
              </div>
            </div>

            <div className="p-5 border-b border-border">
              <div className="grid grid-cols-2 gap-3">
                <DetailStat icon={BookOpen} label="Слова" value={selectedUser.wordsCount} />
                <DetailStat icon={MessageSquare} label="Фразы" value={selectedUser.phrasesCount} />
                <DetailStat icon={Monitor} label="Устройства" value={selectedUser.devicesCount} />
                <DetailStat icon={Shield} label="Всего переводов" value={selectedUser.totalTranslations} />
              </div>

              <div className="mt-4">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-foreground-muted">Переводов сегодня</span>
                  <span>
                    {selectedUser.translationsToday} / {selectedUser.translationLimit ?? "∞"}
                  </span>
                </div>
                <div className="h-2 bg-background-hover rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full"
                    style={{
                      width: `${Math.min(
                        100,
                        (selectedUser.translationsToday / translationLimitBase) * 100,
                      )}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="p-5 border-b border-border space-y-2.5 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-foreground-muted" />
                <span className="text-foreground-muted">Регистрация:</span>
                <span>{new Date(selectedUser.registeredAt).toLocaleDateString("ru-RU")}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-foreground-muted" />
                <span className="text-foreground-muted">Последняя активность:</span>
                <span>{new Date(selectedUser.lastActiveAt).toLocaleString("ru-RU")}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-foreground-muted" />
                <span className="text-foreground-muted">Почта:</span>
                <span>{selectedUser.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-foreground-muted" />
                <span className="text-foreground-muted">Ключ активации:</span>
                <code className="text-xs bg-background-hover px-2 py-0.5 rounded font-mono">
                  {selectedUser.activationKeyPreview}
                </code>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DetailStat({ icon: Icon, label, value }: { icon: typeof BookOpen; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <Icon className="w-4 h-4 text-foreground-muted" />
      <div>
        <p className="text-foreground-muted text-xs">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  );
}
