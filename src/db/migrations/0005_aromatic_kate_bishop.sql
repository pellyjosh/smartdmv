CREATE TABLE "deduction_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"practice_id" integer NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"category" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"calculation_type" text NOT NULL,
	"is_employer_contribution" boolean DEFAULT false NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employee_deductions" (
	"id" serial PRIMARY KEY NOT NULL,
	"practice_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"deduction_type_id" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"amount" numeric(12, 2),
	"percentage" numeric(5, 2),
	"max_amount" numeric(12, 2),
	"start_date" timestamp NOT NULL,
	"end_date" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pay_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"practice_id" integer NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"multiplier" numeric(4, 2) DEFAULT '1.00' NOT NULL,
	"is_taxable" boolean DEFAULT true NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payroll_deductions" (
	"id" serial PRIMARY KEY NOT NULL,
	"payroll_id" integer NOT NULL,
	"deduction_type_id" integer NOT NULL,
	"employee_deduction_id" integer,
	"description" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"is_employer_paid" boolean DEFAULT false NOT NULL,
	"calculation_details" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payroll_tax_rates" (
	"id" serial PRIMARY KEY NOT NULL,
	"practice_id" integer NOT NULL,
	"name" text NOT NULL,
	"jurisdiction" text NOT NULL,
	"tax_type" text NOT NULL,
	"effective_year" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"tax_brackets" text NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "work_hours_enhanced" (
	"id" serial PRIMARY KEY NOT NULL,
	"work_hours_id" integer NOT NULL,
	"pay_category_id" integer NOT NULL,
	"hours" numeric(6, 2) NOT NULL,
	"rate" numeric(12, 2) NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tax_rates" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "tax_rates" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "deduction_types" ADD CONSTRAINT "deduction_types_practice_id_practices_id_fk" FOREIGN KEY ("practice_id") REFERENCES "public"."practices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_deductions" ADD CONSTRAINT "employee_deductions_practice_id_practices_id_fk" FOREIGN KEY ("practice_id") REFERENCES "public"."practices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_deductions" ADD CONSTRAINT "employee_deductions_employee_id_users_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_deductions" ADD CONSTRAINT "employee_deductions_deduction_type_id_deduction_types_id_fk" FOREIGN KEY ("deduction_type_id") REFERENCES "public"."deduction_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pay_categories" ADD CONSTRAINT "pay_categories_practice_id_practices_id_fk" FOREIGN KEY ("practice_id") REFERENCES "public"."practices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_deductions" ADD CONSTRAINT "payroll_deductions_payroll_id_payroll_id_fk" FOREIGN KEY ("payroll_id") REFERENCES "public"."payroll"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_deductions" ADD CONSTRAINT "payroll_deductions_deduction_type_id_deduction_types_id_fk" FOREIGN KEY ("deduction_type_id") REFERENCES "public"."deduction_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_deductions" ADD CONSTRAINT "payroll_deductions_employee_deduction_id_employee_deductions_id_fk" FOREIGN KEY ("employee_deduction_id") REFERENCES "public"."employee_deductions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_tax_rates" ADD CONSTRAINT "payroll_tax_rates_practice_id_practices_id_fk" FOREIGN KEY ("practice_id") REFERENCES "public"."practices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_hours_enhanced" ADD CONSTRAINT "work_hours_enhanced_work_hours_id_work_hours_id_fk" FOREIGN KEY ("work_hours_id") REFERENCES "public"."work_hours"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_hours_enhanced" ADD CONSTRAINT "work_hours_enhanced_pay_category_id_pay_categories_id_fk" FOREIGN KEY ("pay_category_id") REFERENCES "public"."pay_categories"("id") ON DELETE no action ON UPDATE no action;