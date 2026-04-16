"use client";

import { useMemo, useState } from "react";
import { Info, Search, Shield } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { useApiData } from "@/lib/client/api";
import { compatibilityStatusMeta } from "@/lib/client/presentation";

type CompatibilityResponse = {
  games: Array<{
    id: number;
    name: string;
    renpyVersion: string;
    status: "full" | "partial" | "testing" | "unsupported";
    comment: string;
  }>;
  limitations: Array<{
    title: string;
    description: string;
  }>;
};

const initialData: CompatibilityResponse = {
  games: [],
  limitations: [],
};

export default function CompatibilityClient() {
  const { data, loading, error } = useApiData<CompatibilityResponse>("/api/public/compatibility", initialData);
  const [search, setSearch] = useState("");

  const filteredGames = useMemo(
    () =>
      data.games.filter((game) => {
        const term = search.trim().toLowerCase();
        if (!term) {
          return true;
        }
        return (
          game.name.toLowerCase().includes(term) ||
          game.renpyVersion.toLowerCase().includes(term) ||
          game.comment.toLowerCase().includes(term)
        );
      }),
    [data.games, search],
  );

  return (
    <main className="min-h-screen py-16 px-4">
      <div className="max-w-7xl mx-auto space-y-16">
        <section className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-accent-light text-accent px-4 py-1.5 rounded-full text-sm font-medium mb-6">
            <Shield className="w-4 h-4" />
            Совместимость
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">Совместимость с играми</h1>
          <p className="text-lg text-foreground-secondary leading-relaxed">
            NVLingo рассчитан на визуальные новеллы на движке Ren&apos;Py. Ниже собран реальный каталог
            протестированных игр из той же базы, что используется в админке.
          </p>
        </section>

        <section className="bg-accent-light border border-accent/20 rounded-2xl p-6 md:p-8 flex items-start gap-4">
          <Info className="w-6 h-6 text-accent flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Важно знать</h3>
            <p className="text-foreground-secondary leading-relaxed">
              Сервис поддерживает десктопные Ren&apos;Py 7.x и 8.x. Игры с сильно кастомизированным интерфейсом и
              мобильные порты могут работать с ограничениями.
            </p>
          </div>
        </section>

        {error ? (
          <section className="rounded-2xl border border-danger/30 bg-danger/10 px-6 py-4 text-danger">
            Не удалось загрузить каталог совместимости: {error}
          </section>
        ) : null}

        <section>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
            <div>
              <h2 className="text-3xl font-bold text-foreground">Протестированные игры</h2>
              <p className="text-foreground-secondary mt-2">
                {filteredGames.length} записей{loading ? " (загрузка...)" : ""}
              </p>
            </div>
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full rounded-xl border border-border bg-background-card px-10 py-3 text-sm text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-accent"
                placeholder="Поиск по названию, версии или комментарию..."
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="text-left text-foreground-secondary text-sm font-medium p-4 border-b border-border">Название</th>
                  <th className="text-left text-foreground-secondary text-sm font-medium p-4 border-b border-border">Версия Ren&apos;Py</th>
                  <th className="text-left text-foreground-secondary text-sm font-medium p-4 border-b border-border">Статус</th>
                  <th className="text-left text-foreground-secondary text-sm font-medium p-4 border-b border-border">Комментарий</th>
                </tr>
              </thead>
              <tbody>
                {filteredGames.map((game) => {
                  const status = compatibilityStatusMeta[game.status];
                  return (
                    <tr key={game.id} className="hover:bg-background-hover transition-colors">
                      <td className="p-4 border-b border-border">
                        <span className="text-foreground font-medium">{game.name}</span>
                      </td>
                      <td className="p-4 border-b border-border">
                        <span className="text-foreground-secondary text-sm font-mono">{game.renpyVersion}</span>
                      </td>
                      <td className="p-4 border-b border-border">
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </td>
                      <td className="p-4 border-b border-border">
                        <span className="text-foreground-secondary text-sm">{game.comment}</span>
                      </td>
                    </tr>
                  );
                })}
                {!loading && filteredGames.length === 0 ? (
                  <tr>
                    <td className="p-4 text-foreground-muted" colSpan={4}>
                      По текущему запросу игры не найдены.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-foreground text-center mb-4">Известные ограничения</h2>
          <p className="text-foreground-secondary text-center mb-12 max-w-2xl mx-auto">
            Эти ограничения формируют реальный опыт использования мода и учитываются при развитии MVP.
          </p>
          <div className="grid sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {data.limitations.map((item) => (
              <div key={item.title} className="bg-background-card border border-border rounded-xl p-6 hover:border-border-hover transition-colors">
                <h3 className="text-lg font-semibold text-foreground mb-2">{item.title}</h3>
                <p className="text-foreground-secondary text-sm leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
