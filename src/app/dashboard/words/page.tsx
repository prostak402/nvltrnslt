"use client";

import { useState } from "react";
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

const novels = [
  "Все новеллы",
  "Doki Doki Literature Club",
  "Katawa Shoujo",
  "Everlasting Summer",
  "Clannad",
  "Steins;Gate",
];

const statuses = ["Все статусы", "Новое", "Сложное", "Выучено"];
const sorts = ["По дате (новые)", "По дате (старые)", "По алфавиту", "По статусу"];

interface Word {
  id: number;
  word: string;
  translation: string;
  context: string;
  contextTranslation: string;
  novel: string;
  date: string;
  status: "new" | "difficult" | "learned";
  note: string;
  repetitions: number;
}

const mockWords: Word[] = [
  { id: 1, word: "reluctant", translation: "неохотный", context: "She was reluctant to leave the room.", contextTranslation: "Она неохотно покидала комнату.", novel: "Doki Doki Literature Club", date: "10.04.2026", status: "new", note: "", repetitions: 0 },
  { id: 2, word: "beneath", translation: "под, внизу", context: "The truth lies beneath the surface.", contextTranslation: "Правда скрыта под поверхностью.", novel: "Katawa Shoujo", date: "10.04.2026", status: "new", note: "", repetitions: 0 },
  { id: 3, word: "despair", translation: "отчаяние", context: "A wave of despair washed over him.", contextTranslation: "Волна отчаяния накрыла его.", novel: "Everlasting Summer", date: "09.04.2026", status: "difficult", note: "Часто встречается", repetitions: 3 },
  { id: 4, word: "glimpse", translation: "мельком увидеть", context: "I caught a glimpse of her smile.", contextTranslation: "Я мельком увидел её улыбку.", novel: "Clannad", date: "09.04.2026", status: "learned", note: "", repetitions: 5 },
  { id: 5, word: "presumably", translation: "предположительно", context: "Presumably, she already knew the answer.", contextTranslation: "Предположительно, она уже знала ответ.", novel: "Steins;Gate", date: "09.04.2026", status: "new", note: "", repetitions: 0 },
  { id: 6, word: "contempt", translation: "презрение", context: "He looked at me with contempt.", contextTranslation: "Он посмотрел на меня с презрением.", novel: "Doki Doki Literature Club", date: "08.04.2026", status: "difficult", note: "", repetitions: 2 },
  { id: 7, word: "fade", translation: "угасать", context: "The memories slowly fade away.", contextTranslation: "Воспоминания медленно угасают.", novel: "Katawa Shoujo", date: "08.04.2026", status: "learned", note: "", repetitions: 7 },
  { id: 8, word: "burden", translation: "бремя, ноша", context: "She carried the burden alone.", contextTranslation: "Она несла эту ношу одна.", novel: "Everlasting Summer", date: "08.04.2026", status: "new", note: "", repetitions: 0 },
  { id: 9, word: "stumble", translation: "спотыкаться", context: "He stumbled over his words.", contextTranslation: "Он запнулся на словах.", novel: "Clannad", date: "07.04.2026", status: "difficult", note: "Путаю с struggle", repetitions: 4 },
  { id: 10, word: "inevitable", translation: "неизбежный", context: "The outcome was inevitable.", contextTranslation: "Исход был неизбежен.", novel: "Steins;Gate", date: "07.04.2026", status: "learned", note: "", repetitions: 6 },
  { id: 11, word: "hollow", translation: "пустой, полый", context: "Her voice sounded hollow.", contextTranslation: "Её голос звучал пусто.", novel: "Doki Doki Literature Club", date: "07.04.2026", status: "new", note: "", repetitions: 0 },
  { id: 12, word: "embrace", translation: "обнять, объятие", context: "They held each other in a warm embrace.", contextTranslation: "Они держали друг друга в тёплых объятиях.", novel: "Katawa Shoujo", date: "06.04.2026", status: "learned", note: "", repetitions: 8 },
  { id: 13, word: "deceive", translation: "обманывать", context: "You can't deceive me anymore.", contextTranslation: "Ты больше не сможешь меня обмануть.", novel: "Everlasting Summer", date: "06.04.2026", status: "difficult", note: "", repetitions: 1 },
  { id: 14, word: "anguish", translation: "мука, страдание", context: "The anguish in her eyes was unbearable.", contextTranslation: "Мука в её глазах была невыносимой.", novel: "Clannad", date: "06.04.2026", status: "new", note: "", repetitions: 0 },
  { id: 15, word: "resilient", translation: "стойкий", context: "She proved to be incredibly resilient.", contextTranslation: "Она оказалась невероятно стойкой.", novel: "Steins;Gate", date: "05.04.2026", status: "new", note: "", repetitions: 0 },
];

