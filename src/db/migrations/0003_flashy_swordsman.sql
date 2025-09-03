CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"user_id" text,
	"action" text NOT NULL,
	"record_type" text NOT NULL,
	"record_id" text,
	"description" text,
	"ip_address" text,
	"user_agent" text,
	"metadata" jsonb,
	"changes" jsonb,
	"reason" text,
	"practice_id" text,
	"organization_id" text,
	"version" text,
	"is_active" boolean DEFAULT true
);
