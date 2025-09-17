CREATE TABLE "health_plan_notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"health_plan_id" integer NOT NULL,
	"note" text NOT NULL,
	"created_by_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "health_plan_notes" ADD CONSTRAINT "health_plan_notes_health_plan_id_health_plans_id_fk" FOREIGN KEY ("health_plan_id") REFERENCES "public"."health_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_plan_notes" ADD CONSTRAINT "health_plan_notes_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;