CREATE TABLE "currencies" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"symbol" text NOT NULL,
	"decimals" text DEFAULT '2',
	"active" text DEFAULT 'yes' NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "currencies_code_unique" UNIQUE("code")
);
--> statement-breakpoint

-- Seed base currencies (id may not be 1 if preexisting rows exist in some tenants)
INSERT INTO "currencies" (code, name, symbol, decimals, active, created_at, updated_at)
VALUES
	('USD', 'US Dollar', '$', '2', 'yes', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
	('NGN', 'Nigerian Naira', '₦', '2', 'yes', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (code) DO NOTHING;
--> statement-breakpoint
ALTER TABLE "practices" ADD COLUMN "default_currency_id" integer;--> statement-breakpoint

-- Add currency_id columns as NULLABLE so we can backfill existing rows safely
ALTER TABLE "invoice_items" ADD COLUMN "currency_id" integer;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "currency_id" integer;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "currency_id" integer;--> statement-breakpoint

-- Backfill existing records to USD (assumes USD will be seeded with id = 1)
-- Use actual USD id when backfilling (handles tenants where USD is not id=1)
UPDATE "invoice_items" SET "currency_id" = (SELECT id FROM "currencies" WHERE code = 'USD' LIMIT 1) WHERE "currency_id" IS NULL;--> statement-breakpoint
UPDATE "invoices" SET "currency_id" = (SELECT id FROM "currencies" WHERE code = 'USD' LIMIT 1) WHERE "currency_id" IS NULL;--> statement-breakpoint
UPDATE "payments" SET "currency_id" = (SELECT id FROM "currencies" WHERE code = 'USD' LIMIT 1) WHERE "currency_id" IS NULL;--> statement-breakpoint

-- Set defaults to USD and enforce NOT NULL now that data is backfilled
-- Set defaults to the USD id (resolved dynamically)
DO $$
DECLARE usd_id integer;
BEGIN
	SELECT id INTO usd_id FROM "currencies" WHERE code = 'USD' LIMIT 1;
	IF usd_id IS NULL THEN
		RAISE EXCEPTION 'USD currency not found during migration';
	END IF;
	EXECUTE format('ALTER TABLE "invoice_items" ALTER COLUMN "currency_id" SET DEFAULT %s;', usd_id);
	EXECUTE format('ALTER TABLE "invoices" ALTER COLUMN "currency_id" SET DEFAULT %s;', usd_id);
	EXECUTE format('ALTER TABLE "invoices" ALTER COLUMN "currency_id" SET NOT NULL;');
	EXECUTE format('ALTER TABLE "payments" ALTER COLUMN "currency_id" SET DEFAULT %s;', usd_id);
	EXECUTE format('ALTER TABLE "payments" ALTER COLUMN "currency_id" SET NOT NULL;');
	-- Optionally set practices.default_currency_id default
	EXECUTE format('ALTER TABLE "practices" ALTER COLUMN "default_currency_id" SET DEFAULT %s;', usd_id);
END$$;--> statement-breakpoint

-- Add foreign key constraints
ALTER TABLE "practices" ADD CONSTRAINT "practices_default_currency_id_currencies_id_fk" FOREIGN KEY ("default_currency_id") REFERENCES "public"."currencies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_currency_id_currencies_id_fk" FOREIGN KEY ("currency_id") REFERENCES "public"."currencies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_currency_id_currencies_id_fk" FOREIGN KEY ("currency_id") REFERENCES "public"."currencies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_currency_id_currencies_id_fk" FOREIGN KEY ("currency_id") REFERENCES "public"."currencies"("id") ON DELETE no action ON UPDATE no action;