ALTER TABLE "review_events" ADD COLUMN "session_mode" varchar(20) DEFAULT 'rated' NOT NULL;--> statement-breakpoint
ALTER TABLE "study_items" ADD COLUMN "mastery_score" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "study_items" ADD COLUMN "strong_success_streak" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "study_items" ADD COLUMN "last_mastered_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "study_items" ADD COLUMN "maintenance_stage" integer DEFAULT 0 NOT NULL;--> statement-breakpoint

UPDATE "study_items"
SET
  "is_active" = false,
  "learning_stage" = 4,
  "last_mastered_at" = COALESCE("last_answer_at", "updated_at", "created_at"),
  "maintenance_stage" = COALESCE("maintenance_stage", 0)
WHERE "status" = 'learned';--> statement-breakpoint

UPDATE "study_items"
SET
  "is_active" = true,
  "learning_stage" = GREATEST("learning_stage", 1),
  "activated_at" = COALESCE("activated_at", "last_answer_at", "created_at"),
  "next_review_at" = LEAST("next_review_at", NOW())
WHERE "status" = 'hard';--> statement-breakpoint

UPDATE "study_items"
SET
  "is_active" = true,
  "activated_at" = COALESCE("activated_at", "last_answer_at", "created_at")
WHERE "status" = 'new'
  AND "repetitions" > 0;--> statement-breakpoint
