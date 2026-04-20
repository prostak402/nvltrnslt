"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Filter,
  SortAsc,
  LayoutGrid,
  LayoutList,
  BookOpen,
  X,
  Star,
  Check,
  Trash2,
  MessageSquare,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { apiSend, useApiData } from "@/lib/client/api";
import { studyQueueMeta, studyStatusMeta } from "@/lib/client/presentation";

type WordRecord = {
  id: number;
  word: string;
  translation: string;
  context: string;
  contextTranslation: string;
  novel: string;
  date: string;
  relativeDate: string;
  status: "new" | "hard" | "learned";
  isActive: boolean;
  isDue: boolean;
  learningStage: number;
  note: string;
  repetitions: number;
  nextReviewAt: string;
};

type WordsResponse = {
  words: WordRecord[];
  novels: string[];
};

const initialData: WordsResponse = {
  words: [],
  novels: ["Все новеллы"],
};

const sortOptions = [
  { value: "newest", label: "По дате (новые)" },
  { value: "oldest", label: "По дате (старые)" },
  { value: "alphabet", label: "По алфавиту" },
  { value: "status", label: "По статусу" },
] as const;

type SortOption = (typeof sortOptions)[number]["value"];

export default function WordsPage() {
  const { data, loading, error, reload } = useApiData<WordsResponse>("/api/dashboard/words", initialData);
  const [search, setSearch] = useState("");
  const [selectedNovel, setSelectedNovel] = useState("Все новеллы");
  const [selectedStatus, setSelectedStatus] = useState<"all" | WordRecord["status"]>("all");
  const [selectedSort, setSelectedSort] = useState<SortOption>("newest");
  const [viewMode, setViewMode] = useState<"list" | "cards">("list");
  const [selectedWordId, setSelectedWordId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [draftTranslation, setDraftTranslation] = useState("");
  const [draftNote, setDraftNote] = useState("");
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const wordsPerPage = 10;

  const filtered = useMemo(() => {
    const items = data.words.filter((word) => {
      const term = search.trim().toLowerCase();
      if (
        term &&
        !word.word.toLowerCase().includes(term) &&
        !word.translation.toLowerCase().includes(term) &&
        !word.context.toLowerCase().includes(term)
      ) {
        return false;
      }
      if (selectedNovel !== "Все новеллы" && word.novel !== selectedNovel) {
        return false;
      }
      if (selectedStatus !== "all" && word.status !== selectedStatus) {
        return false;
      }
      return true;
    });

    return items.sort((left, right) => {
      if (selectedSort === "alphabet") {
        return left.word.localeCompare(right.word, "en");
      }
      if (selectedSort === "status") {
        return left.status.localeCompare(right.status, "ru");
      }
      const leftDate = Date.parse(left.nextReviewAt);
      const rightDate = Date.parse(right.nextReviewAt);
      return selectedSort === "oldest" ? leftDate - rightDate : rightDate - leftDate;
    });
  }, [data.words, search, selectedNovel, selectedSort, selectedStatus]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / wordsPerPage));
  const paginated = filtered.slice((currentPage - 1) * wordsPerPage, currentPage * wordsPerPage);
  const selectedWord = data.words.find((word) => word.id === selectedWordId) ?? null;

  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedNovel, selectedSort, selectedStatus]);

  useEffect(() => {
    if (!selectedWordId && filtered[0]) {
      setSelectedWordId(filtered[0].id);
    }
    if (selectedWordId && !data.words.find((word) => word.id === selectedWordId)) {
      setSelectedWordId(filtered[0]?.id ?? null);
    }
  }, [data.words, filtered, selectedWordId]);

  useEffect(() => {
    setDraftTranslation(selectedWord?.translation ?? "");
    setDraftNote(selectedWord?.note ?? "");
    setMessage("");
  }, [selectedWord]);

  const savePatch = async (patch: Partial<Pick<WordRecord, "translation" | "note" | "status" | "isActive">>) => {
    if (!selectedWord) return;
    try {
      setIsSaving(true);
      await apiSend(`/api/study-items/${selectedWord.id}`, "PATCH", patch);
      await reload();
      setMessage("Изменения сохранены");
    } catch (requestError) {
      setMessage(requestError instanceof Error ? requestError.message : "Не удалось сохранить изменения");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteWord = async () => {
    if (!selectedWord) return;
    try {
      setIsSaving(true);
      await apiSend(`/api/study-items/${selectedWord.id}`, "DELETE");
      setSelectedWordId(null);
      await reload();
      setMessage("Карточка удалена");
    } catch (requestError) {
      setMessage(requestError instanceof Error ? requestError.message : "Не удалось удалить карточку");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex gap-6">
      <div className={`flex-1 min-w-0 ${selectedWord ? "max-w-[calc(100%-380px)]" : ""}`}>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Слова</h1>
          <span className="text-foreground-secondary">{filtered.length} слов</span>
        </div>

        {error ? (
          <div className="mb-6 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
            Не удалось загрузить словарь: {error}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
            <input
              type="text"
              placeholder="Поиск по слову, переводу или контексту..."
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
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as "all" | WordRecord["status"])}
            className="px-4 py-2.5 bg-background-card border border-border rounded-lg text-foreground appearance-none cursor-pointer focus:outline-none focus:border-accent"
          >
            <option value="all">Все статусы</option>
            <option value="new">Новое</option>
            <option value="hard">Сложное</option>
            <option value="learned">Выучено</option>
          </select>
          <div className="relative">
            <SortAsc className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
            <select
              value={selectedSort}
              onChange={(e) => setSelectedSort(e.target.value as SortOption)}
              className="pl-10 pr-8 py-2.5 bg-background-card border border-border rounded-lg text-foreground appearance-none cursor-pointer focus:outline-none focus:border-accent"
            >
              {sortOptions.map((sort) => (
                <option key={sort.value} value={sort.value}>
                  {sort.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex border border-border rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`p-2.5 ${viewMode === "list" ? "bg-accent text-white" : "bg-background-card text-foreground-secondary hover:bg-background-hover"}`}
            >
              <LayoutList className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              className={`p-2.5 ${viewMode === "cards" ? "bg-accent text-white" : "bg-background-card text-foreground-secondary hover:bg-background-hover"}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>

        {viewMode === "list" ? (
          <div className="bg-background-card border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left text-foreground-secondary text-sm">
                  <th className="px-4 py-3 font-medium">Слово</th>
                  <th className="px-4 py-3 font-medium">Перевод</th>
                  <th className="px-4 py-3 font-medium hidden lg:table-cell">Контекст</th>
                  <th className="px-4 py-3 font-medium hidden md:table-cell">Новелла</th>
                  <th className="px-4 py-3 font-medium hidden sm:table-cell">Когда</th>
                  <th className="px-4 py-3 font-medium">Статус</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((word) => (
                  <tr
                    key={word.id}
                    onClick={() => setSelectedWordId(word.id)}
                    className={`border-b border-border/50 cursor-pointer transition-colors hover:bg-background-hover ${
                      selectedWord?.id === word.id ? "bg-accent-light" : ""
                    }`}
                  >
                    <td className="px-4 py-3 font-medium">{word.word}</td>
                    <td className="px-4 py-3 text-foreground-secondary">{word.translation}</td>
                    <td className="px-4 py-3 text-foreground-muted text-sm hidden lg:table-cell max-w-[220px] truncate">
                      {word.context}
                    </td>
                    <td className="px-4 py-3 text-foreground-secondary text-sm hidden md:table-cell">{word.novel}</td>
                    <td className="px-4 py-3 text-foreground-muted text-sm hidden sm:table-cell">{word.relativeDate}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        <Badge variant={studyStatusMeta[word.status].variant}>{studyStatusMeta[word.status].label}</Badge>
                        <Badge variant={studyQueueMeta(word).variant}>{studyQueueMeta(word).label}</Badge>
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && paginated.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-foreground-muted" colSpan={6}>
                      По текущим фильтрам слов не найдено.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginated.map((word) => (
              <div
                key={word.id}
                onClick={() => setSelectedWordId(word.id)}
                className={`p-4 bg-background-card border border-border rounded-xl cursor-pointer transition-colors hover:border-accent ${
                  selectedWord?.id === word.id ? "border-accent bg-accent-light" : ""
                }`}
              >
                <div className="flex items-center justify-between mb-2 gap-3">
                  <span className="font-bold text-lg truncate">{word.word}</span>
                  <div className="flex flex-wrap gap-1.5 justify-end">
                    <Badge variant={studyStatusMeta[word.status].variant}>{studyStatusMeta[word.status].label}</Badge>
                    <Badge variant={studyQueueMeta(word).variant}>{studyQueueMeta(word).label}</Badge>
                  </div>
                </div>
                <p className="text-foreground-secondary mb-2">{word.translation}</p>
                <p className="text-foreground-muted text-sm mb-3 line-clamp-2">{word.context}</p>
                <div className="flex items-center justify-between text-xs text-foreground-muted gap-2">
                  <span className="flex items-center gap-1 truncate">
                    <BookOpen className="w-3 h-3 shrink-0" />
                    {word.novel}
                  </span>
                  <span>{word.relativeDate}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 ? (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg bg-background-card border border-border disabled:opacity-40 hover:bg-background-hover"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: totalPages }, (_, index) => (
              <button
                key={index + 1}
                type="button"
                onClick={() => setCurrentPage(index + 1)}
                className={`w-9 h-9 rounded-lg text-sm ${
                  currentPage === index + 1 ? "bg-accent text-white" : "bg-background-card border border-border hover:bg-background-hover"
                }`}
              >
                {index + 1}
              </button>
            ))}
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

      {selectedWord ? (
        <div className="hidden lg:block w-[360px] flex-shrink-0">
          <div className="sticky top-6 bg-background-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="space-y-2">
                <h2 className="text-xl font-bold">{selectedWord.word}</h2>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant={studyStatusMeta[selectedWord.status].variant}>{studyStatusMeta[selectedWord.status].label}</Badge>
                  <Badge variant={studyQueueMeta(selectedWord).variant}>{studyQueueMeta(selectedWord).label}</Badge>
                </div>
              </div>
              <button type="button" onClick={() => setSelectedWordId(null)} className="text-foreground-muted hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <span className="text-xs text-foreground-muted uppercase tracking-wide">Перевод</span>
                <input
                  value={draftTranslation}
                  onChange={(e) => setDraftTranslation(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-background-hover px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <span className="text-xs text-foreground-muted uppercase tracking-wide">Контекст</span>
                <p className="text-sm mt-1 text-foreground-secondary italic">&ldquo;{selectedWord.context || "Нет контекста"}&rdquo;</p>
                {selectedWord.contextTranslation ? (
                  <p className="text-sm mt-1 text-foreground-muted">{selectedWord.contextTranslation}</p>
                ) : null}
              </div>

              <div>
                <span className="text-xs text-foreground-muted uppercase tracking-wide">Новелла</span>
                <p className="text-sm mt-1 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-accent" />
                  {selectedWord.novel}
                </p>
              </div>

              <div className="flex gap-4">
                <div>
                  <span className="text-xs text-foreground-muted uppercase tracking-wide">Добавлено</span>
                  <p className="text-sm mt-1">{selectedWord.date}</p>
                </div>
                <div>
                  <span className="text-xs text-foreground-muted uppercase tracking-wide">Повторений</span>
                  <p className="text-sm mt-1">{selectedWord.repetitions}</p>
                </div>
              </div>

              <div>
                <span className="text-xs text-foreground-muted uppercase tracking-wide">Заметка</span>
                <textarea
                  value={draftNote}
                  onChange={(e) => setDraftNote(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-border bg-background-hover px-3 py-2 text-sm text-foreground resize-none focus:outline-none focus:border-accent"
                  placeholder="Например: путаю с похожим словом, полезная ассоциация, контекст из сцены..."
                />
              </div>

              {message ? <p className="text-sm text-foreground-secondary">{message}</p> : null}

              <div className="pt-4 border-t border-border space-y-2">
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => void savePatch({ translation: draftTranslation.trim(), note: draftNote.trim() })}
                  className="w-full !justify-start"
                  disabled={isSaving}
                >
                  <MessageSquare className="w-4 h-4 mr-2 text-accent" />
                  Сохранить перевод и заметку
                </Button>
                {!selectedWord.isActive && selectedWord.status !== "learned" ? (
                  <button
                    type="button"
                    onClick={() => void savePatch({ isActive: true })}
                    className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg bg-accent-light text-accent hover:bg-accent/20 transition-colors text-sm"
                  >
                    <Check className="w-4 h-4" /> �������� � ��������
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => void savePatch({ status: "hard" })}
                  className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg bg-warning/15 text-warning hover:bg-warning/25 transition-colors text-sm"
                >
                  <Star className="w-4 h-4" /> Отметить как сложное
                </button>
                <Button variant="secondary" size="md" href="/dashboard/learning" className="w-full !justify-start">
                  <RotateCcw className="w-4 h-4 mr-2 text-accent-secondary" />
                  Перейти к повторению
                </Button>
                <button
                  type="button"
                  onClick={() => void deleteWord()}
                  className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg bg-danger-light text-danger hover:bg-danger/25 transition-colors text-sm"
                >
                  <Trash2 className="w-4 h-4" /> Удалить
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
