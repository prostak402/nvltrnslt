import {
  boolean,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  activationKey: varchar("activation_key", { length: 64 }).notNull().unique(),
  role: varchar("role", { length: 20 }).notNull().default("user"),
  plan: varchar("plan", { length: 20 }).notNull().default("free"),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  registeredAt: timestamp("registered_at", { withTimezone: true }).notNull(),
  lastActiveAt: timestamp("last_active_at", { withTimezone: true }).notNull(),
});

export const userSettings = pgTable("user_settings", {
  userId: integer("user_id").primaryKey().references(() => users.id),
  dailyWords: integer("daily_words").notNull().default(20),
  dailyNewWords: integer("daily_new_words").notNull().default(10),
  prioritizeDifficult: boolean("prioritize_difficult").notNull().default(true),
  includePhrases: boolean("include_phrases").notNull().default(false),
  autoSync: boolean("auto_sync").notNull().default(true),
  poorConnection: varchar("poor_connection", { length: 20 })
    .notNull()
    .default("queue"),
  reminderEnabled: boolean("reminder_enabled").notNull().default(true),
  emailNotifications: boolean("email_notifications").notNull().default(true),
});

export const devices = pgTable("devices", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  label: varchar("label", { length: 120 }).notNull(),
  tokenHash: text("token_hash").notNull(),
  rawTokenPreview: varchar("raw_token_preview", { length: 32 }).notNull(),
  linkedAt: timestamp("linked_at", { withTimezone: true }).notNull(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("active"),
}, (table) => ({
  tokenHashUniqueIdx: uniqueIndex("devices_token_hash_unique").on(table.tokenHash),
}));

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  requestedEmail: varchar("requested_email", { length: 255 }).notNull(),
  tokenHash: text("token_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
}, (table) => ({
  tokenHashUniqueIdx: uniqueIndex("password_reset_tokens_token_hash_unique").on(
    table.tokenHash,
  ),
}));

export const deviceLinkCodes = pgTable("device_link_codes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  code: varchar("code", { length: 24 }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
}, (table) => ({
  codeUniqueIdx: uniqueIndex("device_link_codes_code_unique").on(table.code),
}));

export const studyItems = pgTable("study_items", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  kind: varchar("kind", { length: 20 }).notNull(),
  text: text("text").notNull(),
  normalizedText: text("normalized_text").notNull(),
  translation: text("translation").notNull().default(""),
  note: text("note").notNull().default(""),
  status: varchar("status", { length: 20 }).notNull().default("new"),
  isActive: boolean("is_active").notNull().default(false),
  learningStage: integer("learning_stage").notNull().default(0),
  masteryScore: integer("mastery_score").notNull().default(0),
  strongSuccessStreak: integer("strong_success_streak").notNull().default(0),
  activatedAt: timestamp("activated_at", { withTimezone: true }),
  lastAnswerAt: timestamp("last_answer_at", { withTimezone: true }),
  lastMasteredAt: timestamp("last_mastered_at", { withTimezone: true }),
  maintenanceStage: integer("maintenance_stage").notNull().default(0),
  correctStreak: integer("correct_streak").notNull().default(0),
  wrongCount: integer("wrong_count").notNull().default(0),
  repetitions: integer("repetitions").notNull().default(0),
  totalViews: integer("total_views").notNull().default(0),
  nextReviewAt: timestamp("next_review_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull(),
}, (table) => ({
  userKindNormalizedTextUniqueIdx: uniqueIndex("study_items_user_kind_text_unique").on(
    table.userId,
    table.kind,
    table.normalizedText,
  ),
}));

export const studyItemOccurrences = pgTable("study_item_occurrences", {
  id: serial("id").primaryKey(),
  studyItemId: integer("study_item_id").notNull().references(() => studyItems.id),
  userId: integer("user_id").notNull().references(() => users.id),
  novelTitle: varchar("novel_title", { length: 180 }).notNull(),
  contextOriginal: text("context_original").notNull().default(""),
  contextTranslation: text("context_translation").notNull().default(""),
  contextWordPosition: integer("context_word_position"),
  source: varchar("source", { length: 20 }).notNull().default("mod"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
});

export const reviewEvents = pgTable("review_events", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  studyItemId: integer("study_item_id").notNull().references(() => studyItems.id),
  rating: varchar("rating", { length: 20 }).notNull(),
  taskType: varchar("task_type", { length: 30 }),
  sessionMode: varchar("session_mode", { length: 20 }).notNull().default("rated"),
  beforeStatus: varchar("before_status", { length: 20 }).notNull(),
  afterStatus: varchar("after_status", { length: 20 }).notNull(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }).notNull(),
});

