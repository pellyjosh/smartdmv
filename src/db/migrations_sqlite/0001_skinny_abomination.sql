CREATE TABLE `soap_notes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`appointment_id` integer NOT NULL,
	`practitioner_id` integer NOT NULL,
	`pet_id` integer NOT NULL,
	`subjective` text,
	`objective` text,
	`assessment` text,
	`plan` text,
	`has_prescriptions` integer DEFAULT false,
	`has_attachments` integer DEFAULT false,
	`has_treatments` integer DEFAULT false,
	`locked` integer DEFAULT false,
	`lockedAt` integer,
	`updated_by_id` integer,
	`createdAt` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `soap_templates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`category` text,
	`species_applicability` text,
	`subjective_template` text,
	`objective_template` text,
	`assessment_template` text,
	`plan_template` text,
	`is_default` integer DEFAULT false,
	`practice_id` integer NOT NULL,
	`created_by_id` integer NOT NULL,
	`createdAt` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `treatments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`soap_note_id` integer,
	`pet_id` integer NOT NULL,
	`practitioner_id` integer NOT NULL,
	`practice_id` integer NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`description` text,
	`inventory_item_id` integer,
	`dosage` text,
	`route` text,
	`frequency` text,
	`duration` text,
	`instructions` text,
	`procedure_code` text,
	`location` text,
	`technician` integer,
	`status` text DEFAULT 'planned' NOT NULL,
	`startDate` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`endDate` integer,
	`outcome` text,
	`follow_up_needed` integer DEFAULT false,
	`followUpDate` integer,
	`follow_up_notes` text,
	`cost` text,
	`billed` integer DEFAULT false,
	`notes` text,
	`createdAt` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	FOREIGN KEY (`soap_note_id`) REFERENCES `soap_notes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`pet_id`) REFERENCES `pets`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`practitioner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`inventory_item_id`) REFERENCES `inventory`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`technician`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `whiteboard_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`pet_id` text NOT NULL,
	`practice_id` text NOT NULL,
	`notes` text,
	`urgency` text DEFAULT 'none',
	`status` text DEFAULT 'active' NOT NULL,
	`assigned_to_id` text,
	`location` text,
	`createdAt` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	FOREIGN KEY (`pet_id`) REFERENCES `pets`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`practice_id`) REFERENCES `practices`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`assigned_to_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `inventory` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`practice_id` integer NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`description` text,
	`sku` text,
	`quantity` integer DEFAULT 0 NOT NULL,
	`unit` text,
	`min_quantity` integer,
	`lastRestockDate` integer,
	`expiryDate` integer,
	`cost` text,
	`price` text,
	`location` text,
	`supplier` text,
	`batch_tracking` integer DEFAULT false,
	`dea_schedule` text DEFAULT 'none',
	`requires_special_auth` integer DEFAULT false,
	`createdAt` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL
);
