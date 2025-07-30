PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_treatments` (
	`id` text PRIMARY KEY NOT NULL,
	`soap_note_id` integer,
	`pet_id` text NOT NULL,
	`practitioner_id` text NOT NULL,
	`practice_id` text NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`description` text,
	`inventory_item_id` text,
	`dosage` text,
	`route` text,
	`frequency` text,
	`duration` text,
	`instructions` text,
	`procedure_code` text,
	`location` text,
	`technician` text,
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
INSERT INTO `__new_treatments`("id", "soap_note_id", "pet_id", "practitioner_id", "practice_id", "name", "category", "description", "inventory_item_id", "dosage", "route", "frequency", "duration", "instructions", "procedure_code", "location", "technician", "status", "startDate", "endDate", "outcome", "follow_up_needed", "followUpDate", "follow_up_notes", "cost", "billed", "notes", "createdAt", "updatedAt") SELECT "id", "soap_note_id", "pet_id", "practitioner_id", "practice_id", "name", "category", "description", "inventory_item_id", "dosage", "route", "frequency", "duration", "instructions", "procedure_code", "location", "technician", "status", "startDate", "endDate", "outcome", "follow_up_needed", "followUpDate", "follow_up_notes", "cost", "billed", "notes", "createdAt", "updatedAt" FROM `treatments`;--> statement-breakpoint
DROP TABLE `treatments`;--> statement-breakpoint
ALTER TABLE `__new_treatments` RENAME TO `treatments`;--> statement-breakpoint
PRAGMA foreign_keys=ON;