PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_administrator_accessible_practices` (
	`administrator_id` text NOT NULL,
	`practice_id` text NOT NULL,
	`assignedAt` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	`createdAt` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	PRIMARY KEY(`administrator_id`, `practice_id`),
	FOREIGN KEY (`administrator_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`practice_id`) REFERENCES `practices`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_administrator_accessible_practices`("administrator_id", "practice_id", "assignedAt", "createdAt", "updatedAt") SELECT "administrator_id", "practice_id", "assignedAt", "createdAt", "updatedAt" FROM `administrator_accessible_practices`;--> statement-breakpoint
DROP TABLE `administrator_accessible_practices`;--> statement-breakpoint
ALTER TABLE `__new_administrator_accessible_practices` RENAME TO `administrator_accessible_practices`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text,
	`password` text NOT NULL,
	`role` text NOT NULL,
	`practice_id` text,
	`current_practice_id` text,
	`createdAt` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	FOREIGN KEY (`practice_id`) REFERENCES `practices`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`current_practice_id`) REFERENCES `practices`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_users`("id", "email", "name", "password", "role", "practice_id", "current_practice_id", "createdAt", "updatedAt") SELECT "id", "email", "name", "password", "role", "practice_id", "current_practice_id", "createdAt", "updatedAt" FROM `users`;--> statement-breakpoint
DROP TABLE `users`;--> statement-breakpoint
ALTER TABLE `__new_users` RENAME TO `users`;--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);