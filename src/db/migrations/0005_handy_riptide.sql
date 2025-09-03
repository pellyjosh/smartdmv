ALTER TABLE "audit_logs" ALTER COLUMN "id" SET DATA TYPE serial;--> statement-breakpoint
ALTER TABLE "audit_logs" ALTER COLUMN "id" DROP DEFAULT;