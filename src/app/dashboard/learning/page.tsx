"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Brain, Check, Clock, Eye, Layers, Library, MessageSquare, RotateCcw, Star, Trophy, X, type LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { apiSend, useApiData } from "@/lib/client/api";
import { studyStatusMeta } from "@/lib/client/presentation";

type LearningCard = {
  id: number;
  en: string;
  ru: string;
  context: string;
  contextTranslation: string;
  contextWordPosition: number | null;
  kind: "word" | "phrase" | "sentence";
  novel: string;
  status: "new" | "hard" | "learned";
  isActive: boolean;
  isDue: boolean;
  learningStage: number;
  hasCloze: boolean;
  clozeText: string | null;
  clozeAnswer: string | null;
};
type LearningResponse = {
  cards: LearningCard[];
  practicePool: LearningCard[];
  categories: Array<{ label: string; count: number }>;
  novels: string[];
  summary: {
    dueCount: number;
    hardDueCount: number;
    newCount: number;
    totalCount: number;
  };
  settings: {
    dailyWords: number;
    dailyNewWords: number;
    prioritizeDifficult: boolean;
    includePhrases: boolean;
  };
};
type LearningMode = "flashcards" | "pairs" | "ru_en_choice" | "cloze_choice";
type KindFilter = "all" | "word" | "phrase" | "sentence";
type LearningShortcut = "newWords" | "hardWords" | "phrases" | "random";
type LearningSessionSource = "daily" | "practice";
type PracticePreset = "random" | "custom";
type ReviewSummary = Record<"know" | "hard" | "unknown", number>;
type PairFeedback = { kind: "success" | "error"; leftId: number; rightId: number } | null;

const ALL_NOVELS_LABEL = "Все новеллы";
const PAIRS_ACTIVE_SLOTS = 5;
const PAIRS_ROUND_SECONDS = 60;
const initialData: LearningResponse = {
  cards: [],
  practicePool: [],
  categories: [],
  novels: [ALL_NOVELS_LABEL],
  summary: { dueCount: 0, hardDueCount: 0, newCount: 0, totalCount: 0 },
  settings: { dailyWords: 20, dailyNewWords: 10, prioritizeDifficult: true, includePhrases: true },
};

const createSummary = (): ReviewSummary => ({ know: 0, hard: 0, unknown: 0 });
const kindLabel = (kind: LearningCard["kind"]) => kind === "phrase" ? "Фраза" : kind === "sentence" ? "Предложение" : "Слово";

function getChoiceLabel(card: LearningCard, mode: "ru_en_choice" | "cloze_choice") {
  if (mode === "cloze_choice") {
    return (card.clozeAnswer?.trim() || card.en).trim();
  }

  return card.en.trim();
}

function buildChoiceOptions(
  cards: LearningCard[],
  currentCard: LearningCard,
  mode: "ru_en_choice" | "cloze_choice",
) {
  const currentLabel = getChoiceLabel(currentCard, mode).toLowerCase();
  const preferredCandidates = cards.filter(
    (card) =>
      card.id !== currentCard.id &&
      card.kind === currentCard.kind &&
      card.ru.trim().toLowerCase() !== currentCard.ru.trim().toLowerCase() &&
      getChoiceLabel(card, mode).toLowerCase() !== currentLabel,
  );
  const fallbackCandidates = cards.filter(
    (card) =>
      card.id !== currentCard.id &&
      card.ru.trim().toLowerCase() !== currentCard.ru.trim().toLowerCase() &&
      getChoiceLabel(card, mode).toLowerCase() !== currentLabel,
  );
  const distractorPool = preferredCandidates.length >= 3 ? preferredCandidates : fallbackCandidates;
  const distractors = shuffle(distractorPool, currentCard.id * 97 + cards.length)
    .slice(0, Math.min(3, distractorPool.length))
    .map((card) => ({
      id: `wrong-${card.id}`,
      label: getChoiceLabel(card, mode),
      isCorrect: false,
    }));

  return shuffle(
    [
      {
        id: `correct-${currentCard.id}`,
        label: getChoiceLabel(currentCard, mode),
        isCorrect: true,
      },
      ...distractors,
    ],
    currentCard.id * 193 + distractors.length * 17,
  );
}

function cardsForShortcut(cards: LearningCard[], shortcut: LearningShortcut) {
  if (shortcut === "newWords") {
    return cards.filter((card) => card.kind === "word" && card.status === "new");
  }

  if (shortcut === "hardWords") {
    return cards.filter((card) => card.kind === "word" && card.status === "hard");
  }

  if (shortcut === "phrases") {
    return cards.filter((card) => card.kind === "phrase");
  }

  return cards;
}

function kindForShortcut(shortcut: LearningShortcut): KindFilter {
  if (shortcut === "phrases") return "phrase";
  if (shortcut === "newWords" || shortcut === "hardWords") return "word";
  return "all";
}

function seeded(seed: number) {
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;
  return () => ((value = (value * 48271) % 2147483647) - 1) / 2147483646;
}

function shuffle<T>(items: T[], seed: number) {
  const next = [...items];
  const random = seeded(seed || 1);
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}

function buildPairsPool(cards: LearningCard[], roundSeed: number) {
  const baseSeed = roundSeed + cards.reduce((sum, card) => sum + card.id, 0) + cards.length * 31;
  return { baseSeed, cards: shuffle(cards, baseSeed) };
}

