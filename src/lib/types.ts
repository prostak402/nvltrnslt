import type {
  BILLING_INTENT_STATUSES,
  BILLING_MODES,
  COMPATIBILITY_STATUSES,
  PLAN_ORDER,
  REVIEW_RATINGS,
  REVIEW_TASK_TYPES,
  STUDY_KINDS,
  STUDY_STATUSES,
  SUPPORT_CATEGORIES,
  TICKET_STATUSES,
} from "@/lib/config";

export type PlanId = (typeof PLAN_ORDER)[number];
export type StudyKind = (typeof STUDY_KINDS)[number];
export type StudyStatus = (typeof STUDY_STATUSES)[number];
export type ReviewRating = (typeof REVIEW_RATINGS)[number];
export type ReviewTaskType = (typeof REVIEW_TASK_TYPES)[number];
export type SupportCategory = (typeof SUPPORT_CATEGORIES)[number];
export type TicketStatus = (typeof TICKET_STATUSES)[number];
export type CompatibilityStatus = (typeof COMPATIBILITY_STATUSES)[number];
export type BillingMode = (typeof BILLING_MODES)[number];
export type BillingIntentStatus = (typeof BILLING_INTENT_STATUSES)[number];
export type UserRole = "user" | "admin";
export type SubscriptionStatus = "active" | "trial" | "cancelled" | "expired";
export type ActivityType =
  | "translation"
  | "word"
  | "phrase"
  | "review"
  | "sync"
  | "auth"
  | "payment"
  | "support"
  | "system";
export type ActivityLevel = "info" | "success" | "warning" | "error";

export interface UserRecord {
  id: number;
  name: string;
  email: string;
  passwordHash: string;
  activationKey: string;
  role: UserRole;
  plan: PlanId;
  status: "active" | "banned" | "inactive";
  registeredAt: string;
  lastActiveAt: string;
}

export interface UserSettingsRecord {
  userId: number;
  dailyWords: number;
  dailyNewWords: number;
  prioritizeDifficult: boolean;
  includePhrases: boolean;
  autoSync: boolean;
  poorConnection: "queue" | "retry" | "skip";
  reminderEnabled: boolean;
  emailNotifications: boolean;
}

export interface DeviceRecord {
  id: number;
  userId: number;
  label: string;
  tokenHash: string;
  rawTokenPreview: string;
  linkedAt: string;
  lastSeenAt: string;
  status: "active" | "inactive" | "revoked";
}

export interface PasswordResetTokenRecord {
  id: number;
  userId: number | null;
  requestedEmail: string;
  tokenHash: string;
  createdAt: string;
  expiresAt: string;
  usedAt: string | null;
}

export interface DeviceLinkCodeRecord {
  id: number;
  userId: number;
  code: string;
  expiresAt: string;
  usedAt: string | null;
  createdAt: string;
}

export interface StudyItemRecord {
  id: number;
  userId: number;
  kind: StudyKind;
  text: string;
  normalizedText: string;
  translation: string;
  note: string;
  status: StudyStatus;
  isActive: boolean;
  learningStage: number;
  activatedAt: string | null;
  lastAnswerAt: string | null;
  correctStreak: number;
  wrongCount: number;
  repetitions: number;
  totalViews: number;
  nextReviewAt: string;
  createdAt: string;
  updatedAt: string;
  lastSeenAt: string;
}

export interface StudyItemOccurrenceRecord {
  id: number;
  studyItemId: number;
  userId: number;
  novelTitle: string;
  contextOriginal: string;
  contextTranslation: string;
  contextWordPosition: number | null;
  source: "mod" | "import" | "site";
  createdAt: string;
}

export interface ReviewEventRecord {
  id: number;
  userId: number;
  studyItemId: number;
  rating: ReviewRating;
  taskType: ReviewTaskType | null;
  beforeStatus: StudyStatus;
  afterStatus: StudyStatus;
  reviewedAt: string;
}

export interface ActivityEventRecord {
  id: number;
  userId: number;
  type: ActivityType;
  action: string;
  detail: string;
  level: ActivityLevel;
  createdAt: string;
}

export interface TranslationCacheRecord {
  id: number;
  text: string;
  targetLanguage: string;
  translatedText: string;
  createdAt: string;
}

export interface TranslationUsageDailyRecord {
  id: number;
  userId: number;
  dayKey: string;
  count: number;
}

export interface SupportTicketRecord {
  id: number;
  userId: number;
  subject: string;
  category: SupportCategory;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
}

