CREATE TABLE "practice_payment_providers" (
	"id" serial PRIMARY KEY NOT NULL,
	"practice_id" integer NOT NULL,
	"provider_code" text NOT NULL,
	"provider_name" text NOT NULL,
	"is_enabled" boolean DEFAULT false NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"public_key" text,
	"secret_key" text,
	"webhook_secret" text,
	"environment" text DEFAULT 'sandbox' NOT NULL,
	"config" jsonb,
	"priority" text DEFAULT '0' NOT NULL,
	"last_tested_at" timestamp,
	"test_results" jsonb,
	"configured_by" integer,
	"last_used_at" timestamp,
	"total_transactions" text DEFAULT '0',
	"total_amount" text DEFAULT '0',
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "practice_payment_providers" ADD CONSTRAINT "practice_payment_providers_practice_id_practices_id_fk" FOREIGN KEY ("practice_id") REFERENCES "public"."practices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_payment_providers" ADD CONSTRAINT "practice_payment_providers_configured_by_users_id_fk" FOREIGN KEY ("configured_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;