CREATE TABLE "integration_api_keys" (
	"id" serial PRIMARY KEY NOT NULL,
	"practice_id" integer NOT NULL,
	"key_name" text NOT NULL,
	"key_hash" text NOT NULL,
	"key_prefix" text NOT NULL,
	"permissions" text NOT NULL,
	"scopes" text,
	"last_used_at" timestamp,
	"usage_count" integer DEFAULT 0,
	"rate_limit_per_hour" integer DEFAULT 100,
	"rate_limit_per_day" integer DEFAULT 1000,
	"is_active" boolean DEFAULT true,
	"expires_at" timestamp,
	"createdAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integration_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"practice_id" integer NOT NULL,
	"website_url" text,
	"is_verified" boolean DEFAULT false,
	"widget_settings" text,
	"api_settings" text,
	"webhook_url" text,
	"webhook_secret" text,
	"rate_limit_per_hour" integer DEFAULT 100,
	"allowed_origins" text,
	"is_active" boolean DEFAULT true,
	"last_sync_at" timestamp,
	"createdAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "widget_analytics" (
	"id" serial PRIMARY KEY NOT NULL,
	"practice_id" integer NOT NULL,
	"event_type" text NOT NULL,
	"widget_id" text,
	"session_id" text,
	"appointment_type" text,
	"appointment_duration" integer,
	"user_agent" text,
	"referrer_url" text,
	"ip_address" text,
	"widget_version" text,
	"widget_config" text,
	"createdAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "practices" ADD COLUMN "api_key" text;--> statement-breakpoint
ALTER TABLE "practices" ADD COLUMN "api_key_last_reset" timestamp;--> statement-breakpoint
ALTER TABLE "practices" ADD COLUMN "webhook_url" text;--> statement-breakpoint
ALTER TABLE "practices" ADD COLUMN "booking_widget_enabled" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "practices" ADD COLUMN "booking_widget_settings" jsonb;--> statement-breakpoint
ALTER TABLE "integration_api_keys" ADD CONSTRAINT "integration_api_keys_practice_id_practices_id_fk" FOREIGN KEY ("practice_id") REFERENCES "public"."practices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_settings" ADD CONSTRAINT "integration_settings_practice_id_practices_id_fk" FOREIGN KEY ("practice_id") REFERENCES "public"."practices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "widget_analytics" ADD CONSTRAINT "widget_analytics_practice_id_practices_id_fk" FOREIGN KEY ("practice_id") REFERENCES "public"."practices"("id") ON DELETE cascade ON UPDATE no action;