PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_boarding_activities` (
	`id` text PRIMARY KEY NOT NULL,
	`stay_id` text NOT NULL,
	`activity_type` text NOT NULL,
	`activityDate` integer NOT NULL,
	`performed_by_id` text NOT NULL,
	`notes` text,
	`success` integer DEFAULT true,
	`practice_id` text NOT NULL,
	`createdAt` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_boarding_activities`("id", "stay_id", "activity_type", "activityDate", "performed_by_id", "notes", "success", "practice_id", "createdAt") SELECT "id", "stay_id", "activity_type", "activityDate", "performed_by_id", "notes", "success", "practice_id", "createdAt" FROM `boarding_activities`;--> statement-breakpoint
DROP TABLE `boarding_activities`;--> statement-breakpoint
ALTER TABLE `__new_boarding_activities` RENAME TO `boarding_activities`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_boarding_requirements` (
	`id` text PRIMARY KEY NOT NULL,
	`stay_id` text NOT NULL,
	`requirement_type` text NOT NULL,
	`requirement_description` text NOT NULL,
	`is_mandatory` integer DEFAULT true,
	`is_completed` integer DEFAULT false,
	`completedDate` integer,
	`completed_by_id` text,
	`notes` text,
	`practice_id` text NOT NULL,
	`createdAt` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_boarding_requirements`("id", "stay_id", "requirement_type", "requirement_description", "is_mandatory", "is_completed", "completedDate", "completed_by_id", "notes", "practice_id", "createdAt", "updatedAt") SELECT "id", "stay_id", "requirement_type", "requirement_description", "is_mandatory", "is_completed", "completedDate", "completed_by_id", "notes", "practice_id", "createdAt", "updatedAt" FROM `boarding_requirements`;--> statement-breakpoint
DROP TABLE `boarding_requirements`;--> statement-breakpoint
ALTER TABLE `__new_boarding_requirements` RENAME TO `boarding_requirements`;--> statement-breakpoint
CREATE TABLE `__new_boarding_stays` (
	`id` text PRIMARY KEY NOT NULL,
	`pet_id` text NOT NULL,
	`kennel_id` text NOT NULL,
	`checkInDate` integer NOT NULL,
	`plannedCheckOutDate` integer NOT NULL,
	`actualCheckOutDate` integer,
	`status` text NOT NULL,
	`special_instructions` text,
	`emergency_contact_name` text,
	`emergency_contact_phone` text,
	`reservation_notes` text,
	`belongings_description` text,
	`daily_rate` text,
	`practice_id` text NOT NULL,
	`created_by_id` text NOT NULL,
	`createdAt` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_boarding_stays`("id", "pet_id", "kennel_id", "checkInDate", "plannedCheckOutDate", "actualCheckOutDate", "status", "special_instructions", "emergency_contact_name", "emergency_contact_phone", "reservation_notes", "belongings_description", "daily_rate", "practice_id", "created_by_id", "createdAt", "updatedAt") SELECT "id", "pet_id", "kennel_id", "checkInDate", "plannedCheckOutDate", "actualCheckOutDate", "status", "special_instructions", "emergency_contact_name", "emergency_contact_phone", "reservation_notes", "belongings_description", "daily_rate", "practice_id", "created_by_id", "createdAt", "updatedAt" FROM `boarding_stays`;--> statement-breakpoint
DROP TABLE `boarding_stays`;--> statement-breakpoint
ALTER TABLE `__new_boarding_stays` RENAME TO `boarding_stays`;--> statement-breakpoint
CREATE TABLE `__new_feeding_schedules` (
	`id` text PRIMARY KEY NOT NULL,
	`stay_id` text NOT NULL,
	`feeding_type` text NOT NULL,
	`food_description` text,
	`frequency` text NOT NULL,
	`amount` text NOT NULL,
	`special_instructions` text,
	`practice_id` text NOT NULL,
	`createdAt` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_feeding_schedules`("id", "stay_id", "feeding_type", "food_description", "frequency", "amount", "special_instructions", "practice_id", "createdAt", "updatedAt") SELECT "id", "stay_id", "feeding_type", "food_description", "frequency", "amount", "special_instructions", "practice_id", "createdAt", "updatedAt" FROM `feeding_schedules`;--> statement-breakpoint
DROP TABLE `feeding_schedules`;--> statement-breakpoint
ALTER TABLE `__new_feeding_schedules` RENAME TO `feeding_schedules`;--> statement-breakpoint
CREATE TABLE `__new_kennels` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`size` text NOT NULL,
	`location` text,
	`description` text,
	`is_active` integer DEFAULT true,
	`practice_id` text NOT NULL,
	`createdAt` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_kennels`("id", "name", "type", "size", "location", "description", "is_active", "practice_id", "createdAt", "updatedAt") SELECT "id", "name", "type", "size", "location", "description", "is_active", "practice_id", "createdAt", "updatedAt" FROM `kennels`;--> statement-breakpoint
DROP TABLE `kennels`;--> statement-breakpoint
ALTER TABLE `__new_kennels` RENAME TO `kennels`;--> statement-breakpoint
CREATE TABLE `__new_medication_schedules` (
	`id` text PRIMARY KEY NOT NULL,
	`stay_id` text NOT NULL,
	`medication_name` text NOT NULL,
	`dosage` text NOT NULL,
	`frequency` text NOT NULL,
	`route` text NOT NULL,
	`startDate` integer NOT NULL,
	`endDate` integer,
	`special_instructions` text,
	`lastAdministered` integer,
	`practice_id` text NOT NULL,
	`createdAt` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_medication_schedules`("id", "stay_id", "medication_name", "dosage", "frequency", "route", "startDate", "endDate", "special_instructions", "lastAdministered", "practice_id", "createdAt", "updatedAt") SELECT "id", "stay_id", "medication_name", "dosage", "frequency", "route", "startDate", "endDate", "special_instructions", "lastAdministered", "practice_id", "createdAt", "updatedAt" FROM `medication_schedules`;--> statement-breakpoint
DROP TABLE `medication_schedules`;--> statement-breakpoint
ALTER TABLE `__new_medication_schedules` RENAME TO `medication_schedules`;