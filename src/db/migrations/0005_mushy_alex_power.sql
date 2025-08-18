ALTER TABLE "whiteboard_items" ALTER COLUMN "status" SET DEFAULT 'triage';--> statement-breakpoint
ALTER TABLE "whiteboard_items" ADD COLUMN "appointment_id" integer;--> statement-breakpoint
ALTER TABLE "whiteboard_items" ADD COLUMN "position" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "whiteboard_items" ADD CONSTRAINT "whiteboard_items_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE set null ON UPDATE no action;