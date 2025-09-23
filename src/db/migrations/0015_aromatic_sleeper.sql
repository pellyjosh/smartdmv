CREATE TABLE "invoice_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"invoice_id" integer NOT NULL,
	"treatment_id" integer,
	"description" text NOT NULL,
	"quantity" numeric DEFAULT '1' NOT NULL,
	"unit_price" numeric NOT NULL,
	"subtotal" numeric NOT NULL,
	"discount_amount" numeric DEFAULT '0.00' NOT NULL,
	"taxable" text DEFAULT 'yes' NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"practice_id" integer NOT NULL,
	"client_id" integer NOT NULL,
	"pet_id" integer,
	"appointment_id" integer,
	"invoice_number" text NOT NULL,
	"description" text,
	"subtotal" numeric NOT NULL,
	"tax_amount" numeric DEFAULT '0.00' NOT NULL,
	"discount_amount" numeric DEFAULT '0.00' NOT NULL,
	"total_amount" numeric NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"issue_date" timestamp NOT NULL,
	"due_date" timestamp NOT NULL,
	"paid_date" timestamp,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "invoices_invoice_number_unique" UNIQUE("invoice_number")
);
--> statement-breakpoint
CREATE TABLE "payment_methods" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"type" text NOT NULL,
	"last_four_digits" text NOT NULL,
	"expiry_month" text,
	"expiry_year" text,
	"card_brand" text,
	"billing_name" text,
	"billing_address" text,
	"billing_city" text,
	"billing_state" text,
	"billing_zip" text,
	"billing_country" text DEFAULT 'US',
	"is_default" text DEFAULT 'no' NOT NULL,
	"is_active" text DEFAULT 'yes' NOT NULL,
	"stripe_customer_id" text,
	"stripe_payment_method_id" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"practice_id" integer NOT NULL,
	"invoice_id" integer NOT NULL,
	"client_id" integer NOT NULL,
	"payment_number" text NOT NULL,
	"amount" numeric NOT NULL,
	"payment_method" text NOT NULL,
	"transaction_id" text,
	"processor_response" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"payment_date" timestamp NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "payments_payment_number_unique" UNIQUE("payment_number")
);
--> statement-breakpoint
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_treatment_id_treatments_id_fk" FOREIGN KEY ("treatment_id") REFERENCES "public"."treatments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_practice_id_practices_id_fk" FOREIGN KEY ("practice_id") REFERENCES "public"."practices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_pet_id_pets_id_fk" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_practice_id_practices_id_fk" FOREIGN KEY ("practice_id") REFERENCES "public"."practices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;