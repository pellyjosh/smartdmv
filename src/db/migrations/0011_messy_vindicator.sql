ALTER TABLE "health_plan_milestones" RENAME COLUMN "due_date" TO "dueDate";--> statement-breakpoint
ALTER TABLE "health_plan_milestones" RENAME COLUMN "completed_on" TO "completedOn";--> statement-breakpoint
ALTER TABLE "health_plan_milestones" RENAME COLUMN "created_at" TO "createdAt";--> statement-breakpoint
ALTER TABLE "health_plan_milestones" RENAME COLUMN "updated_at" TO "updatedAt";--> statement-breakpoint
ALTER TABLE "health_plan_milestones" ALTER COLUMN "title" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "health_plan_milestones" ALTER COLUMN "completed" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "health_plan_milestones" ADD CONSTRAINT "health_plan_milestones_health_plan_id_health_plans_id_fk" FOREIGN KEY ("health_plan_id") REFERENCES "public"."health_plans"("id") ON DELETE cascade ON UPDATE no action;