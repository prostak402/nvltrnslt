"use client";

import { useState } from "react";
import {
  Plus,
  Edit3,
  Trash2,
  Search,
  CheckCircle,
  AlertTriangle,
  Loader2,
  XCircle,
  Save,
  X,
  Gamepad2,
} from "lucide-react";
import { Card } from "@/components/ui/Card";

interface Game {
  id: number;
  name: string;
  renpyVersion: string;
  status: "full" | "partial" | "testing" | "unsupported";
  comment: string;
  addedAt: string;
  updatedAt: string;
}

const statusConfig: Record<string, { label: string; cls: string; icon: typeof CheckCircle }> = {
  full: { label: "Полностью работает", cls: "bg-success/15 text-success", icon: CheckCircle },
  partial: { label: "С ограничениями", cls: "bg-warning/15 text-warning", icon: AlertTriangle },
  testing: { label: "Тестируется", cls: "bg-accent-light text-accent", icon: Loader2 },
  unsupported: { label: "Не поддерживается", cls: "bg-danger-light text-danger", icon: XCircle },
};

const initialGames: Game[] = [
  { id: 1, name: "Doki Doki Literature Club", renpyVersion: "7.4.11", status: "full", comment: "Полная совместимость со всеми функциями", addedAt: "01.01.2026", updatedAt: "05.04.2026" },
  { id: 2, name: "Katawa Shoujo", renpyVersion: "6.99.12", status: "full", comment: "Работает стабильно", addedAt: "01.01.2026", updatedAt: "03.04.2026" },
  { id: 3, name: "Everlasting Summer", renpyVersion: "7.3.5", status: "full", comment: "Полная совместимость, включая DLC", addedAt: "01.01.2026", updatedAt: "05.04.2026" },
  { id: 4, name: "Clannad", renpyVersion: "6.99.14", status: "partial", comment: "Старая версия движка, перевод фраз может работать нестабильно", addedAt: "15.01.2026", updatedAt: "02.04.2026" },
  { id: 5, name: "Steins;Gate", renpyVersion: "7.4.0", status: "full", comment: "Работает корректно", addedAt: "15.01.2026", updatedAt: "01.04.2026" },
  { id: 6, name: "The Fruit of Grisaia", renpyVersion: "7.3.2", status: "partial", comment: "Нестандартный интерфейс, всплывающее окно может перекрываться", addedAt: "01.02.2026", updatedAt: "28.03.2026" },
  { id: 7, name: "Umineko no Naku Koro ni", renpyVersion: "7.5.0", status: "testing", comment: "В процессе тестирования на версии 7.5", addedAt: "20.03.2026", updatedAt: "08.04.2026" },
  { id: 8, name: "Saya no Uta", renpyVersion: "6.18.0", status: "unsupported", comment: "Слишком старая версия Ren'Py, мод не загружается", addedAt: "01.02.2026", updatedAt: "01.02.2026" },
  { id: 9, name: "Lucy: The Eternity She Wished For", renpyVersion: "7.4.8", status: "full", comment: "Полная совместимость", addedAt: "01.03.2026", updatedAt: "25.03.2026" },
  { id: 10, name: "Narcissu", renpyVersion: "7.2.0", status: "testing", comment: "Тестирование совместимости в процессе", addedAt: "05.04.2026", updatedAt: "10.04.2026" },
];

