ALTER TABLE "review_events" ADD COLUMN "task_type" varchar(30);--> statement-breakpoint
ALTER TABLE "study_items" ADD COLUMN "is_active" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "study_items" ADD COLUMN "learning_stage" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "study_items" ADD COLUMN "activated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "study_items" ADD COLUMN "last_answer_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "study_items" ADD COLUMN "wrong_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "daily_new_words" integer DEFAULT 10 NOT NULL;--> statement-breakpoint

UPDATE "study_items"
SET
  "is_active" = false,
  "learning_stage" = 4,
  "activated_at" = COALESCE("last_seen_at", "updated_at", "created_at"),
  "last_answer_at" = COALESCE("last_seen_at", "updated_at", "created_at")
WHERE "status" = 'learned';--> statement-breakpoint

UPDATE "study_items"
SET
  "is_active" = true,
  "learning_stage" = 1,
  "activated_at" = COALESCE("activated_at", "created_at"),
  "last_answer_at" = COALESCE("last_seen_at", "updated_at", "created_at"),
  "wrong_count" = GREATEST("wrong_count", 1)
WHERE "status" = 'hard';--> statement-breakpoint

UPDATE "study_items"
SET
  "is_active" = true,
  "learning_stage" = LEAST(GREATEST("correct_streak", 0), 3),
  "activated_at" = COALESCE("activated_at", "created_at"),
  "last_answer_at" = COALESCE("last_seen_at", "updated_at", "created_at")
WHERE
  "status" = 'new'
  AND (
    "repetitions" > 0
    OR "correct_streak" > 0
    OR "last_seen_at" > "created_at"
  );--> statement-breakpoint

UPDATE "study_items"
SET
  "is_active" = false,
  "learning_stage" = 0,
  "activated_at" = NULL,
  "last_answer_at" = NULL
WHERE
  "status" = 'new'
  AND NOT (
    "repetitions" > 0
    OR "correct_streak" > 0
    OR "last_seen_at" > "created_at"
  );
