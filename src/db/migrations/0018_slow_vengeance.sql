ALTER TABLE "invoice_items" ALTER COLUMN "currency_id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "invoice_items" ALTER COLUMN "currency_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ALTER COLUMN "currency_id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "currency_id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "expenses" ALTER COLUMN "currency_id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "expenses" ALTER COLUMN "currency_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "payroll" ALTER COLUMN "currency_id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "payroll" ALTER COLUMN "currency_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "refunds" ALTER COLUMN "currency_id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "refunds" ALTER COLUMN "currency_id" SET NOT NULL;