const statusConfig = {
  new: { label: "Новое", variant: "default" as const },
  difficult: { label: "Сложное", variant: "warning" as const },
  learned: { label: "Выучено", variant: "success" as const },
};

export default function WordsPage() {
  const [search, setSearch] = useState("");
  const [selectedNovel, setSelectedNovel] = useState(novels[0]);
  const [selectedStatus, setSelectedStatus] = useState(statuses[0]);
  const [selectedSort, setSelectedSort] = useState(sorts[0]);
  const [viewMode, setViewMode] = useState<"list" | "cards">("list");
  const [selectedWord, setSelectedWord] = useState<Word | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const wordsPerPage = 10;

  const filtered = mockWords.filter((w) => {
    if (search && !w.word.toLowerCase().includes(search.toLowerCase()) && !w.translation.toLowerCase().includes(search.toLowerCase())) return false;
    if (selectedNovel !== novels[0] && w.novel !== selectedNovel) return false;
    if (selectedStatus !== statuses[0]) {
      const statusMap: Record<string, string> = { "Новое": "new", "Сложное": "difficult", "Выучено": "learned" };
      if (w.status !== statusMap[selectedStatus]) return false;
    }
    return true;
  });

  const totalPages = Math.ceil(filtered.length / wordsPerPage);
  const paginated = filtered.slice((currentPage - 1) * wordsPerPage, currentPage * wordsPerPage);

  return (
    <div className="flex gap-6">
      <div className={`flex-1 min-w-0 ${selectedWord ? "max-w-[calc(100%-380px)]" : ""}`}>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Слова</h1>
          <span className="text-foreground-secondary">{filtered.length} слов</span>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
            <input
              type="text"
              placeholder="Поиск по слову или переводу..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              className="w-full pl-10 pr-4 py-2.5 bg-background-card border border-border rounded-lg text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-accent"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
            <select
              value={selectedNovel}
              onChange={(e) => { setSelectedNovel(e.target.value); setCurrentPage(1); }}
              className="pl-10 pr-8 py-2.5 bg-background-card border border-border rounded-lg text-foreground appearance-none cursor-pointer focus:outline-none focus:border-accent"
            >
              {novels.map((n) => <option key={n}>{n}</option>)}
            </select>
          </div>
          <select
            value={selectedStatus}
            onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
            className="px-4 py-2.5 bg-background-card border border-border rounded-lg text-foreground appearance-none cursor-pointer focus:outline-none focus:border-accent"
          >
            {statuses.map((s) => <option key={s}>{s}</option>)}
          </select>
          <div className="relative">
            <SortAsc className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
            <select
              value={selectedSort}
              onChange={(e) => setSelectedSort(e.target.value)}
              className="pl-10 pr-8 py-2.5 bg-background-card border border-border rounded-lg text-foreground appearance-none cursor-pointer focus:outline-none focus:border-accent"
            >
              {sorts.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode("list")}
              className={`p-2.5 ${viewMode === "list" ? "bg-accent text-white" : "bg-background-card text-foreground-secondary hover:bg-background-hover"}`}
            >
              <LayoutList className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("cards")}
              className={`p-2.5 ${viewMode === "cards" ? "bg-accent text-white" : "bg-background-card text-foreground-secondary hover:bg-background-hover"}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Word List */}
        {viewMode === "list" ? (
          <div className="bg-background-card border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left text-foreground-secondary text-sm">
                  <th className="px-4 py-3 font-medium">Слово</th>
                  <th className="px-4 py-3 font-medium">Перевод</th>
                  <th className="px-4 py-3 font-medium hidden lg:table-cell">Контекст</th>
                  <th className="px-4 py-3 font-medium hidden md:table-cell">Новелла</th>
                  <th className="px-4 py-3 font-medium hidden sm:table-cell">Дата</th>
                  <th className="px-4 py-3 font-medium">Статус</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((w) => (
                  <tr
                    key={w.id}
                    onClick={() => setSelectedWord(w)}
                    className={`border-b border-border/50 cursor-pointer transition-colors hover:bg-background-hover ${selectedWord?.id === w.id ? "bg-accent-light" : ""}`}
                  >
                    <td className="px-4 py-3 font-medium">{w.word}</td>
                    <td className="px-4 py-3 text-foreground-secondary">{w.translation}</td>
                    <td className="px-4 py-3 text-foreground-muted text-sm hidden lg:table-cell max-w-[200px] truncate">{w.context}</td>
                    <td className="px-4 py-3 text-foreground-secondary text-sm hidden md:table-cell">{w.novel}</td>
                    <td className="px-4 py-3 text-foreground-muted text-sm hidden sm:table-cell">{w.date}</td>
                    <td className="px-4 py-3">
                      <Badge variant={statusConfig[w.status].variant}>{statusConfig[w.status].label}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginated.map((w) => (
              <div
                key={w.id}
                onClick={() => setSelectedWord(w)}
                className={`p-4 bg-background-card border border-border rounded-xl cursor-pointer transition-colors hover:border-accent ${selectedWord?.id === w.id ? "border-accent bg-accent-light" : ""}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-lg">{w.word}</span>
                  <Badge variant={statusConfig[w.status].variant}>{statusConfig[w.status].label}</Badge>
                </div>
                <p className="text-foreground-secondary mb-2">{w.translation}</p>
                <p className="text-foreground-muted text-sm mb-3 line-clamp-2">{w.context}</p>
                <div className="flex items-center justify-between text-xs text-foreground-muted">
                  <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" />{w.novel}</span>
                  <span>{w.date}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg bg-background-card border border-border disabled:opacity-40 hover:bg-background-hover"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i + 1}
                onClick={() => setCurrentPage(i + 1)}
                className={`w-9 h-9 rounded-lg text-sm ${currentPage === i + 1 ? "bg-accent text-white" : "bg-background-card border border-border hover:bg-background-hover"}`}
              >
                {i + 1}
              </button>
            ))}
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

      {/* Word Detail Panel */}
      {selectedWord && (
        <div className="hidden lg:block w-[360px] flex-shrink-0">
          <div className="sticky top-6 bg-background-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">{selectedWord.word}</h2>
              <button onClick={() => setSelectedWord(null)} className="text-foreground-muted hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <span className="text-xs text-foreground-muted uppercase tracking-wide">Перевод</span>
                <p className="text-lg mt-1">{selectedWord.translation}</p>
              </div>

              <div>
                <span className="text-xs text-foreground-muted uppercase tracking-wide">Контекст</span>
                <p className="text-sm mt-1 text-foreground-secondary italic">&ldquo;{selectedWord.context}&rdquo;</p>
                <p className="text-sm mt-1 text-foreground-muted">{selectedWord.contextTranslation}</p>
              </div>

              <div>
                <span className="text-xs text-foreground-muted uppercase tracking-wide">Новелла</span>
                <p className="text-sm mt-1 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-accent" />{selectedWord.novel}
                </p>
              </div>

              <div className="flex gap-4">
                <div>
                  <span className="text-xs text-foreground-muted uppercase tracking-wide">Дата</span>
                  <p className="text-sm mt-1">{selectedWord.date}</p>
                </div>
                <div>
                  <span className="text-xs text-foreground-muted uppercase tracking-wide">Повторений</span>
                  <p className="text-sm mt-1">{selectedWord.repetitions}</p>
                </div>
              </div>

              <div>
                <span className="text-xs text-foreground-muted uppercase tracking-wide">Статус</span>
                <div className="mt-1">
                  <Badge variant={statusConfig[selectedWord.status].variant}>{statusConfig[selectedWord.status].label}</Badge>
                </div>
              </div>

              {selectedWord.note && (
                <div>
                  <span className="text-xs text-foreground-muted uppercase tracking-wide">Заметка</span>
                  <p className="text-sm mt-1 text-foreground-secondary">{selectedWord.note}</p>
                </div>
              )}

              <div className="pt-4 border-t border-border space-y-2">
                <button className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg bg-success/15 text-success hover:bg-success/25 transition-colors text-sm">
                  <Check className="w-4 h-4" /> Отметить как выученное
                </button>
                <button className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg bg-warning/15 text-warning hover:bg-warning/25 transition-colors text-sm">
                  <Star className="w-4 h-4" /> Отметить как сложное
                </button>
                <button className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg bg-accent-light text-accent hover:bg-accent/25 transition-colors text-sm">
                  <RotateCcw className="w-4 h-4" /> Начать повторение
                </button>
                <button className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg bg-background-hover text-foreground-secondary hover:text-foreground transition-colors text-sm">
                  <MessageSquare className="w-4 h-4" /> Добавить заметку
                </button>
                <button className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg bg-danger-light text-danger hover:bg-danger/25 transition-colors text-sm">
                  <Trash2 className="w-4 h-4" /> Удалить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
