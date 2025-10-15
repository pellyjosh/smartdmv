ALTER TABLE "practices" ADD COLUMN "payment_providers" jsonb;--> statement-breakpoint
ALTER TABLE "practices" ADD COLUMN "payment_enabled" boolean DEFAULT false;