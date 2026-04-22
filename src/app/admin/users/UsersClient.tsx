"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  Download,
  Mail,
  MessageSquare,
  Monitor,
  Save,
  Search,
  Shield,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import type { AdminUserRow } from "@/lib/contracts/admin";
import { planLabel } from "@/lib/client/presentation";

type AdminUser = AdminUserRow;

type DraftState = {
  plan: AdminUser["plan"];
  translationLimitOverride: string;
  dictionaryLimitOverride: string;
};

function limitLabel(value: number | null) {
  return value === null ? "Без лимита" : value.toLocaleString("ru-RU");
}

function limitInputValue(value: number | null) {
  return value === null ? "" : String(value);
}

export default function UsersClient({
  data,
  error,
}: {
  data: AdminUser[];
  error?: string | null;
}) {
  const [usersData, setUsersData] = useState(data);
  const [search, setSearch] = useState("");
  const [filterPlan, setFilterPlan] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(data[0]?.id ?? null);
  const [currentPage, setCurrentPage] = useState(1);
  const [draft, setDraft] = useState<DraftState | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const perPage = 10;

  useEffect(() => {
    setUsersData(data);
  }, [data]);

  const filtered = useMemo(
    () =>
      usersData.filter((user) => {
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
    [filterPlan, filterStatus, search, usersData],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginated = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);
  const selectedUser = usersData.find((user) => user.id === selectedUserId) ?? null;

  useEffect(() => {
    if (!selectedUser) {
      setDraft(null);
      return;
    }

    setDraft({
      plan: selectedUser.plan,
      translationLimitOverride: limitInputValue(selectedUser.translationLimitOverride),
      dictionaryLimitOverride: limitInputValue(selectedUser.dictionaryLimitOverride),
    });
    setSaveError(null);
    setSaveSuccess(null);
  }, [selectedUserId, selectedUser]);

  const translationLimitBase = selectedUser
    ? Math.max(selectedUser.translationLimit ?? selectedUser.translationsToday, 1)
    : 1;
  const dictionaryItemsCount = selectedUser
    ? selectedUser.wordsCount + selectedUser.phrasesCount
    : 0;
  const dictionaryLimitBase = selectedUser
    ? Math.max(selectedUser.dictionaryLimit ?? dictionaryItemsCount, 1)
    : 1;
  const hasChanges =
    !!selectedUser &&
    !!draft &&
    (draft.plan !== selectedUser.plan ||
      draft.translationLimitOverride !==
        limitInputValue(selectedUser.translationLimitOverride) ||
      draft.dictionaryLimitOverride !==
        limitInputValue(selectedUser.dictionaryLimitOverride));

  async function handleSave() {
    if (!selectedUser || !draft) {
      return;
    }

    setSaving(true);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: selectedUser.id,
          plan: draft.plan,
          translationLimitOverride:
            draft.translationLimitOverride.trim() === ""
              ? null
              : Number(draft.translationLimitOverride),
          dictionaryLimitOverride:
            draft.dictionaryLimitOverride.trim() === ""
              ? null
              : Number(draft.dictionaryLimitOverride),
        }),
      });

      const payload = (await response.json()) as
        | { ok: true; data: AdminUser }
        | { ok: false; error?: string };

      if (!response.ok || !payload.ok) {
        throw new Error(payload.ok ? "Не удалось сохранить изменения." : payload.error || "Не удалось сохранить изменения.");
      }

      setUsersData((current) =>
        current.map((user) => (user.id === payload.data.id ? payload.data : user)),
      );
      setSaveSuccess("Изменения сохранены.");
    } catch (saveUnknownError) {
      const message =
        saveUnknownError instanceof Error
          ? saveUnknownError.message
          : "Не удалось сохранить изменения.";
      setSaveError(message);
    } finally {
      setSaving(false);
    }
  }

  function resetOverrides() {
    if (!selectedUser || !draft) {
      return;
    }

    setDraft({
      ...draft,
      translationLimitOverride: "",
      dictionaryLimitOverride: "",
    });
    setSaveSuccess(null);
    setSaveError(null);
  }

  return (
    <div className="flex gap-6">
      <div className={`flex-1 min-w-0 ${selectedUser ? "max-w-[calc(100%-420px)]" : ""}`}>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">Пользователи</h1>
          <div className="flex items-center gap-2">
            <span className="text-sm text-foreground-secondary">
              {filtered.length} из {usersData.length}
            </span>
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-lg border border-border bg-background-card px-3 py-2 text-sm transition-colors hover:bg-background-hover"
            >
              <Download className="h-4 w-4" />
              Экспорт
            </button>
          </div>
        </div>

        {error ? (
          <div className="mb-6 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
            Не удалось загрузить пользователей: {error}
          </div>
        ) : null}

        <div className="mb-4 flex flex-wrap gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-muted" />
            <input
              type="text"
              placeholder="Поиск по имени, email или ID..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-lg border border-border bg-background-card py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-foreground-muted focus:border-accent focus:outline-none"
            />
          </div>
          <select
            value={filterPlan}
            onChange={(event) => {
              setFilterPlan(event.target.value);
              setCurrentPage(1);
            }}
            className="cursor-pointer appearance-none rounded-lg border border-border bg-background-card px-3 py-2.5 text-sm text-foreground focus:border-accent focus:outline-none"
          >
            <option value="all">Все тарифы</option>
            <option value="free">Бесплатный</option>
            <option value="basic">Базовый</option>
            <option value="extended">Расширенный</option>
          </select>
          <select
            value={filterStatus}
            onChange={(event) => {
              setFilterStatus(event.target.value);
              setCurrentPage(1);
            }}
            className="cursor-pointer appearance-none rounded-lg border border-border bg-background-card px-3 py-2.5 text-sm text-foreground focus:border-accent focus:outline-none"
          >
            <option value="all">Все статусы</option>
            <option value="active">Активен</option>
            <option value="banned">Заблокирован</option>
            <option value="inactive">Неактивен</option>
          </select>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-background-card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-foreground-muted">
                  <th className="px-4 py-3 font-medium">ID</th>
                  <th className="px-4 py-3 font-medium">Пользователь</th>
                  <th className="hidden px-4 py-3 font-medium md:table-cell">Тариф</th>
                  <th className="hidden px-4 py-3 font-medium lg:table-cell">Лимиты</th>
                  <th className="hidden px-4 py-3 font-medium lg:table-cell">Последняя активность</th>
                  <th className="px-4 py-3 font-medium">Статус</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((user) => (
                  <tr
                    key={user.id}
                    onClick={() => setSelectedUserId(user.id)}
                    className={`cursor-pointer border-b border-border/50 transition-colors hover:bg-background-hover ${
                      selectedUser?.id === user.id ? "bg-accent-light/40" : ""
                    }`}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-foreground-muted">#{user.id}</td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium">{user.name}</p>
                      <p className="text-xs text-foreground-muted">{user.email}</p>
                    </td>
                    <td className="hidden px-4 py-3 text-sm text-foreground-secondary md:table-cell">
                      {planLabel(user.plan)}
                    </td>
                    <td className="hidden px-4 py-3 text-sm text-foreground-secondary lg:table-cell">
                      <div>{limitLabel(user.translationLimit)} переводов/день</div>
                      <div>{limitLabel(user.dictionaryLimit)} карточек</div>
                    </td>
                    <td className="hidden px-4 py-3 text-xs text-foreground-muted lg:table-cell">
                      {new Date(user.lastActiveAt).toLocaleString("ru-RU")}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          user.status === "active"
                            ? "success"
                            : user.status === "banned"
                              ? "danger"
                              : "default"
                        }
                      >
                        {user.status === "active"
                          ? "Активен"
                          : user.status === "banned"
                            ? "Заблокирован"
                            : "Неактивен"}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {paginated.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-foreground-muted" colSpan={6}>
                      Пользователи по текущим фильтрам не найдены.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        {totalPages > 1 ? (
          <div className="mt-4 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={currentPage === 1}
              className="rounded-lg border border-border bg-background-card p-2 disabled:opacity-40 hover:bg-background-hover"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-3 text-sm text-foreground-secondary">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              disabled={currentPage === totalPages}
              className="rounded-lg border border-border bg-background-card p-2 disabled:opacity-40 hover:bg-background-hover"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        ) : null}
      </div>

      {selectedUser && draft ? (
        <div className="hidden w-[400px] flex-shrink-0 lg:block">
          <div className="sticky top-6 overflow-hidden rounded-xl border border-border bg-background-card">
            <div className="border-b border-border p-5">
              <div className="mb-3 flex items-center justify-between">
                <span className="font-mono text-xs text-foreground-muted">#{selectedUser.id}</span>
                <button
                  type="button"
                  onClick={() => setSelectedUserId(null)}
                  className="text-foreground-muted transition-colors hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <h2 className="text-lg font-bold">{selectedUser.name}</h2>
              <p className="text-sm text-foreground-muted">{selectedUser.email}</p>
              <div className="mt-2 flex items-center gap-2">
                <Badge variant="accent">{planLabel(selectedUser.plan)}</Badge>
                <Badge
                  variant={
                    selectedUser.status === "active"
                      ? "success"
                      : selectedUser.status === "banned"
                        ? "danger"
                        : "default"
                  }
                >
                  {selectedUser.status === "active"
                    ? "Активен"
                    : selectedUser.status === "banned"
                      ? "Заблокирован"
                      : "Неактивен"}
                </Badge>
              </div>
            </div>

            <div className="border-b border-border p-5">
              <div className="grid grid-cols-2 gap-3">
                <DetailStat icon={BookOpen} label="Слова" value={selectedUser.wordsCount} />
                <DetailStat icon={MessageSquare} label="Фразы" value={selectedUser.phrasesCount} />
                <DetailStat icon={Monitor} label="Устройства" value={selectedUser.devicesCount} />
                <DetailStat icon={Shield} label="Переводы всего" value={selectedUser.totalTranslations} />
              </div>

              <div className="mt-4">
                <div className="mb-1 flex justify-between text-xs">
                  <span className="text-foreground-muted">Переводов сегодня</span>
                  <span>
                    {selectedUser.translationsToday} / {limitLabel(selectedUser.translationLimit)}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-background-hover">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{
                      width: `${Math.min(
                        100,
                        (selectedUser.translationsToday / translationLimitBase) * 100,
                      )}%`,
                    }}
                  />
                </div>
              </div>

              <div className="mt-4">
                <div className="mb-1 flex justify-between text-xs">
                  <span className="text-foreground-muted">Заполненность словаря</span>
                  <span>
                    {dictionaryItemsCount} / {limitLabel(selectedUser.dictionaryLimit)}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-background-hover">
                  <div
                    className="h-full rounded-full bg-accent-secondary"
                    style={{
                      width: `${Math.min(
                        100,
                        (dictionaryItemsCount / dictionaryLimitBase) * 100,
                      )}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2.5 border-b border-border p-5 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-foreground-muted" />
                <span className="text-foreground-muted">Регистрация:</span>
                <span>{new Date(selectedUser.registeredAt).toLocaleDateString("ru-RU")}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-foreground-muted" />
                <span className="text-foreground-muted">Последняя активность:</span>
                <span>{new Date(selectedUser.lastActiveAt).toLocaleString("ru-RU")}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-foreground-muted" />
                <span className="text-foreground-muted">Почта:</span>
                <span>{selectedUser.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-foreground-muted" />
                <span className="text-foreground-muted">Ключ активации:</span>
                <code className="rounded bg-background-hover px-2 py-0.5 font-mono text-xs">
                  {selectedUser.activationKeyPreview}
                </code>
              </div>
            </div>

            <div className="p-5">
              <div className="mb-4">
                <h3 className="text-sm font-semibold">Управление доступом</h3>
                <p className="mt-1 text-xs text-foreground-muted">
                  Можно сменить тариф и задать персональные лимиты. Пустое поле оставляет лимит по тарифу.
                </p>
              </div>

              <div className="space-y-4">
                <label className="block">
                  <span className="mb-1 block text-xs text-foreground-muted">Тариф</span>
                  <select
                    value={draft.plan}
                    onChange={(event) =>
                      setDraft((current) =>
                        current ? { ...current, plan: event.target.value as AdminUser["plan"] } : current,
                      )
                    }
                    className="w-full cursor-pointer appearance-none rounded-lg border border-border bg-background-card px-3 py-2.5 text-sm text-foreground focus:border-accent focus:outline-none"
                  >
                    <option value="free">Бесплатный</option>
                    <option value="basic">Базовый</option>
                    <option value="extended">Расширенный</option>
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs text-foreground-muted">
                    Индивидуальный лимит переводов в день
                  </span>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={draft.translationLimitOverride}
                    onChange={(event) =>
                      setDraft((current) =>
                        current
                          ? { ...current, translationLimitOverride: event.target.value }
                          : current,
                      )
                    }
                    placeholder={`По тарифу: ${limitLabel(
                      selectedUser.translationLimitOverride ?? selectedUser.translationLimit,
                    )}`}
                    className="w-full rounded-lg border border-border bg-background-card px-3 py-2.5 text-sm text-foreground placeholder:text-foreground-muted focus:border-accent focus:outline-none"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs text-foreground-muted">
                    Индивидуальный лимит словаря
                  </span>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={draft.dictionaryLimitOverride}
                    onChange={(event) =>
                      setDraft((current) =>
                        current
                          ? { ...current, dictionaryLimitOverride: event.target.value }
                          : current,
                      )
                    }
                    placeholder={`По тарифу: ${limitLabel(
                      selectedUser.dictionaryLimitOverride ?? selectedUser.dictionaryLimit,
                    )}`}
                    className="w-full rounded-lg border border-border bg-background-card px-3 py-2.5 text-sm text-foreground placeholder:text-foreground-muted focus:border-accent focus:outline-none"
                  />
                </label>
              </div>

              {saveError ? (
                <div className="mt-4 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
                  {saveError}
                </div>
              ) : null}

              {saveSuccess ? (
                <div className="mt-4 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
                  {saveSuccess}
                </div>
              ) : null}

              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={!hasChanges || saving}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {saving ? "Сохраняем..." : "Сохранить"}
                </button>
                <button
                  type="button"
                  onClick={resetOverrides}
                  disabled={saving}
                  className="rounded-lg border border-border bg-background-card px-4 py-2.5 text-sm text-foreground-secondary transition-colors hover:bg-background-hover disabled:opacity-50"
                >
                  Сбросить лимиты
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DetailStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof BookOpen;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <Icon className="h-4 w-4 text-foreground-muted" />
      <div>
        <p className="text-xs text-foreground-muted">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  );
}
