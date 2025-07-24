CREATE TABLE `boarding_activities` (
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
CREATE TABLE `boarding_requirements` (
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
CREATE TABLE `boarding_stays` (
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
CREATE TABLE `feeding_schedules` (
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
CREATE TABLE `kennels` (
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
CREATE TABLE `medication_schedules` (
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
