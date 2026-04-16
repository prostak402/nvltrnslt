CREATE TABLE "billing_checkout_intents" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"current_plan" varchar(20) NOT NULL,
	"target_plan" varchar(20) NOT NULL,
	"status" varchar(30) NOT NULL,
	"billing_provider" varchar(40),
	"external_reference" varchar(191),
	"checkout_url" text,
	"error_message" text DEFAULT '' NOT NULL,
	"payload" jsonb,
	"expires_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "payment_events" ADD COLUMN "billing_provider" varchar(40);--> statement-breakpoint
ALTER TABLE "payment_events" ADD COLUMN "external_payment_id" varchar(191);--> statement-breakpoint
ALTER TABLE "payment_events" ADD COLUMN "external_checkout_id" varchar(191);--> statement-breakpoint
ALTER TABLE "payment_events" ADD COLUMN "external_event_id" varchar(191);--> statement-breakpoint
ALTER TABLE "payment_events" ADD COLUMN "occurred_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "payment_events" ADD COLUMN "error_message" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "payment_events" ADD COLUMN "payload" jsonb;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "billing_provider" varchar(40);--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "external_subscription_id" varchar(191);--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "current_period_start" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "current_period_end" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "cancel_at_period_end" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "cancelled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "billing_checkout_intents" ADD CONSTRAINT "billing_checkout_intents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;