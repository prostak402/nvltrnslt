"use client";

import { useMemo, useState } from "react";
import { Search, Filter, BookOpen, ChevronDown, ChevronUp, MessageSquare, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { apiSend, useApiData } from "@/lib/client/api";
import { studyStatusMeta } from "@/lib/client/presentation";

type PhraseRecord = {
  id: number;
  phrase: string;
  translation: string;
  context: string;
  contextTranslation: string;
  novel: string;
  date: string;
  relativeDate: string;
  status: "new" | "hard" | "learned";
  note: string;
  repetitions: number;
};

type PhrasesResponse = {
  phrases: PhraseRecord[];
  novels: string[];
};

const initialData: PhrasesResponse = {
  phrases: [],
  novels: ["Все новеллы"],
};

export default function PhrasesPage() {
  const { data, loading, error, reload } = useApiData<PhrasesResponse>("/api/dashboard/phrases", initialData);
  const [search, setSearch] = useState("");
  const [selectedNovel, setSelectedNovel] = useState("Все новеллы");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [message, setMessage] = useState("");

  const filtered = useMemo(
    () =>
      data.phrases.filter((phrase) => {
        const term = search.trim().toLowerCase();
        if (
          term &&
          !phrase.phrase.toLowerCase().includes(term) &&
          !phrase.translation.toLowerCase().includes(term) &&
          !phrase.context.toLowerCase().includes(term)
        ) {
          return false;
        }
        if (selectedNovel !== "Все новеллы" && phrase.novel !== selectedNovel) {
          return false;
        }
        return true;
      }),
    [data.phrases, search, selectedNovel],
  );

  const updatePhrase = async (phraseId: number, patch: { status?: PhraseRecord["status"] }) => {
    try {
      setPendingId(phraseId);
      setMessage("");
      await apiSend(`/api/study-items/${phraseId}`, "PATCH", patch);
      await reload();
      setMessage("Изменения сохранены");
    } catch (requestError) {
      setMessage(requestError instanceof Error ? requestError.message : "Не удалось обновить фразу");
    } finally {
      setPendingId(null);
    }
  };

  const deletePhrase = async (phraseId: number) => {
    try {
      setPendingId(phraseId);
      setMessage("");
      await apiSend(`/api/study-items/${phraseId}`, "DELETE");
      await reload();
      setExpandedId(null);
      setMessage("Фраза удалена");
    } catch (requestError) {
      setMessage(requestError instanceof Error ? requestError.message : "Не удалось удалить фразу");
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Фразы</h1>
        <span className="text-foreground-secondary">{filtered.length} фраз</span>
      </div>

      {error ? (
        <div className="mb-6 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          Не удалось загрузить список фраз: {error}
        </div>
      ) : null}

      {message ? <p className="mb-4 text-sm text-foreground-secondary">{message}</p> : null}

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
          <input
            type="text"
            placeholder="Поиск по фразе, переводу или контексту..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-background-card border border-border rounded-lg text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-accent"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
          <select
            value={selectedNovel}
            onChange={(e) => setSelectedNovel(e.target.value)}
            className="pl-10 pr-8 py-2.5 bg-background-card border border-border rounded-lg text-foreground appearance-none cursor-pointer focus:outline-none focus:border-accent"
          >
            {data.novels.map((novel) => (
              <option key={novel}>{novel}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-3">
        {filtered.map((phrase) => (
          <div
            key={phrase.id}
            className="bg-background-card border border-border rounded-xl overflow-hidden transition-colors hover:border-border-hover"
          >
            <div className="p-4 cursor-pointer" onClick={() => setExpandedId(expandedId === phrase.id ? null : phrase.id)}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-medium leading-relaxed">{phrase.phrase}</p>
                  <p className="text-foreground-secondary mt-1 leading-relaxed">{phrase.translation}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge variant={studyStatusMeta[phrase.status].variant}>{studyStatusMeta[phrase.status].label}</Badge>
                  {expandedId === phrase.id ? (
                    <ChevronUp className="w-4 h-4 text-foreground-muted" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-foreground-muted" />
                  )}
                </div>
              </div>
            </div>

            {expandedId === phrase.id ? (
              <div className="px-4 pb-4 pt-0 border-t border-border/50">
                <div className="flex flex-wrap items-center gap-4 pt-3 text-sm text-foreground-muted">
                  <span className="flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-accent" />
                    {phrase.novel}
                  </span>
                  <span>Добавлено: {phrase.date}</span>
                  <span>Повторений: {phrase.repetitions}</span>
                </div>

                {phrase.context ? (
                  <div className="mt-3 space-y-1">
                    <p className="text-xs uppercase tracking-wide text-foreground-muted">Контекст</p>
                    <p className="text-sm text-foreground-secondary italic">&ldquo;{phrase.context}&rdquo;</p>
                    {phrase.contextTranslation ? (
                      <p className="text-sm text-foreground-muted">{phrase.contextTranslation}</p>
                    ) : null}
                  </div>
                ) : null}

                {phrase.note ? (
                  <div className="mt-3 space-y-1">
                    <p className="text-xs uppercase tracking-wide text-foreground-muted">Заметка</p>
                    <p className="text-sm text-foreground-secondary">{phrase.note}</p>
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-2 mt-4">
                  <button
                    type="button"
                    disabled={pendingId === phrase.id}
                    onClick={() => void updatePhrase(phrase.id, { status: "hard" })}
                    className="px-3 py-1.5 text-sm rounded-lg bg-warning/15 text-warning hover:bg-warning/25 transition-colors disabled:opacity-60"
                  >
                    В сложные
                  </button>
                  <button
                    type="button"
                    disabled={pendingId === phrase.id}
                    onClick={() => void updatePhrase(phrase.id, { status: "learned" })}
                    className="px-3 py-1.5 text-sm rounded-lg bg-success/15 text-success hover:bg-success/25 transition-colors disabled:opacity-60"
                  >
                    Выучено
                  </button>
                  <Button variant="secondary" size="sm" href="/dashboard/learning">
                    <MessageSquare className="w-4 h-4 mr-1.5" />
                    В обучение
                  </Button>
                  <button
                    type="button"
                    disabled={pendingId === phrase.id}
                    onClick={() => void deletePhrase(phrase.id)}
                    className="px-3 py-1.5 text-sm rounded-lg bg-danger-light text-danger hover:bg-danger/25 transition-colors disabled:opacity-60"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <Trash2 className="w-4 h-4" />
                      Удалить
                    </span>
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ))}
      </div>

      {!loading && filtered.length === 0 ? (
        <div className="mt-6 rounded-xl border border-border bg-background-card px-4 py-6 text-sm text-foreground-muted">
          По текущим фильтрам фразы не найдены.
        </div>
      ) : null}
    </div>
  );
}
