CREATE TABLE `ai_configs` (
	`id` text PRIMARY KEY NOT NULL,
	`practice_id` text NOT NULL,
	`gemini_api_key` text,
	`is_enabled` integer DEFAULT false NOT NULL,
	`configured_by` text NOT NULL,
	`max_tokens` text,
	`temperature` text,
	`createdAt` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	FOREIGN KEY (`practice_id`) REFERENCES `practices`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`configured_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
