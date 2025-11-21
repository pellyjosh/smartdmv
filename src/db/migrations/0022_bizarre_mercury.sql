ALTER TABLE "soap_notes" ADD COLUMN "chief_complaint" json DEFAULT '[]'::json;--> statement-breakpoint
ALTER TABLE "soap_notes" ADD COLUMN "patient_history" text;--> statement-breakpoint
ALTER TABLE "soap_notes" ADD COLUMN "symptoms" text;--> statement-breakpoint
ALTER TABLE "soap_notes" ADD COLUMN "duration" text;--> statement-breakpoint
ALTER TABLE "soap_notes" ADD COLUMN "temperature" text;--> statement-breakpoint
ALTER TABLE "soap_notes" ADD COLUMN "heart_rate" text;--> statement-breakpoint
ALTER TABLE "soap_notes" ADD COLUMN "respiratory_rate" text;--> statement-breakpoint
ALTER TABLE "soap_notes" ADD COLUMN "weight" text;--> statement-breakpoint
ALTER TABLE "soap_notes" ADD COLUMN "blood_pressure" text;--> statement-breakpoint
ALTER TABLE "soap_notes" ADD COLUMN "oxygen_saturation" text;--> statement-breakpoint
ALTER TABLE "soap_notes" ADD COLUMN "general_appearance" text;--> statement-breakpoint
ALTER TABLE "soap_notes" ADD COLUMN "hydration" text;--> statement-breakpoint
ALTER TABLE "soap_notes" ADD COLUMN "heart_sounds" text;--> statement-breakpoint
ALTER TABLE "soap_notes" ADD COLUMN "cardiovascular_notes" text;--> statement-breakpoint
ALTER TABLE "soap_notes" ADD COLUMN "lung_sounds" text;--> statement-breakpoint
ALTER TABLE "soap_notes" ADD COLUMN "respiratory_effort" text;--> statement-breakpoint
ALTER TABLE "soap_notes" ADD COLUMN "respiratory_notes" text;--> statement-breakpoint
ALTER TABLE "soap_notes" ADD COLUMN "abdomen_palpation" text;--> statement-breakpoint
ALTER TABLE "soap_notes" ADD COLUMN "bowel_sounds" text;--> statement-breakpoint
ALTER TABLE "soap_notes" ADD COLUMN "gastrointestinal_notes" text;--> statement-breakpoint
ALTER TABLE "soap_notes" ADD COLUMN "gait" text;--> statement-breakpoint
ALTER TABLE "soap_notes" ADD COLUMN "joint_status" text;--> statement-breakpoint
ALTER TABLE "soap_notes" ADD COLUMN "musculoskeletal_notes" text;--> statement-breakpoint
ALTER TABLE "soap_notes" ADD COLUMN "mental_status" text;--> statement-breakpoint
ALTER TABLE "soap_notes" ADD COLUMN "reflexes" text;--> statement-breakpoint
ALTER TABLE "soap_notes" ADD COLUMN "neurological_notes" text;--> statement-breakpoint
ALTER TABLE "soap_notes" ADD COLUMN "skin_condition" text;--> statement-breakpoint
ALTER TABLE "soap_notes" ADD COLUMN "coat_condition" text;--> statement-breakpoint
ALTER TABLE "soap_notes" ADD COLUMN "skin_notes" text;--> statement-breakpoint
ALTER TABLE "soap_notes" ADD COLUMN "primary_diagnosis" json DEFAULT '[]'::json;--> statement-breakpoint
ALTER TABLE "soap_notes" ADD COLUMN "differential_diagnoses" json DEFAULT '[]'::json;--> statement-breakpoint
ALTER TABLE "soap_notes" ADD COLUMN "progress_status" text;--> statement-breakpoint
ALTER TABLE "soap_notes" ADD COLUMN "confirmation_status" text;--> statement-breakpoint
ALTER TABLE "soap_notes" ADD COLUMN "progress_notes" text;--> statement-breakpoint
ALTER TABLE "soap_notes" ADD COLUMN "treatment" text;--> statement-breakpoint
ALTER TABLE "soap_notes" ADD COLUMN "medications" json DEFAULT '[]'::json;--> statement-breakpoint
ALTER TABLE "soap_notes" ADD COLUMN "procedures" json DEFAULT '[]'::json;--> statement-breakpoint
ALTER TABLE "soap_notes" ADD COLUMN "procedure_notes" text;--> statement-breakpoint
ALTER TABLE "soap_notes" ADD COLUMN "diagnostics" json DEFAULT '[]'::json;--> statement-breakpoint
ALTER TABLE "soap_notes" ADD COLUMN "client_education" text;--> statement-breakpoint
ALTER TABLE "soap_notes" ADD COLUMN "follow_up_timeframe" text;--> statement-breakpoint
ALTER TABLE "soap_notes" ADD COLUMN "follow_up_reason" text;