export default function CompatibilityAdminPage() {
  const [games, setGames] = useState(initialGames);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [editing, setEditing] = useState<Game | null>(null);
  const [adding, setAdding] = useState(false);
  const [newGame, setNewGame] = useState<Omit<Game, "id" | "addedAt" | "updatedAt">>({
    name: "", renpyVersion: "", status: "testing", comment: "",
  });

  const filtered = games.filter((g) => {
    if (search && !g.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus !== "all" && g.status !== filterStatus) return false;
    return true;
  });

  const handleDelete = (id: number) => {
    setGames(games.filter((g) => g.id !== id));
  };

  const handleAdd = () => {
    if (!newGame.name.trim()) return;
    const now = new Date().toLocaleDateString("ru-RU");
    setGames([...games, { ...newGame, id: Date.now(), addedAt: now, updatedAt: now }]);
    setNewGame({ name: "", renpyVersion: "", status: "testing", comment: "" });
    setAdding(false);
  };

  const handleSaveEdit = () => {
    if (!editing) return;
    setGames(games.map((g) => g.id === editing.id ? { ...editing, updatedAt: new Date().toLocaleDateString("ru-RU") } : g));
    setEditing(null);
  };

  const statusCounts = {
    full: games.filter((g) => g.status === "full").length,
    partial: games.filter((g) => g.status === "partial").length,
    testing: games.filter((g) => g.status === "testing").length,
    unsupported: games.filter((g) => g.status === "unsupported").length,
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">Управление совместимостью</h1>
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg text-sm transition-colors"
        >
          <Plus className="w-4 h-4" /> Добавить игру
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {(Object.entries(statusCounts) as [keyof typeof statusConfig, number][]).map(([key, count]) => {
          const Icon = statusConfig[key].icon;
          return (
            <div key={key} className="bg-background-card border border-border rounded-xl p-4 flex items-center gap-3">
              <Icon className={`w-5 h-5 ${statusConfig[key].cls.split(" ")[1]}`} />
              <div>
                <p className="text-lg font-bold">{count}</p>
                <p className="text-xs text-foreground-muted">{statusConfig[key].label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
          <input
            type="text"
            placeholder="Поиск по названию..."
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
          <option value="full">Полностью работает</option>
          <option value="partial">С ограничениями</option>
          <option value="testing">Тестируется</option>
          <option value="unsupported">Не поддерживается</option>
        </select>
      </div>

      {/* Add form */}
      {adding && (
        <Card className="mb-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2"><Gamepad2 className="w-4 h-4" /> Новая игра</h3>
            <button onClick={() => setAdding(false)} className="text-foreground-muted hover:text-foreground"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <input
              type="text"
              placeholder="Название игры"
              value={newGame.name}
              onChange={(e) => setNewGame({ ...newGame, name: e.target.value })}
              className="px-3 py-2.5 bg-background-hover border border-border rounded-lg text-sm focus:outline-none focus:border-accent"
            />
            <input
              type="text"
              placeholder="Версия Ren'Py"
              value={newGame.renpyVersion}
              onChange={(e) => setNewGame({ ...newGame, renpyVersion: e.target.value })}
              className="px-3 py-2.5 bg-background-hover border border-border rounded-lg text-sm focus:outline-none focus:border-accent"
            />
            <select
              value={newGame.status}
              onChange={(e) => setNewGame({ ...newGame, status: e.target.value as Game["status"] })}
              className="px-3 py-2.5 bg-background-hover border border-border rounded-lg text-sm appearance-none cursor-pointer focus:outline-none focus:border-accent"
            >
              <option value="full">Полностью работает</option>
              <option value="partial">С ограничениями</option>
              <option value="testing">Тестируется</option>
              <option value="unsupported">Не поддерживается</option>
            </select>
            <input
              type="text"
              placeholder="Комментарий"
              value={newGame.comment}
              onChange={(e) => setNewGame({ ...newGame, comment: e.target.value })}
              className="px-3 py-2.5 bg-background-hover border border-border rounded-lg text-sm focus:outline-none focus:border-accent"
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={!newGame.name.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover disabled:opacity-40 text-white rounded-lg text-sm transition-colors"
          >
            <Save className="w-4 h-4" /> Добавить
          </button>
        </Card>
      )}

      {/* Games table */}
      <div className="bg-background-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left text-xs text-foreground-muted uppercase tracking-wider">
                <th className="px-4 py-3 font-medium">Название</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Ren&apos;Py</th>
                <th className="px-4 py-3 font-medium">Статус</th>
                <th className="px-4 py-3 font-medium hidden lg:table-cell">Комментарий</th>
                <th className="px-4 py-3 font-medium hidden lg:table-cell">Обновлено</th>
                <th className="px-4 py-3 font-medium w-24">Действия</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((game) => {
                const sc = statusConfig[game.status];
                const StatusIcon = sc.icon;
                const isEditing = editing?.id === game.id;

                if (isEditing && editing) {
                  return (
                    <tr key={game.id} className="border-b border-border/50 bg-accent-light/20">
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={editing.name}
                          onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                          className="w-full px-2 py-1.5 bg-background-hover border border-border rounded text-sm focus:outline-none focus:border-accent"
                        />
                      </td>
                      <td className="px-4 py-2 hidden md:table-cell">
                        <input
                          type="text"
                          value={editing.renpyVersion}
                          onChange={(e) => setEditing({ ...editing, renpyVersion: e.target.value })}
                          className="w-full px-2 py-1.5 bg-background-hover border border-border rounded text-sm focus:outline-none focus:border-accent"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <select
                          value={editing.status}
                          onChange={(e) => setEditing({ ...editing, status: e.target.value as Game["status"] })}
                          className="px-2 py-1.5 bg-background-hover border border-border rounded text-sm appearance-none cursor-pointer focus:outline-none focus:border-accent"
                        >
                          <option value="full">Полностью</option>
                          <option value="partial">С ограничениями</option>
                          <option value="testing">Тестируется</option>
                          <option value="unsupported">Не поддерж.</option>
                        </select>
                      </td>
                      <td className="px-4 py-2 hidden lg:table-cell">
                        <input
                          type="text"
                          value={editing.comment}
                          onChange={(e) => setEditing({ ...editing, comment: e.target.value })}
                          className="w-full px-2 py-1.5 bg-background-hover border border-border rounded text-sm focus:outline-none focus:border-accent"
                        />
                      </td>
                      <td className="px-4 py-2 hidden lg:table-cell text-xs text-foreground-muted">{game.updatedAt}</td>
                      <td className="px-4 py-2">
                        <div className="flex gap-1">
                          <button onClick={handleSaveEdit} className="p-1.5 rounded hover:bg-success/15 text-success transition-colors"><Save className="w-4 h-4" /></button>
                          <button onClick={() => setEditing(null)} className="p-1.5 rounded hover:bg-background-hover text-foreground-muted transition-colors"><X className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={game.id} className="border-b border-border/50 hover:bg-background-hover/50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium">{game.name}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground-secondary hidden md:table-cell">{game.renpyVersion}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${sc.cls}`}>
                        <StatusIcon className="w-3 h-3" />
                        <span className="hidden sm:inline">{sc.label}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-foreground-muted hidden lg:table-cell max-w-[250px] truncate">{game.comment}</td>
                    <td className="px-4 py-3 text-xs text-foreground-muted hidden lg:table-cell">{game.updatedAt}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => setEditing(game)} className="p-1.5 rounded hover:bg-background-hover text-foreground-muted hover:text-foreground transition-colors"><Edit3 className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(game.id)} className="p-1.5 rounded hover:bg-danger-light text-foreground-muted hover:text-danger transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
