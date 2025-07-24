CREATE TABLE `addon_reviews` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`addon_id` text NOT NULL,
	`practice_id` text NOT NULL,
	`user_id` text NOT NULL,
	`rating` integer NOT NULL,
	`title` text,
	`comment` text,
	`is_verified_purchase` integer DEFAULT false,
	`is_published` integer DEFAULT true,
	`createdAt` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	`deletedAt` integer,
	FOREIGN KEY (`addon_id`) REFERENCES `addons`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`practice_id`) REFERENCES `practices`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `addons` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text NOT NULL,
	`short_description` text,
	`category` text NOT NULL,
	`icon` text,
	`cover_image` text,
	`gallery_images` text,
	`features` text,
	`pricing_tiers` text,
	`price` text,
	`is_popular` integer DEFAULT false,
	`is_featured` integer DEFAULT false,
	`sort_order` integer DEFAULT 0,
	`createdAt` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	`deletedAt` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `addons_slug_unique` ON `addons` (`slug`);--> statement-breakpoint
CREATE TABLE `practice_addons` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`practice_id` text NOT NULL,
	`addon_id` text NOT NULL,
	`subscription_tier` text NOT NULL,
	`billing_cycle` text DEFAULT 'monthly' NOT NULL,
	`startDate` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	`endDate` integer,
	`payment_status` text NOT NULL,
	`is_active` integer DEFAULT true,
	`lastActivatedAt` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	`createdAt` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	`deletedAt` integer,
	FOREIGN KEY (`practice_id`) REFERENCES `practices`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`addon_id`) REFERENCES `addons`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `lab_order_tests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`lab_order_id` integer NOT NULL,
	`test_catalog_id` integer NOT NULL,
	`status` text DEFAULT 'ordered' NOT NULL,
	`price` text,
	`createdAt` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	FOREIGN KEY (`lab_order_id`) REFERENCES `lab_orders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`test_catalog_id`) REFERENCES `lab_test_catalog`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `lab_orders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`pet_id` text NOT NULL,
	`practice_id` text NOT NULL,
	`ordered_by_id` text NOT NULL,
	`soap_note_id` text,
	`orderDate` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`provider` text NOT NULL,
	`external_order_id` text,
	`external_reference` text,
	`sampleCollectionDate` integer,
	`sample_type` text,
	`priority` text DEFAULT 'routine' NOT NULL,
	`notes` text,
	`is_manual_entry` integer DEFAULT false NOT NULL,
	`total_price` text,
	`createdAt` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	FOREIGN KEY (`pet_id`) REFERENCES `pets`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`practice_id`) REFERENCES `practices`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`ordered_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`soap_note_id`) REFERENCES `soap_notes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `lab_provider_settings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`practice_id` text NOT NULL,
	`provider` text NOT NULL,
	`api_key` text,
	`api_secret` text,
	`account_id` text,
	`in_house_equipment` text,
	`in_house_contact` text,
	`in_house_location` text,
	`is_active` integer DEFAULT true NOT NULL,
	`settings` text,
	`createdAt` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	FOREIGN KEY (`practice_id`) REFERENCES `practices`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `lab_results` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`lab_order_id` integer NOT NULL,
	`test_catalog_id` integer,
	`resultDate` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	`results` text NOT NULL,
	`interpretation` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`reference_range` text,
	`previous_value` text,
	`previousDate` integer,
	`trend_direction` text,
	`abnormal_flags` text,
	`reviewed_by_id` text,
	`reviewedAt` integer,
	`notes` text,
	`file_path` text,
	`createdAt` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	FOREIGN KEY (`lab_order_id`) REFERENCES `lab_orders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`test_catalog_id`) REFERENCES `lab_test_catalog`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reviewed_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `lab_test_catalog` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`test_code` text NOT NULL,
	`test_name` text NOT NULL,
	`category` text NOT NULL,
	`description` text,
	`provider` text NOT NULL,
	`price` text,
	`turn_around_time` text,
	`practice_id` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`reference_ranges` text,
	`instructions` text,
	`is_panel` integer DEFAULT false NOT NULL,
	`panel_test_ids` text,
	`createdAt` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	FOREIGN KEY (`practice_id`) REFERENCES `practices`(`id`) ON UPDATE no action ON DELETE cascade
);