export interface SupportMessageRecord {
  id: number;
  ticketId: number;
  authorRole: UserRole;
  authorUserId: number | null;
  authorName: string;
  text: string;
  createdAt: string;
}

export interface CompatibilityGameRecord {
  id: number;
  name: string;
  renpyVersion: string;
  status: CompatibilityStatus;
  comment: string;
  addedAt: string;
  updatedAt: string;
}

export interface BillingLifecycleSnapshot {
  phase:
    | "trial"
    | "active"
    | "cancel_scheduled"
    | "access_until_period_end"
    | "expired";
  hasAccess: boolean;
  autoRenews: boolean;
  isCancelled: boolean;
  isCancellationScheduled: boolean;
}

export interface SubscriptionRecord {
  id: number;
  userId: number;
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
}

export interface PaymentEventRecord {
  id: number;
  userId: number;
  subscriptionId: number | null;
  amount: string;
  currency: string;
  status: "paid" | "pending" | "failed" | "refunded";
  createdAt: string;
  billingProvider?: string | null;
  externalPaymentId?: string | null;
  externalCheckoutId?: string | null;
  externalEventId?: string | null;
  occurredAt?: string | null;
  errorMessage?: string;
  payload?: Record<string, unknown> | null;
}

export interface BillingCheckoutIntentRecord {
  id: number;
  userId: number;
  currentPlan: PlanId;
  targetPlan: PlanId;
  status: BillingIntentStatus;
  billingProvider: string | null;
  externalReference: string | null;
  checkoutUrl: string | null;
  errorMessage: string;
  payload: Record<string, unknown> | null;
  expiresAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminAuditLogRecord {
  id: number;
  adminUserId: number | null;
  type: ActivityType | "admin";
  action: string;
  detail: string;
  level: ActivityLevel;
  createdAt: string;
}

export interface AdminSettingsRecord {
  defaultDailyLimit: Record<PlanId, number | null>;
  maxDictionarySize: Record<PlanId, number | null>;
  apiTimeoutSec: number;
  autoBackup: boolean;
  backupTime: string;
  maintenanceMode: boolean;
  registrationOpen: boolean;
  adminNotifications: boolean;
  errorAlerts: boolean;
}

export interface AdminSettingsPatch {
  defaultDailyLimit?: Partial<Record<PlanId, number | null>>;
  maxDictionarySize?: Partial<Record<PlanId, number | null>>;
  apiTimeoutSec?: number;
  autoBackup?: boolean;
  backupTime?: string;
  maintenanceMode?: boolean;
  registrationOpen?: boolean;
  adminNotifications?: boolean;
  errorAlerts?: boolean;
}

export interface BackupStatusRecord {
  lastSuccessAt: string | null;
  lastErrorAt: string | null;
  lastErrorMessage: string;
  lastFileName: string;
  lastFilePath: string;
  lastTrigger: "manual" | "scheduled" | "";
  nextDueAt: string | null;
}

export interface CountersRecord {
  users: number;
  devices: number;
  deviceLinkCodes: number;
  studyItems: number;
  studyItemOccurrences: number;
  reviewEvents: number;
  activityEvents: number;
  translationCache: number;
  translationUsageDaily: number;
  supportTickets: number;
  supportMessages: number;
  compatibilityGames: number;
  subscriptions: number;
  paymentEvents: number;
  adminAuditLogs: number;
}

export interface AppState {
  version: number;
  counters: CountersRecord;
  users: UserRecord[];
  userSettings: UserSettingsRecord[];
  devices: DeviceRecord[];
  deviceLinkCodes: DeviceLinkCodeRecord[];
  studyItems: StudyItemRecord[];
  studyItemOccurrences: StudyItemOccurrenceRecord[];
  reviewEvents: ReviewEventRecord[];
  activityEvents: ActivityEventRecord[];
  translationCache: TranslationCacheRecord[];
  translationUsageDaily: TranslationUsageDailyRecord[];
  supportTickets: SupportTicketRecord[];
  supportMessages: SupportMessageRecord[];
  compatibilityGames: CompatibilityGameRecord[];
  subscriptions: SubscriptionRecord[];
  paymentEvents: PaymentEventRecord[];
  adminAuditLogs: AdminAuditLogRecord[];
  adminSettings: AdminSettingsRecord;
}

export interface SessionPayload {
  userId: number;
  role: UserRole;
  email: string;
}
