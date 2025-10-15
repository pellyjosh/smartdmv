ALTER TABLE "invoice_items" ALTER COLUMN "currency_id" SET DEFAULT 1;--> statement-breakpoint
ALTER TABLE "invoices" ALTER COLUMN "currency_id" SET DEFAULT 1;--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "currency_id" SET DEFAULT 1;--> statement-breakpoint
ALTER TABLE "expenses" ALTER COLUMN "currency_id" SET DEFAULT 1;--> statement-breakpoint
ALTER TABLE "refunds" ALTER COLUMN "currency_id" SET DEFAULT 1;