export const activityEvents = pgTable("activity_events", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  type: varchar("type", { length: 30 }).notNull(),
  action: varchar("action", { length: 180 }).notNull(),
  detail: text("detail").notNull(),
  level: varchar("level", { length: 20 }).notNull().default("info"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
});

export const translationCache = pgTable("translation_cache", {
  id: serial("id").primaryKey(),
  text: text("text").notNull(),
  targetLanguage: varchar("target_language", { length: 10 }).notNull(),
  translatedText: text("translated_text").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
}, (table) => ({
  textTargetLanguageUniqueIdx: uniqueIndex("translation_cache_text_target_unique").on(
    table.text,
    table.targetLanguage,
  ),
}));

export const translationUsageDaily = pgTable("translation_usage_daily", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  dayKey: varchar("day_key", { length: 20 }).notNull(),
  count: integer("count").notNull().default(0),
}, (table) => ({
  userDayKeyUniqueIdx: uniqueIndex("translation_usage_daily_user_day_unique").on(
    table.userId,
    table.dayKey,
  ),
}));

export const supportTickets = pgTable("support_tickets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  subject: varchar("subject", { length: 180 }).notNull(),
  category: varchar("category", { length: 20 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("open"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

export const supportMessages = pgTable("support_messages", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").notNull().references(() => supportTickets.id),
  authorRole: varchar("author_role", { length: 20 }).notNull(),
  authorUserId: integer("author_user_id"),
  authorName: varchar("author_name", { length: 120 }).notNull(),
  text: text("text").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
});

export const compatibilityGames = pgTable("compatibility_games", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 180 }).notNull(),
  renpyVersion: varchar("renpy_version", { length: 40 }).notNull(),
  status: varchar("status", { length: 20 }).notNull(),
  comment: text("comment").notNull(),
  addedAt: timestamp("added_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  plan: varchar("plan", { length: 20 }).notNull(),
  status: varchar("status", { length: 20 }).notNull(),
  billingProvider: varchar("billing_provider", { length: 40 }),
  externalSubscriptionId: varchar("external_subscription_id", { length: 191 }),
  currentPeriodStart: timestamp("current_period_start", { withTimezone: true }),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  renewalAt: timestamp("renewal_at", { withTimezone: true }),
  endedAt: timestamp("ended_at", { withTimezone: true }),
});

export const paymentEvents = pgTable("payment_events", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  subscriptionId: integer("subscription_id").references(() => subscriptions.id),
  amount: varchar("amount", { length: 40 }).notNull(),
  currency: varchar("currency", { length: 8 }).notNull().default("USD"),
  billingProvider: varchar("billing_provider", { length: 40 }),
  externalPaymentId: varchar("external_payment_id", { length: 191 }),
  externalCheckoutId: varchar("external_checkout_id", { length: 191 }),
  externalEventId: varchar("external_event_id", { length: 191 }),
  status: varchar("status", { length: 20 }).notNull(),
  occurredAt: timestamp("occurred_at", { withTimezone: true }),
  errorMessage: text("error_message").notNull().default(""),
  payload: jsonb("payload"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
});

export const billingCheckoutIntents = pgTable("billing_checkout_intents", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  currentPlan: varchar("current_plan", { length: 20 }).notNull(),
  targetPlan: varchar("target_plan", { length: 20 }).notNull(),
  status: varchar("status", { length: 30 }).notNull(),
  billingProvider: varchar("billing_provider", { length: 40 }),
  externalReference: varchar("external_reference", { length: 191 }),
  checkoutUrl: text("checkout_url"),
  errorMessage: text("error_message").notNull().default(""),
  payload: jsonb("payload"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

export const adminAuditLogs = pgTable("admin_audit_logs", {
  id: serial("id").primaryKey(),
  adminUserId: integer("admin_user_id").references(() => users.id),
  type: varchar("type", { length: 30 }).notNull(),
  action: varchar("action", { length: 180 }).notNull(),
  detail: text("detail").notNull(),
  level: varchar("level", { length: 20 }).notNull().default("info"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
});

export const systemState = pgTable("system_state", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  payload: jsonb("payload").notNull(),
});
