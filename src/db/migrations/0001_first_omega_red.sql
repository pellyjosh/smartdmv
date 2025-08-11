ALTER TABLE "boarding_activities" ALTER COLUMN "stay_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "boarding_activities" ALTER COLUMN "performed_by_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "boarding_activities" ALTER COLUMN "practice_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "boarding_requirements" ALTER COLUMN "stay_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "boarding_requirements" ALTER COLUMN "completed_by_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "boarding_requirements" ALTER COLUMN "practice_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "boarding_stays" ALTER COLUMN "pet_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "boarding_stays" ALTER COLUMN "kennel_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "boarding_stays" ALTER COLUMN "practice_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "boarding_stays" ALTER COLUMN "created_by_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "feeding_schedules" ALTER COLUMN "stay_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "feeding_schedules" ALTER COLUMN "practice_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "kennels" ALTER COLUMN "practice_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "medication_schedules" ALTER COLUMN "stay_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "medication_schedules" ALTER COLUMN "practice_id" SET DATA TYPE integer;