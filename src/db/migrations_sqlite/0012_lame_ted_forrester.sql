PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_soap_notes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`appointment_id` text,
	`practitioner_id` text NOT NULL,
	`pet_id` text NOT NULL,
	`subjective` text,
	`objective` text,
	`assessment` text,
	`plan` text,
	`has_prescriptions` integer DEFAULT false,
	`has_attachments` integer DEFAULT false,
	`has_treatments` integer DEFAULT false,
	`locked` integer DEFAULT false,
	`lockedAt` integer,
	`updated_by_id` text,
	`createdAt` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	FOREIGN KEY (`appointment_id`) REFERENCES `appointments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`practitioner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`pet_id`) REFERENCES `pets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_soap_notes`("id", "appointment_id", "practitioner_id", "pet_id", "subjective", "objective", "assessment", "plan", "has_prescriptions", "has_attachments", "has_treatments", "locked", "lockedAt", "updated_by_id", "createdAt", "updatedAt") SELECT "id", "appointment_id", "practitioner_id", "pet_id", "subjective", "objective", "assessment", "plan", "has_prescriptions", "has_attachments", "has_treatments", "locked", "lockedAt", "updated_by_id", "createdAt", "updatedAt" FROM `soap_notes`;--> statement-breakpoint
DROP TABLE `soap_notes`;--> statement-breakpoint
ALTER TABLE `__new_soap_notes` RENAME TO `soap_notes`;--> statement-breakpoint
PRAGMA foreign_keys=ON;