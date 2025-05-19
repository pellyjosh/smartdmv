
-- pratiques Table
CREATE TABLE `practices` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP
);

-- users Table
CREATE TABLE `users` (
  `id` text PRIMARY KEY NOT NULL,
  `email` text NOT NULL,
  `name` text,
  `password_hash` text NOT NULL,
  `role` text CHECK (`role` IN ('CLIENT', 'PRACTICE_ADMINISTRATOR', 'ADMINISTRATOR')) NOT NULL,
  `practice_id` text,
  `current_practice_id` text,
  `created_at` text DEFAULT CURRENT_TIMESTAMP,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`practice_id`) REFERENCES `practices`(`id`) ON UPDATE no action ON DELETE set null,
  FOREIGN KEY (`current_practice_id`) REFERENCES `practices`(`id`) ON UPDATE no action ON DELETE set null
);
CREATE UNIQUE INDEX `users_email_unique_idx` ON `users` (`email`);

-- administrator_accessible_practices Table
CREATE TABLE `administrator_accessible_practices` (
  `administrator_id` text NOT NULL,
  `practice_id` text NOT NULL,
  `assigned_at` text DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`administrator_id`, `practice_id`),
  FOREIGN KEY (`administrator_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`practice_id`) REFERENCES `practices`(`id`) ON UPDATE no action ON DELETE cascade
);

-- sessions Table
CREATE TABLE `sessions` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `expires_at` integer NOT NULL, -- Storing as Unix timestamp (milliseconds)
  `data` text,
  `created_at` text DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);

