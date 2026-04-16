"use client";

import { useMemo, useState } from "react";
import {
  Edit3,
  Gamepad2,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import {
  apiSend,
  getApiFieldError,
  isApiError,
  useApiData,
} from "@/lib/client/api";
import { compatibilityStatusMeta } from "@/lib/client/presentation";

type Game = {
  id: number;
  name: string;
  renpyVersion: string;
  status: keyof typeof compatibilityStatusMeta;
  comment: string;
  addedAt: string;
  updatedAt: string;
};

type GameDraft = Omit<Game, "id" | "addedAt" | "updatedAt">;

type GameEditorErrors = {
  name?: string;
  renpyVersion?: string;
  status?: string;
  comment?: string;
};

const initialData: Game[] = [];
const initialDraft: GameDraft = {
  name: "",
  renpyVersion: "",
  status: "testing",
  comment: "",
};

export default function CompatibilityAdminPage() {
  const { data, loading, error, reload } = useApiData<Game[]>(
    "/api/admin/compatibility",
    initialData,
  );
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [editing, setEditing] = useState<Game | null>(null);
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<GameEditorErrors>({});
  const [draft, setDraft] = useState<GameDraft>(initialDraft);

  const filtered = useMemo(
    () =>
      data.filter((game) => {
        const term = search.toLowerCase();
        if (
          term &&
          !game.name.toLowerCase().includes(term) &&
          !game.comment.toLowerCase().includes(term) &&
          !game.renpyVersion.toLowerCase().includes(term)
        ) {
          return false;
        }

        if (filterStatus !== "all" && game.status !== filterStatus) {
          return false;
        }

        return true;
      }),
    [data, filterStatus, search],
  );

  const resetEditorState = () => {
    setAdding(false);
    setEditing(null);
    setFieldErrors({});
  };

  const saveGame = async (payload: {
    id?: number;
    name: string;
    renpyVersion: string;
    status: keyof typeof compatibilityStatusMeta;
    comment: string;
  }) => {
    try {
      setMessage("");
      setFieldErrors({});
      await apiSend("/api/admin/compatibility", "POST", payload);
      resetEditorState();
      setDraft(initialDraft);
      await reload();
      setMessage("Каталог совместимости обновлён.");
    } catch (requestError) {
      if (isApiError(requestError)) {
        const nextErrors = {
          name: getApiFieldError(requestError, "name") ?? undefined,
          renpyVersion:
            getApiFieldError(requestError, "renpyVersion") ?? undefined,
          status: getApiFieldError(requestError, "status") ?? undefined,
          comment: getApiFieldError(requestError, "comment") ?? undefined,
        };

        setFieldErrors(nextErrors);

        if (
          !nextErrors.name &&
          !nextErrors.renpyVersion &&
          !nextErrors.status &&
          !nextErrors.comment
        ) {
          setMessage(requestError.message);
        }

        return;
      }

      setMessage(
        requestError instanceof Error
          ? requestError.message
          : "Не удалось сохранить игру.",
      );
    }
  };

  const deleteGame = async (gameId: number) => {
    try {
      setMessage("");
      await apiSend(`/api/admin/compatibility/${gameId}`, "DELETE");
      await reload();
      setMessage("Игра удалена.");
    } catch (requestError) {
      setMessage(
        requestError instanceof Error
          ? requestError.message
          : "Не удалось удалить игру.",
      );
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Управление совместимостью</h1>
        <button
          type="button"
          onClick={() => {
            setMessage("");
            setDraft(initialDraft);
            resetEditorState();
            setAdding(true);
          }}
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm text-white transition-colors hover:bg-accent-hover"
        >
          <Plus className="h-4 w-4" /> Добавить игру
        </button>
      </div>

      {error ? (
        <div className="mb-4 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          Не удалось загрузить каталог: {error}
        </div>
      ) : null}

      {message ? (
        <p className="mb-4 text-sm text-foreground-secondary">{message}</p>
      ) : null}

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-muted" />
          <input
            type="text"
            placeholder="Поиск по названию, версии или комментарию..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full rounded-lg border border-border bg-background-card py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-foreground-muted focus:border-accent focus:outline-none"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(event) => setFilterStatus(event.target.value)}
          className="cursor-pointer appearance-none rounded-lg border border-border bg-background-card px-3 py-2.5 text-sm text-foreground focus:border-accent focus:outline-none"
        >
          <option value="all">Все статусы</option>
          {Object.entries(compatibilityStatusMeta).map(([value, meta]) => (
            <option key={value} value={value}>
              {meta.label}
            </option>
          ))}
        </select>
      </div>

      {adding ? (
        <Card className="mb-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-semibold">
              <Gamepad2 className="h-4 w-4" /> Новая игра
            </h3>
            <button
              type="button"
              onClick={() => {
                setDraft(initialDraft);
                resetEditorState();
              }}
              className="text-foreground-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <GameEditor
            value={draft}
            errors={fieldErrors}
            onChange={setDraft}
            onSave={() => void saveGame(draft)}
            onCancel={() => {
              setDraft(initialDraft);
              resetEditorState();
            }}
          />
        </Card>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-border bg-background-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-foreground-muted">
                <th className="px-4 py-3 font-medium">Название</th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">
                  Ren&apos;Py
                </th>
                <th className="px-4 py-3 font-medium">Статус</th>
                <th className="hidden px-4 py-3 font-medium lg:table-cell">
                  Комментарий
                </th>
                <th className="hidden px-4 py-3 font-medium lg:table-cell">
                  Обновлено
                </th>
                <th className="w-24 px-4 py-3 font-medium">Действия</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((game) => {
                const status = compatibilityStatusMeta[game.status];

                if (editing?.id === game.id) {
                  return (
                    <tr
                      key={game.id}
                      className="border-b border-border/50 bg-accent-light/20"
                    >
                      <td className="px-4 py-2" colSpan={6}>
                        <GameEditor
                          value={editing}
                          errors={fieldErrors}
                          onChange={(next) => setEditing({ ...editing, ...next })}
                          onSave={() => void saveGame(editing)}
                          onCancel={() => {
                            setFieldErrors({});
                            setEditing(null);
                          }}
                        />
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr
                    key={game.id}
                    className="border-b border-border/50 transition-colors hover:bg-background-hover/50"
                  >
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium">{game.name}</span>
                    </td>
                    <td className="hidden px-4 py-3 text-sm text-foreground-secondary md:table-cell">
                      {game.renpyVersion}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </td>
                    <td className="hidden max-w-[250px] truncate px-4 py-3 text-xs text-foreground-muted lg:table-cell">
                      {game.comment}
                    </td>
                    <td className="hidden px-4 py-3 text-xs text-foreground-muted lg:table-cell">
                      {new Date(game.updatedAt).toLocaleDateString("ru-RU")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setMessage("");
                            setAdding(false);
                            setFieldErrors({});
                            setEditing(game);
                          }}
                          className="rounded p-1.5 text-foreground-muted transition-colors hover:bg-background-hover hover:text-foreground"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void deleteGame(game.id)}
                          className="rounded p-1.5 text-foreground-muted transition-colors hover:bg-danger-light hover:text-danger"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!loading && filtered.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-foreground-muted" colSpan={6}>
                    В каталоге нет записей по текущему фильтру.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function GameEditor({
  value,
  errors,
  onChange,
  onSave,
  onCancel,
}: {
  value: GameDraft;
  errors?: GameEditorErrors;
  onChange: (value: GameDraft) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div>
        <input
          type="text"
          placeholder="Название игры"
          value={value.name}
          onChange={(event) => onChange({ ...value, name: event.target.value })}
          className={`w-full rounded-lg border bg-background-hover px-3 py-2.5 text-sm focus:border-accent focus:outline-none ${
            errors?.name ? "border-danger" : "border-border"
          }`}
        />
        {errors?.name ? (
          <p className="mt-1 text-sm text-danger">{errors.name}</p>
        ) : null}
      </div>

      <div>
        <input
          type="text"
          placeholder="Версия Ren'Py"
          value={value.renpyVersion}
          onChange={(event) =>
            onChange({ ...value, renpyVersion: event.target.value })
          }
          className={`w-full rounded-lg border bg-background-hover px-3 py-2.5 text-sm focus:border-accent focus:outline-none ${
            errors?.renpyVersion ? "border-danger" : "border-border"
          }`}
        />
        {errors?.renpyVersion ? (
          <p className="mt-1 text-sm text-danger">{errors.renpyVersion}</p>
        ) : null}
      </div>

      <div>
        <select
          value={value.status}
          onChange={(event) =>
            onChange({
              ...value,
              status: event.target.value as keyof typeof compatibilityStatusMeta,
            })
          }
          className={`w-full cursor-pointer appearance-none rounded-lg border bg-background-hover px-3 py-2.5 text-sm focus:border-accent focus:outline-none ${
            errors?.status ? "border-danger" : "border-border"
          }`}
        >
          {Object.entries(compatibilityStatusMeta).map(([status, meta]) => (
            <option key={status} value={status}>
              {meta.label}
            </option>
          ))}
        </select>
        {errors?.status ? (
          <p className="mt-1 text-sm text-danger">{errors.status}</p>
        ) : null}
      </div>

      <div>
        <input
          type="text"
          placeholder="Комментарий"
          value={value.comment}
          onChange={(event) =>
            onChange({ ...value, comment: event.target.value })
          }
          className={`w-full rounded-lg border bg-background-hover px-3 py-2.5 text-sm focus:border-accent focus:outline-none ${
            errors?.comment ? "border-danger" : "border-border"
          }`}
        />
        {errors?.comment ? (
          <p className="mt-1 text-sm text-danger">{errors.comment}</p>
        ) : null}
      </div>

      <div className="flex gap-2 md:col-span-2">
        <button
          type="button"
          onClick={onSave}
          disabled={!value.name.trim()}
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm text-white transition-colors hover:bg-accent-hover disabled:opacity-40"
        >
          <Save className="h-4 w-4" /> Сохранить
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-2 rounded-lg bg-background-hover px-4 py-2 text-sm text-foreground-secondary transition-colors hover:bg-background-card"
        >
          <X className="h-4 w-4" /> Отмена
        </button>
      </div>
    </div>
  );
}
