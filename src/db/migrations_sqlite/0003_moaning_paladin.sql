CREATE TABLE `referral_attachments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`referral_id` text NOT NULL,
	`file_name` text NOT NULL,
	`file_type` text NOT NULL,
	`file_size` integer NOT NULL,
	`file_path` text NOT NULL,
	`uploaded_by_id` text NOT NULL,
	`description` text,
	`createdAt` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	FOREIGN KEY (`referral_id`) REFERENCES `referrals`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`uploaded_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `referral_notes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`referral_id` text NOT NULL,
	`author_id` text NOT NULL,
	`note_content` text NOT NULL,
	`is_private` integer DEFAULT false,
	`createdAt` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	FOREIGN KEY (`referral_id`) REFERENCES `referrals`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `referrals` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`pet_id` text NOT NULL,
	`referring_practice_id` text NOT NULL,
	`referring_vet_id` text NOT NULL,
	`specialist_id` text,
	`specialist_practice_id` text,
	`referral_reason` text NOT NULL,
	`specialty` text NOT NULL,
	`clinical_history` text,
	`current_medications` text,
	`diagnostic_tests` text,
	`referral_notes` text,
	`priority` text DEFAULT 'routine' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`scheduled_date` text,
	`completed_date` text,
	`attachments` integer DEFAULT false,
	`create_appointment` integer DEFAULT false,
	`createdAt` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	FOREIGN KEY (`pet_id`) REFERENCES `pets`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`referring_practice_id`) REFERENCES `practices`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`referring_vet_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`specialist_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`specialist_practice_id`) REFERENCES `practices`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_inventory` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`practice_id` text NOT NULL,
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
--> statement-breakpoint
INSERT INTO `__new_inventory`("id", "practice_id", "name", "type", "description", "sku", "quantity", "unit", "min_quantity", "lastRestockDate", "expiryDate", "cost", "price", "location", "supplier", "batch_tracking", "dea_schedule", "requires_special_auth", "createdAt", "updatedAt") SELECT "id", "practice_id", "name", "type", "description", "sku", "quantity", "unit", "min_quantity", "lastRestockDate", "expiryDate", "cost", "price", "location", "supplier", "batch_tracking", "dea_schedule", "requires_special_auth", "createdAt", "updatedAt" FROM `inventory`;--> statement-breakpoint
DROP TABLE `inventory`;--> statement-breakpoint
ALTER TABLE `__new_inventory` RENAME TO `inventory`;--> statement-breakpoint
PRAGMA foreign_keys=ON;