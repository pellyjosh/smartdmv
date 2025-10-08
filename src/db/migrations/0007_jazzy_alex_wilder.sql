CREATE TABLE "payroll_analytics" (
	"id" serial PRIMARY KEY NOT NULL,
	"practice_id" integer NOT NULL,
	"metric_type" text NOT NULL,
	"period" text NOT NULL,
	"date" text NOT NULL,
	"value" numeric(15, 2) NOT NULL,
	"metadata" text,
	"created_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "payroll_compliance" (
	"id" serial PRIMARY KEY NOT NULL,
	"practice_id" integer NOT NULL,
	"compliance_type" text NOT NULL,
	"status" text DEFAULT 'compliant' NOT NULL,
	"description" text NOT NULL,
	"severity" text DEFAULT 'low' NOT NULL,
	"due_date" text,
	"resolved_at" timestamp,
	"metadata" text,
	"created_by" integer NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "payroll_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"practice_id" integer NOT NULL,
	"report_type" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"date_range" text NOT NULL,
	"filters" text,
	"report_data" text,
	"generated_by" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"export_format" text,
	"file_path" text,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "payroll_analytics" ADD CONSTRAINT "payroll_analytics_practice_id_practices_id_fk" FOREIGN KEY ("practice_id") REFERENCES "public"."practices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_compliance" ADD CONSTRAINT "payroll_compliance_practice_id_practices_id_fk" FOREIGN KEY ("practice_id") REFERENCES "public"."practices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_compliance" ADD CONSTRAINT "payroll_compliance_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_reports" ADD CONSTRAINT "payroll_reports_practice_id_practices_id_fk" FOREIGN KEY ("practice_id") REFERENCES "public"."practices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_reports" ADD CONSTRAINT "payroll_reports_generated_by_users_id_fk" FOREIGN KEY ("generated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;