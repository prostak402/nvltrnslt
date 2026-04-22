import type {
  PlanId,
  ReviewTaskType,
  SupportCategory,
  TicketStatus,
  UserRole,
} from "@/lib/types";

export interface DashboardOverviewResponse {
  user: {
    id: number;
    name: string;
    email: string;
    role: UserRole;
    plan: PlanId;
  };
  recentWords: Array<{
    id: number;
    word: string;
    translation: string;
    novel: string;
    relativeDate: string;
    status: "new" | "hard" | "learned";
  }>;
  recentPhrases: Array<{
    id: number;
    phrase: string;
    translation: string;
    novel: string;
  }>;
  weeklyActivity: Array<{
    day: string;
    saved: number;
    reviewed: number;
  }>;
  summary: {
    wordsCount: number;
    phrasesCount: number;
    newCount: number;
    learnedCount: number;
    hardCount: number;
    dueCount: number;
    translationsToday: number;
    translationsLimit: number | null;
    savesToday: number;
    reviewsToday: number;
  };
}

export interface DashboardPlanResponse {
  currentPlan: {
    name: string;
    price: string;
    nextBilling: string;
    translationsLimit: number | null;
    translationsUsed: number;
    wordsLimit: number | null;
    wordsUsed: number;
  };
  payments: Array<{
    date: string;
    amount: string;
    status: string;
  }>;
  subscription?: unknown;
  billing?: unknown;
}

export interface DashboardProgressResponse {
  weeklyData: Array<{ day: string; saved: number; reviewed: number }>;
  novelStats: Array<{
    name: string;
    words: number;
    learned: number;
    difficult: number;
    newW: number;
  }>;
  statusBreakdown: Array<{
    label: string;
    count: number;
    color: string;
  }>;
  totalWords: number;
  streak: number;
  accuracy: number;
  dueItems: number;
  weeklyAdded: number;
  weeklyReviewed: number;
}

export interface DashboardHistoryResponse {
  activities: Array<{
    id: number;
    type: "translation" | "word" | "phrase" | "system";
    description: string;
    timestamp: string;
    date: string;
    level: "info" | "success" | "warning" | "error";
  }>;
}

export interface DashboardShellSummary {
  translationsUsed: number;
  translationsLimit: number | null;
}

export interface DashboardSettingsResponse {
  email: string;
  dailyWords: number;
  dailyNewWords: number;
  prioritizeDifficult: boolean;
  includePhrases: boolean;
  autoSync: boolean;
  poorConnection: "queue" | "retry" | "skip";
  reminderEnabled: boolean;
  emailNotifications: boolean;
}

export interface DashboardLearningCard {
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
  isMaintenance: boolean;
  completedToday: boolean;
  currentTaskType: ReviewTaskType | null;
  completedTaskTypesToday: ReviewTaskType[];
  learningStage: number;
  masteryScore: number;
  strongSuccessStreak: number;
  todayPoints: number;
  hasCloze: boolean;
  clozeText: string | null;
  clozeAnswer: string | null;
}

export interface DashboardRatedSessionResponse {
  queueWords: DashboardLearningCard[];
  availableByMode: {
    pairs: number;
    flashcards: number;
    ru_en_choice: number;
    cloze_choice: number;
  };
  sessionPoints: number;
  completedWords: number;
  remainingWords: number;
  totalWords: number;
  newCount: number;
  hardCount: number;
  maintenanceCount: number;
}

export interface DashboardLearningResponse {
  ratedSession: DashboardRatedSessionResponse;
  practicePool: DashboardLearningCard[];
  novels: string[];
  settings: {
    dailyWords: number;
    dailyNewWords: number;
    prioritizeDifficult: boolean;
    includePhrases: boolean;
  };
}

export interface DashboardSupportTicketMessage {
  id: number;
  authorRole: "user" | "admin";
  authorName: string;
  text: string;
  createdAt: string;
  createdAtLabel: string;
}

export interface DashboardSupportTicketListItem {
  id: number;
  subject: string;
  category: SupportCategory;
  status: TicketStatus;
  createdAtLabel: string;
  updatedAtLabel: string;
  messageCount: number;
  lastMessagePreview: string | null;
}

export interface DashboardSupportResponse {
  faqItems: Array<{ q: string; a: string }>;
  tickets: DashboardSupportTicketListItem[];
}

export interface DashboardSupportTicketResponse {
  id: number;
  subject: string;
  category: SupportCategory;
  status: TicketStatus;
  createdAtLabel: string;
  updatedAtLabel: string;
  messages: DashboardSupportTicketMessage[];
}