function PairsTrainer({
  cards,
  onReload,
  syncResults = true,
}: {
  cards: LearningCard[];
  onReload: () => Promise<void>;
  syncResults?: boolean;
}) {
  const [roundSeed, setRoundSeed] = useState(0);
  const [leftIds, setLeftIds] = useState<number[]>([]);
  const [rightIds, setRightIds] = useState<number[]>([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [selectedLeftId, setSelectedLeftId] = useState<number | null>(null);
  const [selectedRightId, setSelectedRightId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<PairFeedback>(null);
  const [locked, setLocked] = useState(false);
  const [timeLeft, setTimeLeft] = useState(PAIRS_ROUND_SECONDS);
  const [matchedCount, setMatchedCount] = useState(0);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [hardPairIds, setHardPairIds] = useState<Record<number, true>>({});
  const [summary, setSummary] = useState<ReviewSummary>(createSummary);
  const [message, setMessage] = useState("");
  const [syncingCount, setSyncingCount] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const mountedRef = useRef(true);
  const timeoutIdsRef = useRef<number[]>([]);
  const pool = useMemo(() => buildPairsPool(cards, roundSeed), [cards, roundSeed]);
  const cardMap = useMemo(() => new Map(pool.cards.map((card) => [card.id, card])), [pool.cards]);
  const finishedByDeck = leftIds.length === 0 && queueIndex >= pool.cards.length;
  const sessionFinished = timeLeft <= 0 || finishedByDeck;
  const progress = pool.cards.length ? Math.round((matchedCount / pool.cards.length) * 100) : 0;

  useEffect(() => () => {
    mountedRef.current = false;
    for (const timeoutId of timeoutIdsRef.current) window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    const initialIds = pool.cards.slice(0, Math.min(PAIRS_ACTIVE_SLOTS, pool.cards.length)).map((card) => card.id);
    setLeftIds(initialIds);
    setRightIds(shuffle(initialIds, pool.baseSeed + 101));
    setQueueIndex(initialIds.length);
    setSelectedLeftId(null);
    setSelectedRightId(null);
    setFeedback(null);
    setLocked(false);
    setTimeLeft(PAIRS_ROUND_SECONDS);
    setMatchedCount(0);
    setWrongAttempts(0);
    setHardPairIds({});
    setSummary(createSummary());
    setMessage("");
    setSyncingCount(0);
  }, [pool.baseSeed, pool.cards]);

  useEffect(() => {
    if (sessionFinished) return;
    const timeoutId = window.setTimeout(() => setTimeLeft((current) => current <= 1 ? 0 : current - 1), 1000);
    return () => window.clearTimeout(timeoutId);
  }, [sessionFinished, timeLeft]);

  useEffect(() => {
    if (locked || sessionFinished || selectedLeftId === null || selectedRightId === null) return;
    const leftId = selectedLeftId;
    const rightId = selectedRightId;
    setLocked(true);
    setFeedback({ kind: leftId === rightId ? "success" : "error", leftId, rightId });

    const timeoutId = window.setTimeout(() => {
      if (leftId === rightId) {
        const rating = hardPairIds[leftId] ? "hard" : "know";
        const nextId = pool.cards[queueIndex]?.id ?? null;
        setMatchedCount((current) => current + 1);
        setSummary((current) => ({ ...current, [rating]: current[rating] + 1 }));
        setLeftIds((current) => nextId === null ? current.filter((id) => id !== leftId) : [...current.filter((id) => id !== leftId), nextId]);
        setRightIds((current) => {
          const next = current.filter((id) => id !== rightId);
          if (nextId === null) return next;
          const insertAt = next.length === 0 ? 0 : Math.floor(Math.random() * (next.length + 1));
          const inserted = [...next];
          inserted.splice(insertAt, 0, nextId);
          return inserted;
        });
        if (nextId !== null) setQueueIndex(queueIndex + 1);
        if (syncResults) {
          setSyncingCount((current) => current + 1);
          void apiSend("/api/dashboard/review", "POST", {
            itemId: leftId,
            rating,
            taskType: "pairs",
          })
            .then(() => { if (mountedRef.current) setMessage(""); })
            .catch((requestError) => {
              if (mountedRef.current) {
                setMessage(requestError instanceof Error ? `Не удалось синхронизировать найденную пару: ${requestError.message}` : "Не удалось синхронизировать найденную пару.");
              }
            })
            .finally(() => { if (mountedRef.current) setSyncingCount((current) => Math.max(0, current - 1)); });
        } else if (mountedRef.current) {
          setMessage("");
        }
      } else {
        setWrongAttempts((current) => current + 1);
        setHardPairIds((current) => ({ ...current, [leftId]: true, [rightId]: true }));
      }

      setSelectedLeftId(null);
      setSelectedRightId(null);
      setFeedback(null);
      setLocked(false);
    }, leftId === rightId ? 220 : 360);

    timeoutIdsRef.current.push(timeoutId);
  }, [hardPairIds, locked, pool.cards, queueIndex, selectedLeftId, selectedRightId, sessionFinished, syncResults]);

  const restartRound = () => setRoundSeed((current) => current + 1);
  const refreshCards = async () => {
    try {
      setIsRefreshing(true);
      setMessage("");
      await onReload();
      setRoundSeed((current) => current + 1);
    } catch (requestError) {
      setMessage(requestError instanceof Error ? `Не удалось обновить подборку: ${requestError.message}` : "Не удалось обновить подборку.");
    } finally {
      if (mountedRef.current) setIsRefreshing(false);
    }
  };

  const leftCards = leftIds.map((id) => cardMap.get(id)).filter((card): card is LearningCard => Boolean(card));
  const rightCards = rightIds.map((id) => cardMap.get(id)).filter((card): card is LearningCard => Boolean(card));

  if (sessionFinished) {
    return (
      <div className="space-y-6">
        <Card className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-success/15 flex items-center justify-center mx-auto"><Trophy className="w-8 h-8 text-success" /></div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">{finishedByDeck ? "Колода закрыта" : "Время вышло"}</h2>
            <p className="text-foreground-secondary">
              За раунд найдено {matchedCount} пар из {pool.cards.length}. {syncResults ? "Точные пары идут как «Знаю», пары после ошибок как «Трудно»." : "Это свободная тренировка: результаты не меняют интервалы и статусы слов."}
            </p>
          </div>
        </Card>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card className="!p-4"><p className="text-sm text-foreground-secondary">Найдено пар</p><p className="mt-2 text-2xl font-bold text-foreground">{matchedCount}</p></Card>
          <Card className="!p-4"><p className="text-sm text-foreground-secondary">Точных ответов</p><p className="mt-2 text-2xl font-bold text-success">{summary.know}</p></Card>
          <Card className="!p-4"><p className="text-sm text-foreground-secondary">Через ошибки</p><p className="mt-2 text-2xl font-bold text-warning">{summary.hard}</p></Card>
          <Card className="!p-4"><p className="text-sm text-foreground-secondary">Промахов</p><p className="mt-2 text-2xl font-bold text-danger">{wrongAttempts}</p></Card>
        </div>
        {message ? <Card className="border-warning/30 bg-warning/10 text-warning">{message}</Card> : null}
        <div className="flex flex-wrap gap-3 justify-center">
          <Button variant="secondary" onClick={restartRound}><RotateCcw className="w-4 h-4 mr-2" />Начать новый раунд</Button>
          <Button variant="ghost" onClick={() => void refreshCards()} disabled={isRefreshing || syncingCount > 0}>{isRefreshing ? "Обновляю подборку..." : "Обновить подборку"}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Режим «Пары»</h2>
            <p className="text-sm text-foreground-secondary">Слева русский столбец, справа английский. За {PAIRS_ROUND_SECONDS} секунд собери как можно больше пар. После совпадения на их место сразу приходит новая.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="accent">{matchedCount} пар</Badge>
            <Badge variant="default">{pool.cards.length} в раунде</Badge>
            <Badge variant={timeLeft <= 10 ? "danger" : "default"}>{timeLeft} сек</Badge>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border border-border bg-background-hover px-4 py-3"><p className="text-xs uppercase tracking-wide text-foreground-muted">Таймер</p><p className={`mt-1 text-lg font-semibold ${timeLeft <= 10 ? "text-danger" : "text-foreground"}`}>{timeLeft} сек</p></div>
          <div className="rounded-xl border border-border bg-background-hover px-4 py-3"><p className="text-xs uppercase tracking-wide text-foreground-muted">Найдено</p><p className="mt-1 text-lg font-semibold text-success">{matchedCount}</p></div>
          <div className="rounded-xl border border-border bg-background-hover px-4 py-3"><p className="text-xs uppercase tracking-wide text-foreground-muted">Промахи</p><p className="mt-1 text-lg font-semibold text-warning">{wrongAttempts}</p></div>
          <div className="rounded-xl border border-border bg-background-hover px-4 py-3"><p className="text-xs uppercase tracking-wide text-foreground-muted">Прогресс</p><p className="mt-1 text-lg font-semibold text-foreground">{progress}%</p></div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-foreground-secondary"><span>Закрыто карточек</span><span>{matchedCount} / {pool.cards.length}</span></div>
          <div className="h-2 rounded-full bg-background-hover overflow-hidden"><div className="h-full rounded-full bg-accent transition-all duration-300" style={{ width: `${progress}%` }} /></div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="space-y-3">
          <div className="flex items-center justify-between"><h3 className="text-lg font-semibold text-foreground">Русский</h3><Badge variant="default">{leftCards.length} слева</Badge></div>
          <div className="space-y-3">
            {leftCards.map((card) => {
              const isSelected = selectedLeftId === card.id;
              const isSuccess = feedback?.kind === "success" && feedback.leftId === card.id;
              const isError = feedback?.kind === "error" && feedback.leftId === card.id;
              return (
                <button
                  key={`left-${card.id}`}
                  type="button"
                  onClick={() => setSelectedLeftId((current) => current === card.id ? null : card.id)}
                  disabled={locked}
                  className={`w-full rounded-xl border px-4 py-3 text-left transition-colors ${isSuccess ? "border-success/40 bg-success/10" : isError ? "border-danger/40 bg-danger/10" : isSelected ? "border-accent bg-accent-light/40" : "border-border bg-background-card hover:border-border-hover hover:bg-background-hover"}`}
                >
                  <p className="text-base font-semibold text-foreground">{card.ru}</p>
                  <p className="mt-1 text-xs text-foreground-muted">{kindLabel(card.kind)} · {card.novel}</p>
                </button>
              );
            })}
          </div>
        </Card>

        <Card className="space-y-3">
          <div className="flex items-center justify-between"><h3 className="text-lg font-semibold text-foreground">English</h3><Badge variant="default">{rightCards.length} справа</Badge></div>
          <div className="space-y-3">
            {rightCards.map((card) => {
              const isSelected = selectedRightId === card.id;
              const isSuccess = feedback?.kind === "success" && feedback.rightId === card.id;
              const isError = feedback?.kind === "error" && feedback.rightId === card.id;
              return (
                <button
                  key={`right-${card.id}`}
                  type="button"
                  onClick={() => setSelectedRightId((current) => current === card.id ? null : card.id)}
                  disabled={locked}
                  className={`w-full rounded-xl border px-4 py-3 text-left transition-colors ${isSuccess ? "border-success/40 bg-success/10" : isError ? "border-danger/40 bg-danger/10" : isSelected ? "border-accent bg-accent-light/40" : "border-border bg-background-card hover:border-border-hover hover:bg-background-hover"}`}
                >
                  <p className="text-base font-semibold text-foreground">{card.en}</p>
                  <p className="mt-1 text-xs text-foreground-muted">{card.context || `${kindLabel(card.kind)} · ${card.novel}`}</p>
                </button>
              );
            })}
          </div>
        </Card>
      </div>

      {message ? <Card className="border-warning/30 bg-warning/10 text-warning">{message}</Card> : null}

      <div className="flex flex-wrap gap-3 justify-between items-center">
        <div className="text-sm text-foreground-secondary">Нажми слово слева и слово справа. Если пара совпала, она уходит в прогресс и сразу заменяется новой.</div>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={restartRound}><RotateCcw className="w-4 h-4 mr-2" />Перезапустить раунд</Button>
          <Button variant="ghost" onClick={() => void refreshCards()} disabled={isRefreshing || syncingCount > 0}>{isRefreshing ? "Обновляю..." : "Обновить подборку"}</Button>
        </div>
      </div>
    </div>
  );
}

export default function LearningPage() {
  const { data, loading, error, reload } = useApiData<LearningResponse>("/api/dashboard/learning", initialData);
  const [selectedMode, setSelectedMode] = useState<LearningMode>("flashcards");
  const [showTranslation, setShowTranslation] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedKind, setSelectedKind] = useState<KindFilter>("all");
  const [selectedShortcut, setSelectedShortcut] = useState<LearningShortcut>("random");
  const [selectedNovel, setSelectedNovel] = useState(ALL_NOVELS_LABEL);
  const [sessionSummary, setSessionSummary] = useState<ReviewSummary>(createSummary);
  const [sessionCardIds, setSessionCardIds] = useState<number[]>([]);
  const [sessionBaseCount, setSessionBaseCount] = useState(0);
  const [pendingSessionReset, setPendingSessionReset] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [completedSessionCount, setCompletedSessionCount] = useState<number | null>(null);
  const [sessionSource, setSessionSource] = useState<LearningSessionSource>("daily");
  const [practicePreset, setPracticePreset] = useState<PracticePreset>("random");
  const [practiceRandomSize, setPracticeRandomSize] = useState(10);
  const [practiceRandomSeed, setPracticeRandomSeed] = useState(0);
  const [practiceSelectedIds, setPracticeSelectedIds] = useState<number[]>([]);
  const [practiceDraftIds, setPracticeDraftIds] = useState<number[]>([]);

  const sourceCards = sessionSource === "practice" ? data.practicePool : data.cards;
  const availableNovels = useMemo(
    () => [ALL_NOVELS_LABEL, ...new Set(sourceCards.map((card) => card.novel))],
    [sourceCards],
  );
  const activeNovel = availableNovels.includes(selectedNovel) ? selectedNovel : availableNovels[0];
  const hasSentenceCards = sourceCards.some((card) => card.kind === "sentence");
  const activeKind = selectedKind === "sentence" && !hasSentenceCards ? "all" : selectedKind;
  const novelScopedCards = useMemo(
    () => sourceCards.filter((card) => activeNovel === ALL_NOVELS_LABEL || card.novel === activeNovel),
    [activeNovel, sourceCards],
  );
  const shortcutScopedCards = useMemo(() => {
    const nextCards = cardsForShortcut(novelScopedCards, selectedShortcut);
    if (selectedShortcut !== "random") {
      return nextCards;
    }

    const seed = nextCards.reduce((sum, card) => sum + card.id, 0) + nextCards.length * 17;
    return shuffle(nextCards, seed || 17);
  }, [novelScopedCards, selectedShortcut]);
  const filteredCards = useMemo(
    () => shortcutScopedCards.filter((card) => activeKind === "all" || card.kind === activeKind),
    [activeKind, shortcutScopedCards],
  );
  const selectedPracticeCards = useMemo(() => {
    if (sessionSource !== "practice") {
      return filteredCards;
    }

    if (practicePreset === "custom") {
      const selectedIds = new Set(practiceSelectedIds);
      return filteredCards.filter((card) => selectedIds.has(card.id));
    }

    const limit =
      practiceRandomSize <= 0
        ? filteredCards.length
        : Math.min(practiceRandomSize, filteredCards.length);
    const seed =
      practiceRandomSeed +
      filteredCards.reduce((sum, card) => sum + card.id, 0) +
      filteredCards.length * 17;

    return shuffle(filteredCards, seed || 17).slice(0, limit);
  }, [filteredCards, practicePreset, practiceRandomSeed, practiceRandomSize, practiceSelectedIds, sessionSource]);
  const activeCards = sessionSource === "practice" ? selectedPracticeCards : filteredCards;
  const filteredCardMap = useMemo(
    () => new Map(activeCards.map((card) => [card.id, card])),
    [activeCards],
  );
  const sessionCards = useMemo(() => {
    if (selectedMode === "pairs") {
      return activeCards;
    }

    return sessionCardIds
      .map((cardId) => filteredCardMap.get(cardId))
      .filter((card): card is LearningCard => Boolean(card));
  }, [activeCards, filteredCardMap, selectedMode, sessionCardIds]);
  const shortcutButtons = useMemo<Array<{
    id: LearningShortcut;
    label: string;
    count: number;
    icon: LucideIcon;
    iconClass: string;
    activeBadgeVariant: "accent" | "warning" | "default";
  }>>(
    () => [
      {
        id: "newWords",
        label: "Новые слова",
        count: cardsForShortcut(novelScopedCards, "newWords").length,
        icon: BookOpen,
        iconClass: "text-accent",
        activeBadgeVariant: "accent",
      },
      {
        id: "hardWords",
        label: "Сложные слова",
        count: cardsForShortcut(novelScopedCards, "hardWords").length,
        icon: Brain,
        iconClass: "text-warning",
        activeBadgeVariant: "warning",
      },
      {
        id: "phrases",
        label: "Фразы",
        count: cardsForShortcut(novelScopedCards, "phrases").length,
        icon: MessageSquare,
        iconClass: "text-accent-secondary",
        activeBadgeVariant: "accent",
      },
      {
        id: "random",
        label: "Случайная подборка",
        count: novelScopedCards.length,
        icon: Layers,
        iconClass: "text-foreground-secondary",
        activeBadgeVariant: "default",
      },
    ],
    [novelScopedCards],
  );
  const practiceDraftSet = useMemo(() => new Set(practiceDraftIds), [practiceDraftIds]);
  const filteredIdsKey = activeCards.map((card) => card.id).join("-") || "empty";
  const safeIndex = Math.min(currentIndex, Math.max(sessionCards.length - 1, 0));
  const currentCard = sessionCards[safeIndex];
  const effectiveMode =
    selectedMode === "cloze_choice" && currentCard && !currentCard.hasCloze
      ? "ru_en_choice"
      : selectedMode;
  const clozePrompt = currentCard?.clozeText ?? null;
  const choiceOptions = useMemo(
    () =>
      currentCard && effectiveMode !== "flashcards" && effectiveMode !== "pairs"
        ? buildChoiceOptions(sessionCards, currentCard, effectiveMode)
        : [],
    [currentCard, effectiveMode, sessionCards],
  );
  const flashcardsComplete = completedSessionCount !== null;
  const reviewedCount = sessionSummary.know + sessionSummary.hard + sessionSummary.unknown;
  const activeSessionCount =
    selectedMode === "pairs"
      ? activeCards.length
      : flashcardsComplete
        ? completedSessionCount ?? sessionBaseCount
        : sessionBaseCount;
  const progressCount =
    selectedMode === "pairs"
      ? 0
      : flashcardsComplete
        ? completedSessionCount ?? reviewedCount
        : reviewedCount;
  const remainingCount =
    selectedMode === "pairs"
      ? activeCards.length
      : flashcardsComplete
        ? 0
        : Math.max(activeSessionCount - reviewedCount, 0);
  const practiceSelectionCount = practicePreset === "custom" ? practiceSelectedIds.length : activeCards.length;
  const isEmptySelection =
    !loading &&
    !pendingSessionReset &&
    (selectedMode === "pairs" ? activeCards.length === 0 : sessionCards.length === 0) &&
    !flashcardsComplete;

  const resetFlashcardSession = () => {
    setShowTranslation(false);
    setCurrentIndex(0);
    setSessionSummary(createSummary());
    setSessionCardIds([]);
    setSessionBaseCount(0);
    setPendingSessionReset(true);
    setMessage("");
    setCompletedSessionCount(null);
  };

  useEffect(() => {
    if (selectedMode === "pairs" || !pendingSessionReset || loading) return;

    const nextIds = activeCards.map((card) => card.id);
    setSessionCardIds(nextIds);
    setSessionBaseCount(nextIds.length);
    setPendingSessionReset(false);
  }, [activeCards, loading, pendingSessionReset, selectedMode]);

  useEffect(() => {
    if (selectedMode === "pairs") return;
    setCurrentIndex((current) => Math.min(current, Math.max(sessionCards.length - 1, 0)));
  }, [selectedMode, sessionCards.length]);

  const handleKindChange = (nextKind: KindFilter) => {
    setSelectedKind(nextKind);
    if (nextKind === "phrase") {
      setSelectedShortcut("phrases");
    } else if (nextKind !== "word") {
      setSelectedShortcut("random");
    }
    resetFlashcardSession();
  };

  const handleNovelChange = (nextNovel: string) => {
    setSelectedNovel(nextNovel);
    resetFlashcardSession();
  };

  const handleShortcutChange = (nextShortcut: LearningShortcut) => {
    setSelectedShortcut(nextShortcut);
    setSelectedKind(kindForShortcut(nextShortcut));
    resetFlashcardSession();
  };

  const handleSessionSourceChange = (nextSource: LearningSessionSource) => {
    setSessionSource(nextSource);
    setMessage("");
    resetFlashcardSession();
  };

  const buildRandomPracticeSet = () => {
    setPracticePreset("random");
    setPracticeRandomSeed((current) => current + 1);
    setMessage("");
    resetFlashcardSession();
  };

  const applyCustomPracticeSet = () => {
    setPracticePreset("custom");
    setPracticeSelectedIds(practiceDraftIds);
    setMessage("");
    resetFlashcardSession();
  };

  const clearPracticeSelection = () => {
    setPracticeDraftIds([]);
    setPracticeSelectedIds([]);
    setMessage("");
    resetFlashcardSession();
  };

  const refreshPracticePairs = async () => {
    if (practicePreset === "random") {
      setPracticeRandomSeed((current) => current + 1);
    }
  };

  const submitReview = async (
    rating: "know" | "hard" | "unknown",
    taskType: LearningMode = "flashcards",
  ) => {
    if (!currentCard) return;
    const previousIndex = currentIndex;
    const previousLength = sessionCards.length;

    try {
      setIsSubmitting(true);
      setMessage("");
      if (sessionSource === "daily") {
        await apiSend("/api/dashboard/review", "POST", {
          itemId: currentCard.id,
          rating,
          taskType,
        });
      }
      setSessionSummary((current) => ({ ...current, [rating]: current[rating] + 1 }));
      setShowTranslation(false);
      setSessionCardIds((current) => current.filter((cardId) => cardId !== currentCard.id));
      if (previousLength <= 1) {
        setCompletedSessionCount(sessionBaseCount || previousLength);
        setCurrentIndex(0);
      } else {
        const nextLength = previousLength - 1;
        setCurrentIndex(Math.min(previousIndex, Math.max(nextLength - 1, 0)));
      }
      if (sessionSource === "daily") {
        await reload();
      }
    } catch (requestError) {
      setMessage(requestError instanceof Error ? requestError.message : "Не удалось сохранить результат повторения.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
          {sessionSource === "daily" ? "Что повторим сегодня?" : "Свободная тренировка"}
        </h1>
        {sessionSource === "daily" ? (
          <p className="mt-2 text-foreground-secondary flex flex-wrap items-center gap-x-3 gap-y-1 text-sm sm:text-base">
            <span>Сегодня: <span className="text-foreground font-semibold">{data.summary.dueCount} повторений</span></span>
            <span className="text-foreground-muted">|</span>
            <span>Трудных: <span className="text-warning font-semibold">{data.summary.hardDueCount}</span></span>
            <span className="text-foreground-muted">|</span>
            <span>Новых: <span className="text-accent font-semibold">{data.summary.newCount}</span></span>
            <span className="text-foreground-muted">|</span>
            <span>В сессии: <span className="text-foreground font-semibold">{activeSessionCount}</span></span>
            <span className="text-foreground-muted">|</span>
            <span>Выполнено: <span className="text-success font-semibold">{progressCount}</span></span>
            <span className="text-foreground-muted">|</span>
            <span>Осталось: <span className="text-warning font-semibold">{remainingCount}</span></span>
          </p>
        ) : (
          <p className="mt-2 text-foreground-secondary flex flex-wrap items-center gap-x-3 gap-y-1 text-sm sm:text-base">
            <span>В пуле: <span className="text-foreground font-semibold">{filteredCards.length}</span></span>
            <span className="text-foreground-muted">|</span>
            <span>В наборе: <span className="text-foreground font-semibold">{practiceSelectionCount}</span></span>
            <span className="text-foreground-muted">|</span>
            <span>Выполнено: <span className="text-success font-semibold">{progressCount}</span></span>
            <span className="text-foreground-muted">|</span>
            <span>Осталось: <span className="text-warning font-semibold">{remainingCount}</span></span>
            <span className="text-foreground-muted">|</span>
            <span className="text-accent">Результаты не меняют интервалы и статусы</span>
          </p>
        )}
        <div className="mt-4 inline-flex rounded-xl border border-border bg-background-card p-1">
          <button
            type="button"
            onClick={() => handleSessionSourceChange("daily")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${sessionSource === "daily" ? "bg-accent text-background" : "text-foreground-secondary hover:text-foreground"}`}
          >
            Учить сегодня
          </button>
          <button
            type="button"
            onClick={() => handleSessionSourceChange("practice")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${sessionSource === "practice" ? "bg-accent text-background" : "text-foreground-secondary hover:text-foreground"}`}
          >
            Свободная тренировка
          </button>
        </div>
      </div>

      {error ? <Card className="border-danger/30 bg-danger/10 text-danger">Не удалось загрузить обучение: {error}</Card> : null}

      <div className="grid grid-cols-1 lg:grid-cols-[repeat(4,minmax(0,1fr))_320px] gap-4">
        <button type="button" onClick={() => { setSelectedMode("flashcards"); resetFlashcardSession(); }} className={`rounded-2xl border p-5 text-left transition-colors ${selectedMode === "flashcards" ? "border-accent bg-accent-light/40" : "border-border bg-background-card hover:border-border-hover hover:bg-background-hover"}`}>
          <div className="flex items-start justify-between gap-4"><div><p className="text-sm font-medium text-foreground-secondary">Режим</p><h2 className="mt-1 text-xl font-semibold text-foreground">Карточки</h2></div><Brain className={`w-6 h-6 ${selectedMode === "flashcards" ? "text-accent" : "text-foreground-secondary"}`} /></div>
          <p className="mt-3 text-sm text-foreground-secondary">{sessionSource === "daily" ? "Классический SRS-повтор: открываешь перевод, оцениваешь себя и двигаешь карточку по прогрессу." : "Свободная разминка по выбранному набору: играешь в карточки без изменения интервалов."}</p>
          <div className="mt-4 flex items-center gap-2"><Badge variant={selectedMode === "flashcards" ? "accent" : "default"}>{selectedMode === "pairs" ? activeCards.length : activeSessionCount} карточек в сессии</Badge><Badge variant="default">Оценка: знаю / трудно / не знаю</Badge></div>
        </button>
        <button type="button" onClick={() => { setSelectedMode("pairs"); resetFlashcardSession(); }} className={`rounded-2xl border p-5 text-left transition-colors ${selectedMode === "pairs" ? "border-accent bg-accent-light/40" : "border-border bg-background-card hover:border-border-hover hover:bg-background-hover"}`}>
          <div className="flex items-start justify-between gap-4"><div><p className="text-sm font-medium text-foreground-secondary">Режим</p><h2 className="mt-1 text-xl font-semibold text-foreground">Пары</h2></div><Layers className={`w-6 h-6 ${selectedMode === "pairs" ? "text-accent" : "text-foreground-secondary"}`} /></div>
          <p className="mt-3 text-sm text-foreground-secondary">{sessionSource === "daily" ? "Две колонки по 5 слов, таймер на 60 секунд и мгновенная подстановка новой пары после правильного совпадения." : "Спринт по выбранному набору: можно гонять пары сколько угодно, не трогая SRS-прогресс."}</p>
          <div className="mt-4 flex items-center gap-2"><Badge variant={selectedMode === "pairs" ? "accent" : "default"}>5 слева / 5 справа</Badge><Badge variant="default">Спринт на скорость</Badge></div>
        </button>
        <button type="button" onClick={() => { setSelectedMode("ru_en_choice"); resetFlashcardSession(); }} className={`rounded-2xl border p-5 text-left transition-colors ${selectedMode === "ru_en_choice" ? "border-accent bg-accent-light/40" : "border-border bg-background-card hover:border-border-hover hover:bg-background-hover"}`}>
          <div className="flex items-start justify-between gap-4"><div><p className="text-sm font-medium text-foreground-secondary">Сильный режим</p><h2 className="mt-1 text-xl font-semibold text-foreground">RU → EN</h2></div><Check className={`w-6 h-6 ${selectedMode === "ru_en_choice" ? "text-accent" : "text-foreground-secondary"}`} /></div>
          <p className="mt-3 text-sm text-foreground-secondary">Видишь перевод на русском и выбираешь правильный английский вариант. Этот режим участвует в финальном закреплении слова.</p>
          <div className="mt-4 flex items-center gap-2"><Badge variant={selectedMode === "ru_en_choice" ? "accent" : "default"}>4 варианта</Badge><Badge variant="default">Сильная проверка</Badge></div>
        </button>
        <button type="button" onClick={() => { setSelectedMode("cloze_choice"); resetFlashcardSession(); }} className={`rounded-2xl border p-5 text-left transition-colors ${selectedMode === "cloze_choice" ? "border-accent bg-accent-light/40" : "border-border bg-background-card hover:border-border-hover hover:bg-background-hover"}`}>
          <div className="flex items-start justify-between gap-4"><div><p className="text-sm font-medium text-foreground-secondary">Сильный режим</p><h2 className="mt-1 text-xl font-semibold text-foreground">Пропуск в фразе</h2></div><MessageSquare className={`w-6 h-6 ${selectedMode === "cloze_choice" ? "text-accent" : "text-foreground-secondary"}`} /></div>
          <p className="mt-3 text-sm text-foreground-secondary">Если у карточки есть исходная фраза, слово скрывается в контексте. Если контекст не подходит, режим мягко переключается на RU → EN.</p>
          <div className="mt-4 flex items-center gap-2"><Badge variant={selectedMode === "cloze_choice" ? "accent" : "default"}>Контекст из новеллы</Badge><Badge variant="default">Fallback на RU → EN</Badge></div>
        </button>
        <Card className="space-y-3">
          <div className="flex items-center gap-2"><Library className="w-5 h-5 text-accent" /><h2 className="text-lg font-semibold text-foreground">Фильтры</h2></div>
          <div>
            <label className="block text-sm text-foreground-secondary mb-2">Тип карточек</label>
            <select value={activeKind} onChange={(event) => handleKindChange(event.target.value as KindFilter)} className="w-full bg-background-hover border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent">
              <option value="all">Все карточки</option>
              <option value="word">Только слова</option>
              <option value="phrase">Только фразы</option>
              {hasSentenceCards ? <option value="sentence">Только предложения</option> : null}
            </select>
          </div>
          <div>
            <label className="block text-sm text-foreground-secondary mb-2">Новелла</label>
            <select value={activeNovel} onChange={(event) => handleNovelChange(event.target.value)} className="w-full bg-background-hover border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent">
              {availableNovels.map((novel) => <option key={novel}>{novel}</option>)}
            </select>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {shortcutButtons.map((shortcut) => {
          const Icon = shortcut.icon;
          const isActive = selectedShortcut === shortcut.id;

          return (
            <button
              key={shortcut.id}
              type="button"
              onClick={() => handleShortcutChange(shortcut.id)}
              aria-pressed={isActive}
              className={`rounded-xl border p-4 text-center transition-colors duration-200 ${
                isActive
                  ? "border-accent bg-accent-light/40"
                  : "border-border bg-background-card hover:border-border-hover hover:bg-background-hover"
              }`}
            >
              <Icon className={`w-6 h-6 mx-auto mb-2 ${shortcut.iconClass}`} />
              <p className="text-sm font-medium text-foreground">{shortcut.label}</p>
              <Badge variant={isActive ? shortcut.activeBadgeVariant : "default"} className="mt-2">{shortcut.count}</Badge>
            </button>
          );
        })}
        {shortcutButtons.length < 5 ? <div className="hidden lg:block" aria-hidden="true" /> : null}
      </div>

      {sessionSource === "practice" ? (
        <Card className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-foreground">Собери набор для тренировки</h2>
              <p className="text-sm text-foreground-secondary">Можешь взять случайную колоду или вручную отметить слова из текущего фильтра. Любой режим игр будет работать на этом наборе.</p>
            </div>
            <Badge variant={practicePreset === "custom" ? "warning" : "accent"}>
              {practicePreset === "custom" ? "Свой набор" : "Случайный набор"}
            </Badge>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-xl border border-border bg-background-hover p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Случайный набор</p>
                  <p className="text-xs text-foreground-secondary">Берём карточки из текущего фильтра и перемешиваем их.</p>
                </div>
                <select
                  value={practiceRandomSize}
                  onChange={(event) => setPracticeRandomSize(Number(event.target.value))}
                  className="bg-background-card border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent"
                >
                  <option value={10}>10 карточек</option>
                  <option value={20}>20 карточек</option>
                  <option value={30}>30 карточек</option>
                  <option value={9999}>Все доступные</option>
                </select>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button variant="secondary" onClick={buildRandomPracticeSet}>Собрать случайный набор</Button>
                <span className="text-sm text-foreground-secondary self-center">Сейчас по фильтру доступно {filteredCards.length} карточек.</span>
              </div>
            </div>
            <div className="rounded-xl border border-border bg-background-hover p-4 space-y-3">
              <div>
                <p className="text-sm font-medium text-foreground">Свой набор</p>
                <p className="text-xs text-foreground-secondary">Отметь слова вручную и запусти тренировку на выбранной колоде.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button variant="secondary" onClick={applyCustomPracticeSet} disabled={practiceDraftIds.length === 0}>Тренироваться на выбранных</Button>
                <Button variant="ghost" onClick={clearPracticeSelection}>Сбросить выбор</Button>
                <span className="text-sm text-foreground-secondary self-center">Отмечено: {practiceDraftIds.length}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="ghost"
              onClick={() => setPracticeDraftIds(filteredCards.map((card) => card.id))}
              disabled={filteredCards.length === 0}
            >
              Выбрать всё по фильтру
            </Button>
            <Button variant="ghost" onClick={() => setPracticeDraftIds([])} disabled={practiceDraftIds.length === 0}>
              Снять всё
            </Button>
          </div>
          <div className="max-h-80 overflow-y-auto rounded-xl border border-border bg-background-card">
            {filteredCards.length === 0 ? (
              <div className="px-4 py-6 text-sm text-foreground-secondary">
                Под текущие фильтры в словаре пока нет карточек для свободной тренировки.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredCards.map((card) => (
                  <label key={`practice-${card.id}`} className="flex cursor-pointer items-start gap-3 px-4 py-3 hover:bg-background-hover">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded border-border bg-background-card text-accent focus:ring-accent"
                      checked={practiceDraftSet.has(card.id)}
                      onChange={(event) => {
                        setPracticeDraftIds((current) =>
                          event.target.checked
                            ? [...current, card.id]
                            : current.filter((itemId) => itemId !== card.id),
                        );
                      }}
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-foreground">{card.en}</p>
                        <Badge variant={studyStatusMeta[card.status].variant}>{studyStatusMeta[card.status].label}</Badge>
                        <Badge variant="default">{kindLabel(card.kind)}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-accent">{card.ru}</p>
                      <p className="mt-1 text-xs text-foreground-muted">{card.novel}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        </Card>
      ) : null}

      {isEmptySelection ? (
        <Card className="space-y-4">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">
              {sessionSource === "daily" ? "Под эту подборку пока нет карточек" : "Набор для тренировки ещё не собран"}
            </h2>
            <p className="text-foreground-secondary">
              {sessionSource === "daily"
                ? "Сохрани новые слова в моде, выбери другую быструю подборку, поменяй фильтр или дождись времени следующего повторения."
                : "Собери случайную колоду или выбери слова вручную из списка выше, и затем запускай любой игровой режим."}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-border bg-background-hover px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-foreground-muted">Тип карточек</p>
              <p className="mt-1 text-base font-medium text-foreground">
                {activeKind === "all"
                  ? "Все карточки"
                  : activeKind === "word"
                    ? "Только слова"
                    : activeKind === "phrase"
                      ? "Только фразы"
                      : "Только предложения"}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-background-hover px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-foreground-muted">Новелла</p>
              <p className="mt-1 text-base font-medium text-foreground">{activeNovel}</p>
            </div>
          </div>
        </Card>
      ) : selectedMode === "pairs" ? (
        <PairsTrainer
          key={`pairs-${sessionSource}-${practicePreset}-${filteredIdsKey}`}
          cards={activeCards}
          onReload={sessionSource === "daily" ? reload : refreshPracticePairs}
          syncResults={sessionSource === "daily"}
        />
      ) : flashcardsComplete ? (
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-success/15 flex items-center justify-center mx-auto"><Trophy className="w-10 h-10 text-success" /></div>
            <h2 className="text-3xl font-bold text-foreground">Сессия карточек завершена</h2>
            <p className="text-foreground-secondary">
              {sessionSource === "daily" ? "Результаты уже сохранены в прогресс и историю действий." : "Это была свободная тренировка: ты прогнал набор, но не менял интервалы повторения."}
            </p>
          </div>
          <Card className="space-y-4">
            <div className="flex justify-between items-center"><span className="text-foreground-secondary">Карточек повторено</span><span className="text-foreground font-bold text-lg">{completedSessionCount}</span></div>
            <div className="h-px bg-border" />
            <div className="flex justify-between items-center"><div className="flex items-center gap-2"><Check className="w-4 h-4 text-success" /><span className="text-foreground-secondary">Знаю</span></div><span className="text-success font-bold">{sessionSummary.know}</span></div>
            <div className="flex justify-between items-center"><div className="flex items-center gap-2"><Brain className="w-4 h-4 text-warning" /><span className="text-foreground-secondary">Трудно</span></div><span className="text-warning font-bold">{sessionSummary.hard}</span></div>
            <div className="flex justify-between items-center"><div className="flex items-center gap-2"><X className="w-4 h-4 text-danger" /><span className="text-foreground-secondary">Не знаю</span></div><span className="text-danger font-bold">{sessionSummary.unknown}</span></div>
          </Card>
          <div className="flex gap-3 justify-center">
            <Button variant="secondary" onClick={resetFlashcardSession}><RotateCcw className="w-4 h-4 mr-2" />Начать заново</Button>
            {sessionSource === "daily" ? (
              <Button variant="primary" href="/dashboard/progress">Перейти к прогрессу</Button>
            ) : (
              <Button variant="primary" onClick={buildRandomPracticeSet}>Собрать новый набор</Button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-foreground-secondary"><span>Прогресс</span><span>{progressCount} / {Math.max(activeSessionCount, 1)}</span></div>
            <div className="h-2 bg-background-hover rounded-full overflow-hidden"><div className="h-full bg-accent rounded-full transition-all duration-300" style={{ width: `${(progressCount / Math.max(activeSessionCount, 1)) * 100}%` }} /></div>
          </div>
          {currentCard ? (
            <Card className="min-h-[320px] flex flex-col items-center justify-center text-center relative">
              <Badge variant={studyStatusMeta[currentCard.status].variant} className="absolute top-4 left-4">{studyStatusMeta[currentCard.status].label}</Badge>
              <Badge variant="default" className="absolute top-4 right-4">{safeIndex + 1} / {Math.max(activeSessionCount, 1)}</Badge>
              <p className="text-xs uppercase tracking-wide text-foreground-muted mb-4">{kindLabel(currentCard.kind)} · {currentCard.novel}</p>
              {effectiveMode === "flashcards" ? (
                <>
                  <p className="text-3xl sm:text-4xl font-bold text-foreground mb-2">{currentCard.en}</p>
                  {showTranslation ? (
                    <div className="mt-4 space-y-3 animate-in fade-in duration-300">
                      <p className="text-xl text-accent font-semibold">{currentCard.ru}</p>
                      {currentCard.context ? <p className="text-sm text-foreground-muted max-w-md italic">&ldquo;{currentCard.context}&rdquo;</p> : null}
                    </div>
                  ) : (
                    <Button variant="ghost" size="sm" className="mt-6" onClick={() => setShowTranslation(true)}><Eye className="w-4 h-4 mr-2" />Показать перевод</Button>
                  )}
                </>
              ) : (
                <div className="w-full max-w-2xl space-y-5">
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-foreground-secondary">
                      {effectiveMode === "cloze_choice" ? "Вставь пропущенное слово" : "Выбери английский вариант"}
                    </p>
                    <p className="text-2xl sm:text-3xl font-bold text-foreground">
                      {effectiveMode === "cloze_choice" ? clozePrompt : currentCard.ru}
                    </p>
                    {effectiveMode === "cloze_choice" ? (
                      <div className="rounded-xl border border-accent/20 bg-accent-light/20 px-4 py-3">
                        <p className="text-xs uppercase tracking-wide text-foreground-muted">Подсказка по переводу</p>
                        <p className="mt-1 text-lg font-semibold text-accent">{currentCard.ru}</p>
                      </div>
                    ) : null}
                    {selectedMode === "cloze_choice" && effectiveMode === "ru_en_choice" ? (
                      <p className="text-sm text-foreground-muted">
                        Для этой карточки точный cloze не собрался, поэтому используется fallback на RU → EN.
                      </p>
                    ) : null}
                    {effectiveMode === "cloze_choice" && currentCard.contextTranslation ? (
                      <p className="text-sm text-foreground-muted">{currentCard.contextTranslation}</p>
                    ) : null}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {choiceOptions.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => void submitReview(option.isCorrect ? "know" : "unknown", effectiveMode)}
                        disabled={isSubmitting}
                        className="rounded-xl border border-border bg-background-hover px-4 py-3 text-left text-sm font-medium text-foreground transition-colors hover:border-accent hover:bg-accent-light/30 disabled:opacity-60"
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          ) : null}
          {message ? <p className="text-sm text-foreground-secondary">{message}</p> : null}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4 text-sm text-foreground-secondary">
              {sessionSource === "daily" ? (
                <>
                  <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" />Лимит дня: {data.settings.dailyWords}</span>
                  <span>Новых в день: {data.settings.dailyNewWords}</span>
                  <span>{data.settings.prioritizeDifficult ? "Сложные слова в приоритете" : "Обычный порядок"}</span>
                </>
              ) : (
                <>
                  <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" />В выбранном наборе: {activeSessionCount}</span>
                  <span>{practicePreset === "custom" ? "Ручной набор" : "Случайная колода"}</span>
                  <span>Свободная практика без изменения прогресса</span>
                </>
              )}
            </div>
            {effectiveMode === "flashcards" && showTranslation ? (
              <div className="flex flex-wrap gap-2 justify-center">
                <button type="button" onClick={() => void submitReview("know", "flashcards")} disabled={isSubmitting} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-success/15 text-success hover:bg-success/25 transition-colors disabled:opacity-60"><Check className="w-4 h-4" />Знаю</button>
                <button type="button" onClick={() => void submitReview("hard", "flashcards")} disabled={isSubmitting} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-warning/15 text-warning hover:bg-warning/25 transition-colors disabled:opacity-60"><Star className="w-4 h-4" />Трудно</button>
                <button type="button" onClick={() => void submitReview("unknown", "flashcards")} disabled={isSubmitting} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-danger/15 text-danger hover:bg-danger/25 transition-colors disabled:opacity-60"><X className="w-4 h-4" />Не знаю</button>
              </div>
            ) : effectiveMode !== "flashcards" ? (
              <div className="flex flex-wrap gap-2 justify-center">
                <button type="button" onClick={() => void submitReview("hard", effectiveMode)} disabled={isSubmitting} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-warning/15 text-warning hover:bg-warning/25 transition-colors disabled:opacity-60"><Star className="w-4 h-4" />Не уверен</button>
                <Button variant="secondary" onClick={resetFlashcardSession}><RotateCcw className="w-4 h-4 mr-2" />Сбросить сессию</Button>
              </div>
            ) : (
              <Button variant="secondary" onClick={resetFlashcardSession}><RotateCcw className="w-4 h-4 mr-2" />Сбросить сессию</Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
