"use client";

import { useState } from "react";
import { Search, Filter, BookOpen, ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

interface Phrase {
  id: number;
  original: string;
  translation: string;
  novel: string;
  date: string;
  status: "saved" | "reviewing" | "learned";
}

const novels = [
  "Все новеллы",
  "Doki Doki Literature Club",
  "Katawa Shoujo",
  "Everlasting Summer",
  "Clannad",
  "Steins;Gate",
];

const statusConfig = {
  saved: { label: "Сохранено", variant: "default" as const },
  reviewing: { label: "В повторении", variant: "accent" as const },
  learned: { label: "Изучено", variant: "success" as const },
};

const mockPhrases: Phrase[] = [
  { id: 1, original: "I can't believe you would do something like that.", translation: "Я не могу поверить, что ты мог сделать что-то подобное.", novel: "Doki Doki Literature Club", date: "10.04.2026", status: "saved" },
  { id: 2, original: "It's not like I had a choice in the matter.", translation: "Не то чтобы у меня был выбор в этом деле.", novel: "Katawa Shoujo", date: "10.04.2026", status: "reviewing" },
  { id: 3, original: "The weight of the world rested on her shoulders.", translation: "Тяжесть всего мира лежала на её плечах.", novel: "Everlasting Summer", date: "09.04.2026", status: "saved" },
  { id: 4, original: "Sometimes you have to let go of the things you love.", translation: "Иногда нужно отпускать то, что любишь.", novel: "Clannad", date: "09.04.2026", status: "learned" },
  { id: 5, original: "The choice you make here will change everything.", translation: "Выбор, который ты сделаешь здесь, изменит всё.", novel: "Steins;Gate", date: "09.04.2026", status: "reviewing" },
  { id: 6, original: "I never meant to hurt anyone.", translation: "Я никогда не хотел причинить кому-то боль.", novel: "Doki Doki Literature Club", date: "08.04.2026", status: "saved" },
  { id: 7, original: "There's no turning back from this point.", translation: "С этого момента обратного пути нет.", novel: "Katawa Shoujo", date: "08.04.2026", status: "learned" },
  { id: 8, original: "She looked at me as if I were a stranger.", translation: "Она посмотрела на меня так, будто я был незнакомцем.", novel: "Everlasting Summer", date: "07.04.2026", status: "saved" },
  { id: 9, original: "I wonder if things could have been different.", translation: "Интересно, могло ли всё быть иначе.", novel: "Clannad", date: "07.04.2026", status: "reviewing" },
  { id: 10, original: "This is the consequence of your actions.", translation: "Это последствия твоих действий.", novel: "Steins;Gate", date: "06.04.2026", status: "saved" },
  { id: 11, original: "Don't pretend like nothing happened.", translation: "Не делай вид, что ничего не произошло.", novel: "Doki Doki Literature Club", date: "06.04.2026", status: "learned" },
  { id: 12, original: "It took me a while to figure it out.", translation: "Мне потребовалось время, чтобы разобраться.", novel: "Katawa Shoujo", date: "05.04.2026", status: "saved" },
];

export default function PhrasesPage() {
  const [search, setSearch] = useState("");
  const [selectedNovel, setSelectedNovel] = useState(novels[0]);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const filtered = mockPhrases.filter((p) => {
    if (search && !p.original.toLowerCase().includes(search.toLowerCase()) && !p.translation.toLowerCase().includes(search.toLowerCase())) return false;
    if (selectedNovel !== novels[0] && p.novel !== selectedNovel) return false;
    return true;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Фразы</h1>
        <span className="text-foreground-secondary">{filtered.length} фраз</span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
          <input
            type="text"
            placeholder="Поиск по фразе..."
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
            {novels.map((n) => <option key={n}>{n}</option>)}
          </select>
        </div>
      </div>

      {/* Phrase List */}
      <div className="space-y-3">
        {filtered.map((phrase) => (
          <div
            key={phrase.id}
            className="bg-background-card border border-border rounded-xl overflow-hidden transition-colors hover:border-border-hover"
          >
            <div
              className="p-4 cursor-pointer"
              onClick={() => setExpandedId(expandedId === phrase.id ? null : phrase.id)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-medium leading-relaxed">{phrase.original}</p>
                  <p className="text-foreground-secondary mt-1 leading-relaxed">{phrase.translation}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge variant={statusConfig[phrase.status].variant}>
                    {statusConfig[phrase.status].label}
                  </Badge>
                  {expandedId === phrase.id ? (
                    <ChevronUp className="w-4 h-4 text-foreground-muted" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-foreground-muted" />
                  )}
                </div>
              </div>
            </div>

            {expandedId === phrase.id && (
              <div className="px-4 pb-4 pt-0 border-t border-border/50">
                <div className="flex flex-wrap items-center gap-4 pt-3 text-sm text-foreground-muted">
                  <span className="flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-accent" />
                    {phrase.novel}
                  </span>
                  <span>Добавлено: {phrase.date}</span>
                </div>
                <div className="flex gap-2 mt-3">
                  <button className="px-3 py-1.5 text-sm rounded-lg bg-accent-light text-accent hover:bg-accent/25 transition-colors">
                    В повторение
                  </button>
                  <button className="px-3 py-1.5 text-sm rounded-lg bg-success/15 text-success hover:bg-success/25 transition-colors">
                    Изучено
                  </button>
                  <button className="px-3 py-1.5 text-sm rounded-lg bg-danger-light text-danger hover:bg-danger/25 transition-colors">
                    Удалить
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
