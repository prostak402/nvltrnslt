"use client";

import { useState, useCallback, useEffect } from "react";
import {
  BookOpen,
  Brain,
  MessageSquare,
  Shuffle,
  Library,
  ChevronLeft,
  ChevronRight,
  Eye,
  RotateCcw,
  Trophy,
  Clock,
  Star,
  Check,
  X,
  Layers,
  Grid3X3,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

/* ------------------------------------------------------------------ */
/*  Mock data                                                         */
/* ------------------------------------------------------------------ */

const FLASHCARD_WORDS = [
  { en: "Ephemeral", ru: "Мимолётный", context: "The ephemeral beauty of cherry blossoms reminds us to cherish every moment." },
  { en: "Resilience", ru: "Стойкость", context: "Her resilience in the face of adversity inspired everyone around her." },
  { en: "Serendipity", ru: "Счастливая случайность", context: "It was pure serendipity that they met at the old bookstore." },
  { en: "Melancholy", ru: "Меланхолия", context: "A deep melancholy settled over the empty house after everyone left." },
  { en: "Ubiquitous", ru: "Вездесущий", context: "Smartphones have become ubiquitous in modern society." },
];

const MATCH_PAIRS = [
  { en: "Courage", ru: "Смелость" },
  { en: "Wisdom", ru: "Мудрость" },
  { en: "Solitude", ru: "Одиночество" },
  { en: "Harmony", ru: "Гармония" },
  { en: "Nostalgia", ru: "Ностальгия" },
  { en: "Paradox", ru: "Парадокс" },
];

const CATEGORIES = [
  { icon: BookOpen, label: "Новые слова", count: 12, color: "text-accent" },
  { icon: Brain, label: "Сложные слова", count: 8, color: "text-warning" },
  { icon: MessageSquare, label: "Фразы", count: 5, color: "text-accent-secondary" },
  { icon: Shuffle, label: "Случайная подборка", count: null, color: "text-foreground-secondary" },
];

const NOVELS = ["Doki Doki Literature Club", "Katawa Shoujo", "Everlasting Summer", "Clannad", "Steins;Gate"];

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default function LearningPage() {
  const [activeMode, setActiveMode] = useState<"flashcards" | "match">("flashcards");
  const [sessionComplete, setSessionComplete] = useState(false);

  // Flashcard state
  const [currentCard, setCurrentCard] = useState(0);
  const [showTranslation, setShowTranslation] = useState(false);
  const [ratings, setRatings] = useState<Record<number, "know" | "hard" | "unknown">>({});

  // Match state
  const [tiles, setTiles] = useState<{ id: number; text: string; lang: "en" | "ru"; pairIndex: number; matched: boolean }[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [wrongPair, setWrongPair] = useState<[number, number] | null>(null);
  const [matchScore, setMatchScore] = useState(0);
  const [matchTimer, setMatchTimer] = useState(0);
  const [matchStarted, setMatchStarted] = useState(false);

  const [selectedNovel, setSelectedNovel] = useState(NOVELS[0]);

  /* --- Flashcard helpers --- */

  const rateCard = (rating: "know" | "hard" | "unknown") => {
    setRatings((prev) => ({ ...prev, [currentCard]: rating }));
    if (currentCard < FLASHCARD_WORDS.length - 1) {
      setCurrentCard((c) => c + 1);
      setShowTranslation(false);
    } else {
      setSessionComplete(true);
    }
  };

  const resetFlashcards = () => {
    setCurrentCard(0);
    setShowTranslation(false);
    setRatings({});
    setSessionComplete(false);
  };

  /* --- Match helpers --- */

  const initMatch = useCallback(() => {
    const raw: typeof tiles = [];
    MATCH_PAIRS.forEach((pair, i) => {
      raw.push({ id: i * 2, text: pair.en, lang: "en", pairIndex: i, matched: false });
      raw.push({ id: i * 2 + 1, text: pair.ru, lang: "ru", pairIndex: i, matched: false });
    });
    // Shuffle
    for (let i = raw.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [raw[i], raw[j]] = [raw[j], raw[i]];
    }
    setTiles(raw);
    setSelected(null);
    setWrongPair(null);
    setMatchScore(0);
    setMatchTimer(0);
    setMatchStarted(true);
    setSessionComplete(false);
  }, []);

  // Timer for match mode
  useEffect(() => {
    if (!matchStarted || activeMode !== "match") return;
    const allMatched = tiles.length > 0 && tiles.every((t) => t.matched);
    if (allMatched) return;
    const interval = setInterval(() => setMatchTimer((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [matchStarted, activeMode, tiles]);

  useEffect(() => {
    if (activeMode === "match") initMatch();
  }, [activeMode, initMatch]);

  const handleTileClick = (tileId: number) => {
    const tile = tiles.find((t) => t.id === tileId);
    if (!tile || tile.matched) return;
    if (wrongPair) return;

    if (selected === null) {
      setSelected(tileId);
      return;
    }

    if (selected === tileId) {
      setSelected(null);
      return;
    }

    const first = tiles.find((t) => t.id === selected)!;
    if (first.pairIndex === tile.pairIndex && first.lang !== tile.lang) {
      // Correct match
      setTiles((prev) =>
        prev.map((t) => (t.pairIndex === tile.pairIndex ? { ...t, matched: true } : t))
      );
      setMatchScore((s) => s + 1);
      setSelected(null);

      // Check if all matched
      const remaining = tiles.filter((t) => !t.matched && t.pairIndex !== tile.pairIndex);
      if (remaining.length === 0) {
        setSessionComplete(true);
      }
    } else {
      // Wrong match
      setWrongPair([selected, tileId]);
      setTimeout(() => {
        setWrongPair(null);
        setSelected(null);
      }, 600);
    }
  };

  const resetMatch = () => {
    initMatch();
    setSessionComplete(false);
  };

  /* --- Derived --- */
  const flashcardProgress = Object.keys(ratings).length;
  const knownCount = Object.values(ratings).filter((r) => r === "know").length;
  const hardCount = Object.values(ratings).filter((r) => r === "hard").length;
  const unknownCount = Object.values(ratings).filter((r) => r === "unknown").length;

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  /* ------------------------------------------------------------------ */
  /*  Session complete screen                                           */
  /* ------------------------------------------------------------------ */

  if (sessionComplete) {
    const isMatch = activeMode === "match";
    return (
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-success/15 flex items-center justify-center mx-auto">
            <Trophy className="w-10 h-10 text-success" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Сессия завершена!</h1>
          <p className="text-foreground-secondary">Отличная работа! Вот ваши результаты:</p>
        </div>

        <Card className="space-y-4">
          {isMatch ? (
            <>
              <div className="flex justify-between items-center">
                <span className="text-foreground-secondary">Найдено пар</span>
                <span className="text-foreground font-bold text-lg">{matchScore} / {MATCH_PAIRS.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-foreground-secondary">Время</span>
                <span className="text-foreground font-bold text-lg">{formatTime(matchTimer)}</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-between items-center">
                <span className="text-foreground-secondary">Всего карточек</span>
                <span className="text-foreground font-bold text-lg">{FLASHCARD_WORDS.length}</span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-success" />
                  <span className="text-foreground-secondary">Знаю</span>
                </div>
                <span className="text-success font-bold">{knownCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-warning" />
                  <span className="text-foreground-secondary">Трудно</span>
                </div>
                <span className="text-warning font-bold">{hardCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-danger" />
                  <span className="text-foreground-secondary">Не знаю</span>
                </div>
                <span className="text-danger font-bold">{unknownCount}</span>
              </div>
            </>
          )}
        </Card>

        <Card className="!bg-accent-light border-accent/30">
          <div className="flex items-start gap-3">
            <Star className="w-5 h-5 text-accent mt-0.5 shrink-0" />
            <div>
              <p className="text-foreground font-medium">Рекомендация</p>
              <p className="text-foreground-secondary text-sm mt-1">
                {isMatch
                  ? matchTimer < 30
                    ? "Превосходно! Попробуйте увеличить сложность — добавьте больше пар."
                    : "Хороший результат! Повторите ещё раз, чтобы улучшить время."
                  : unknownCount > knownCount
                    ? "Рекомендуем повторить эти слова ещё раз через 30 минут. Сосредоточьтесь на незнакомых."
                    : hardCount > 0
                      ? "Неплохо! Повторите сложные слова завтра для закрепления."
                      : "Отлично! Вы хорошо знаете эти слова. Переходите к новой подборке!"}
              </p>
            </div>
          </div>
        </Card>

        <div className="flex gap-3 justify-center">
          <Button variant="secondary" onClick={isMatch ? resetMatch : resetFlashcards}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Повторить
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              setSessionComplete(false);
              setActiveMode(isMatch ? "flashcards" : "match");
              if (!isMatch) initMatch();
              else resetFlashcards();
            }}
          >
            {isMatch ? "Перейти к карточкам" : "Найди пару"}
          </Button>
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------------ */
  /*  Main render                                                       */
  /* ------------------------------------------------------------------ */

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Что повторим сегодня?</h1>
        <p className="mt-2 text-foreground-secondary flex flex-wrap items-center gap-x-3 gap-y-1 text-sm sm:text-base">
          <span>Сегодня к повторению: <span className="text-foreground font-semibold">18 слов</span></span>
          <span className="text-foreground-muted">|</span>
          <span>Выполнено: <span className="text-success font-semibold">7</span></span>
          <span className="text-foreground-muted">|</span>
          <span>Осталось: <span className="text-warning font-semibold">11</span></span>
        </p>
      </div>

      {/* Category cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {CATEGORIES.map((cat) => (
          <Card hover key={cat.label} className="!p-4 text-center">
            <cat.icon className={`w-6 h-6 mx-auto mb-2 ${cat.color}`} />
            <p className="text-sm font-medium text-foreground">{cat.label}</p>
            {cat.count !== null && (
              <Badge variant="default" className="mt-2">{cat.count}</Badge>
            )}
          </Card>
        ))}

        {/* Novel selector card */}
        <Card hover className="!p-4 text-center">
          <Library className="w-6 h-6 mx-auto mb-2 text-accent" />
          <p className="text-sm font-medium text-foreground mb-2">По новелле</p>
          <select
            value={selectedNovel}
            onChange={(e) => setSelectedNovel(e.target.value)}
            className="w-full bg-background-hover border border-border rounded-lg px-2 py-1 text-xs text-foreground-secondary focus:outline-none focus:border-accent"
          >
            {NOVELS.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </Card>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => { setActiveMode("flashcards"); resetFlashcards(); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            activeMode === "flashcards"
              ? "bg-accent text-white"
              : "bg-background-card border border-border text-foreground-secondary hover:text-foreground hover:border-border-hover"
          }`}
        >
          <Layers className="w-4 h-4" />
          Карточки
        </button>
        <button
          onClick={() => setActiveMode("match")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            activeMode === "match"
              ? "bg-accent text-white"
              : "bg-background-card border border-border text-foreground-secondary hover:text-foreground hover:border-border-hover"
          }`}
        >
          <Grid3X3 className="w-4 h-4" />
          Найди пару
        </button>
      </div>

      {/* ---- Flashcard Mode ---- */}
      {activeMode === "flashcards" && (
        <div className="space-y-6">
          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-foreground-secondary">
              <span>Прогресс</span>
              <span>{flashcardProgress} / {FLASHCARD_WORDS.length}</span>
            </div>
            <div className="h-2 bg-background-hover rounded-full overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all duration-300"
                style={{ width: `${(flashcardProgress / FLASHCARD_WORDS.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Card */}
          <Card className="min-h-[280px] flex flex-col items-center justify-center text-center relative">
            {/* Card counter */}
            <Badge variant="default" className="absolute top-4 right-4">
              {currentCard + 1} / {FLASHCARD_WORDS.length}
            </Badge>

            <p className="text-3xl sm:text-4xl font-bold text-foreground mb-2">
              {FLASHCARD_WORDS[currentCard].en}
            </p>

            {showTranslation ? (
              <div className="mt-4 space-y-3 animate-in fade-in duration-300">
                <p className="text-xl text-accent font-semibold">
                  {FLASHCARD_WORDS[currentCard].ru}
                </p>
                <p className="text-sm text-foreground-muted max-w-md italic">
                  &ldquo;{FLASHCARD_WORDS[currentCard].context}&rdquo;
                </p>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="mt-6"
                onClick={() => setShowTranslation(true)}
              >
                <Eye className="w-4 h-4 mr-2" />
                Показать перевод
              </Button>
            )}
          </Card>

          {/* Rating & navigation */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Navigation */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                disabled={currentCard === 0}
                onClick={() => { setCurrentCard((c) => c - 1); setShowTranslation(false); }}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Назад
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={currentCard === FLASHCARD_WORDS.length - 1}
                onClick={() => { setCurrentCard((c) => c + 1); setShowTranslation(false); }}
              >
                Вперёд
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>

            {/* Rating buttons */}
            {showTranslation && (
              <div className="flex gap-2">
                <button
                  onClick={() => rateCard("know")}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-success/15 text-success hover:bg-success/25 transition-colors"
                >
                  <Check className="w-4 h-4" />
                  Знаю
                </button>
                <button
                  onClick={() => rateCard("hard")}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-warning/15 text-warning hover:bg-warning/25 transition-colors"
                >
                  <Brain className="w-4 h-4" />
                  Трудно
                </button>
                <button
                  onClick={() => rateCard("unknown")}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-danger/15 text-danger hover:bg-danger/25 transition-colors"
                >
                  <X className="w-4 h-4" />
                  Не знаю
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---- Match Pairs Mode ---- */}
      {activeMode === "match" && (
        <div className="space-y-6">
          {/* Score / Timer bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm">
                <Trophy className="w-4 h-4 text-accent" />
                <span className="text-foreground-secondary">Найдено:</span>
                <span className="text-foreground font-bold">{matchScore} / {MATCH_PAIRS.length}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-foreground-muted" />
                <span className="text-foreground-secondary">{formatTime(matchTimer)}</span>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={resetMatch}>
              <RotateCcw className="w-4 h-4 mr-1" />
              Заново
            </Button>
          </div>

          {/* Tile grid */}
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {tiles.map((tile) => {
              const isSelected = selected === tile.id;
              const isWrong = wrongPair !== null && (wrongPair[0] === tile.id || wrongPair[1] === tile.id);
              const isMatched = tile.matched;

              let tileClass = "bg-background-hover border-border hover:border-border-hover hover:bg-background-card cursor-pointer";
              if (isMatched) {
                tileClass = "bg-success/15 border-success/40 cursor-default";
              } else if (isWrong) {
                tileClass = "bg-danger/15 border-danger/40 animate-pulse";
              } else if (isSelected) {
                tileClass = "bg-accent-light border-accent cursor-pointer";
              }

              return (
                <button
                  key={tile.id}
                  onClick={() => !isMatched && handleTileClick(tile.id)}
                  disabled={isMatched}
                  className={`border rounded-xl p-4 sm:p-5 text-center transition-all duration-200 ${tileClass}`}
                >
                  <span
                    className={`text-sm sm:text-base font-medium ${
                      isMatched
                        ? "text-success"
                        : isWrong
                          ? "text-danger"
                          : isSelected
                            ? "text-accent"
                            : "text-foreground"
                    }`}
                  >
                    {tile.text}
                  </span>
                  <span className={`block text-xs mt-1 ${isMatched ? "text-success/60" : "text-foreground-muted"}`}>
                    {tile.lang === "en" ? "EN" : "RU"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
