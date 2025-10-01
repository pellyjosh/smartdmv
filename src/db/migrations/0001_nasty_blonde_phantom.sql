CREATE TABLE "service_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"practice_id" integer NOT NULL,
	"code" text NOT NULL,
	"description" text NOT NULL,
	"category" text NOT NULL,
	"default_price" numeric DEFAULT '0.00' NOT NULL,
	"taxable" text DEFAULT 'yes' NOT NULL,
	"tax_rate_id" integer,
	"active" text DEFAULT 'yes' NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "service_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "service_codes" ADD CONSTRAINT "service_codes_practice_id_practices_id_fk" FOREIGN KEY ("practice_id") REFERENCES "public"."practices"("id") ON DELETE no action ON UPDATE no action;