import type {
  ActivityLevel,
  ActivityType,
  BillingLifecycleSnapshot,
  PaymentEventRecord,
  PlanId,
  SubscriptionStatus,
} from "@/lib/types";

export type TranslationDegradeReason =
  | "provider_not_configured"
  | "provider_timeout"
  | "provider_rate_limited"
  | "provider_http_error"
  | "provider_auth_error"
  | "provider_invalid_response"
  | "provider_network_error";

export type TranslationSource = "yandex" | "local" | "cache" | null;
export type TranslationStatus = "healthy" | "degraded" | "not_configured";
export type TranslationMode = "fallback" | "error";
export type HealthProbeStatus = "ok" | "degraded" | "unknown";
export type ReadinessProbeStatus = "ready" | "not_ready" | "unknown";

export interface AdminDashboardResponse {
  stats: {
    totalUsers: number;
    activeToday: number;
    newThisWeek: number;
    monthlyRevenue: string;
    translationsToday: number;
    openTickets: number;
  };
  recentUsers: Array<{
    id: number;
    name: string;
    email: string;
    plan: PlanId;
    status: "active" | "banned" | "inactive";
    registeredAt: string;
  }>;
  recentTickets: Array<{
    id: number;
    subject: string;
    status: "open" | "in_progress" | "waiting" | "resolved" | "closed";
    userId: number;
    updatedAt: string;
  }>;
  translationHealth: {
    upstreamProvider: "yandex" | "local";
    providerConfigured: boolean;
    degradedMode: TranslationMode;
    currentStatus: TranslationStatus;
    currentSource: TranslationSource;
    lastTranslationAt: string | null;
    lastHealthyAt: string | null;
    lastDegradedAt: string | null;
    lastDegradeReason: TranslationDegradeReason | null;
    recentRequests24h: number;
    degradedEvents24h: number;
    degradedReasons24h: Array<{
      reason: TranslationDegradeReason;
      count: number;
    }>;
  };
  observability: {
    health: {
      status: HealthProbeStatus;
      checkedAt: string | null;
      consecutiveFailures: number;
    };
    readiness: {
      status: ReadinessProbeStatus;
      checkedAt: string | null;
      warnings: string[];
    };
    recentErrors15m: number;
    recentErrors24h: number;
    lastError: {
      at: string;
      source: string;
      code: string;
      message: string;
      status: number;
    } | null;
  };
  alerts: string[];
}

export interface AdminAnalyticsResponse {
  registrationData: Array<{ month: string; value: number }>;
  translationVolume: Array<{ day: string; value: number }>;
  topNovels: Array<{ name: string; users: number; words: number; pct: number }>;
  retentionData: Array<{ label: string; value: number }>;
  kpis: {
    totalUsers: number;
    dauMau: string;
    arpu: string;
    translationsMonth: number;
    wordsSaved: number;
    averageDictionary: string;
  };
}

export interface AdminLogEntry {
  id: string;
  type: ActivityType | "system";
  action: string;
  userId?: number;
  userName?: string;
  detail: string;
  timestamp: string;
  level: ActivityLevel;
}

export interface AdminUserRow {
  id: number;
  name: string;
  email: string;
  plan: PlanId;
  status: "active" | "banned" | "inactive";
  registeredAt: string;
  lastActiveAt: string;
  wordsCount: number;
  phrasesCount: number;
  translationsToday: number;
  translationLimit: number | null;
  devicesCount: number;
  totalTranslations: number;
  activationKeyPreview: string;
}

export interface AdminSubscriptionPaymentRow {
  id: number;
  amount: string;
  currency: string;
  status: PaymentEventRecord["status"];
  createdAt: string;
}

export interface AdminSubscriptionRow {
  id: number;
  userId: number;
  userName: string;
  email: string;
  plan: PlanId;
  status: SubscriptionStatus;
  startedAt: string;
  renewalAt: string | null;
  endedAt: string | null;
  billingProvider?: string | null;
  externalSubscriptionId?: string | null;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
  cancelledAt?: string | null;
  lifecycle?: BillingLifecycleSnapshot;
  translationsToday: number;
  payments: AdminSubscriptionPaymentRow[];
}
