CREATE TABLE "pay_periods" (
	"id" serial PRIMARY KEY NOT NULL,
	"practice_id" integer NOT NULL,
	"name" text NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"pay_date" timestamp NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pay_rates" (
	"id" serial PRIMARY KEY NOT NULL,
	"practice_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"rate_type" text NOT NULL,
	"rate" numeric(12, 2) NOT NULL,
	"effective_date" timestamp NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "work_hours" (
	"id" serial PRIMARY KEY NOT NULL,
	"practice_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"date" timestamp NOT NULL,
	"hours_worked" numeric(6, 2) NOT NULL,
	"pay_rate_id" integer,
	"description" text,
	"is_approved" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "payroll" ADD COLUMN "pay_period_id" integer;--> statement-breakpoint
ALTER TABLE "pay_periods" ADD CONSTRAINT "pay_periods_practice_id_practices_id_fk" FOREIGN KEY ("practice_id") REFERENCES "public"."practices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pay_rates" ADD CONSTRAINT "pay_rates_practice_id_practices_id_fk" FOREIGN KEY ("practice_id") REFERENCES "public"."practices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pay_rates" ADD CONSTRAINT "pay_rates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_hours" ADD CONSTRAINT "work_hours_practice_id_practices_id_fk" FOREIGN KEY ("practice_id") REFERENCES "public"."practices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_hours" ADD CONSTRAINT "work_hours_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_hours" ADD CONSTRAINT "work_hours_pay_rate_id_pay_rates_id_fk" FOREIGN KEY ("pay_rate_id") REFERENCES "public"."pay_rates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll" ADD CONSTRAINT "payroll_pay_period_id_pay_periods_id_fk" FOREIGN KEY ("pay_period_id") REFERENCES "public"."pay_periods"("id") ON DELETE no action ON UPDATE no action;