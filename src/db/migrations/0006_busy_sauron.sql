CREATE TABLE "approval_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"approval_instance_id" integer NOT NULL,
	"action" text NOT NULL,
	"performed_by_id" integer,
	"previous_status" text,
	"new_status" text,
	"comments" text,
	"metadata" text,
	"ip_address" text,
	"user_agent" text,
	"timestamp" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "approval_instances" (
	"id" serial PRIMARY KEY NOT NULL,
	"practice_id" integer NOT NULL,
	"workflow_id" integer NOT NULL,
	"requested_by_id" integer NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" integer NOT NULL,
	"entity_data" text,
	"current_step" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"priority" text DEFAULT 'normal' NOT NULL,
	"reason" text,
	"notes" text,
	"due_date" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "approval_notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"practice_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"workflow_type" text,
	"notification_method" text NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"frequency" text DEFAULT 'immediate' NOT NULL,
	"conditions" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "approval_step_instances" (
	"id" serial PRIMARY KEY NOT NULL,
	"approval_instance_id" integer NOT NULL,
	"workflow_step_id" integer NOT NULL,
	"step_order" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"approved_by_id" integer,
	"approved_at" timestamp,
	"rejection_reason" text,
	"notes" text,
	"is_auto_approved" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "approval_workflow_steps" (
	"id" serial PRIMARY KEY NOT NULL,
	"workflow_id" integer NOT NULL,
	"step_order" integer NOT NULL,
	"step_name" text NOT NULL,
	"approver_type" text NOT NULL,
	"approver_ids" text,
	"requires_all" boolean DEFAULT false NOT NULL,
	"auto_approve_conditions" text,
	"is_optional" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "approval_workflows" (
	"id" serial PRIMARY KEY NOT NULL,
	"practice_id" integer NOT NULL,
	"name" text NOT NULL,
	"workflow_type" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"auto_approve" boolean DEFAULT false NOT NULL,
	"approval_levels" integer DEFAULT 1 NOT NULL,
	"workflow_config" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "manager_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"practice_id" integer NOT NULL,
	"manager_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"assignment_type" text NOT NULL,
	"can_approve_time_off" boolean DEFAULT true NOT NULL,
	"can_approve_hours" boolean DEFAULT true NOT NULL,
	"can_approve_payroll" boolean DEFAULT false NOT NULL,
	"can_approve_rates" boolean DEFAULT false NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "approval_history" ADD CONSTRAINT "approval_history_approval_instance_id_approval_instances_id_fk" FOREIGN KEY ("approval_instance_id") REFERENCES "public"."approval_instances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_history" ADD CONSTRAINT "approval_history_performed_by_id_users_id_fk" FOREIGN KEY ("performed_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_instances" ADD CONSTRAINT "approval_instances_practice_id_practices_id_fk" FOREIGN KEY ("practice_id") REFERENCES "public"."practices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_instances" ADD CONSTRAINT "approval_instances_workflow_id_approval_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."approval_workflows"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_instances" ADD CONSTRAINT "approval_instances_requested_by_id_users_id_fk" FOREIGN KEY ("requested_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_notifications" ADD CONSTRAINT "approval_notifications_practice_id_practices_id_fk" FOREIGN KEY ("practice_id") REFERENCES "public"."practices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_notifications" ADD CONSTRAINT "approval_notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_step_instances" ADD CONSTRAINT "approval_step_instances_approval_instance_id_approval_instances_id_fk" FOREIGN KEY ("approval_instance_id") REFERENCES "public"."approval_instances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_step_instances" ADD CONSTRAINT "approval_step_instances_workflow_step_id_approval_workflow_steps_id_fk" FOREIGN KEY ("workflow_step_id") REFERENCES "public"."approval_workflow_steps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_step_instances" ADD CONSTRAINT "approval_step_instances_approved_by_id_users_id_fk" FOREIGN KEY ("approved_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_workflow_steps" ADD CONSTRAINT "approval_workflow_steps_workflow_id_approval_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."approval_workflows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_workflows" ADD CONSTRAINT "approval_workflows_practice_id_practices_id_fk" FOREIGN KEY ("practice_id") REFERENCES "public"."practices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manager_assignments" ADD CONSTRAINT "manager_assignments_practice_id_practices_id_fk" FOREIGN KEY ("practice_id") REFERENCES "public"."practices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manager_assignments" ADD CONSTRAINT "manager_assignments_manager_id_users_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manager_assignments" ADD CONSTRAINT "manager_assignments_employee_id_users_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;