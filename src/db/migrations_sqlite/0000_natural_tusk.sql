CREATE TABLE `dashboard_configs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`user_id` text NOT NULL,
	`practice_id` text,
	`config` text NOT NULL,
	`role` text,
	`is_default` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `practices` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`createdAt` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` integer DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expiresAt` integer NOT NULL,
	`data` text,
	`createdAt` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `administrator_accessible_practices` (
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
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`username` text NOT NULL,
	`name` text,
	`password` text NOT NULL,
	`phone` text,
	`address` text,
	`city` text,
	`state` text,
	`zip_code` text,
	`country` text,
	`emergency_contact_name` text,
	`emergency_contact_phone` text,
	`emergency_contact_relationship` text,
	`role` text NOT NULL,
	`practice_id` text,
	`current_practice_id` text,
	`createdAt` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	FOREIGN KEY (`practice_id`) REFERENCES `practices`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`current_practice_id`) REFERENCES `practices`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
CREATE TABLE `appointments` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`date` integer NOT NULL,
	`duration_minutes` text DEFAULT '30',
	`status` text DEFAULT 'pending' NOT NULL,
	`pet_id` text,
	`client_id` text,
	`staff_id` text,
	`practitioner_id` text,
	`practice_id` text NOT NULL,
	`createdAt` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	FOREIGN KEY (`pet_id`) REFERENCES `pets`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`client_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`staff_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`practitioner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`practice_id`) REFERENCES `practices`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `pets` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`species` text,
	`breed` text,
	`dateOfBirth` integer,
	`owner_id` text NOT NULL,
	`practice_id` text NOT NULL,
	`weight` text,
	`allergies` text,
	`color` text,
	`gender` text,
	`microchip_number` text,
	`pet_type` text,
	`photo_path` text,
	`createdAt` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`practice_id`) REFERENCES `practices`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `health_plans` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`pet_id` text NOT NULL,
	`practice_id` text NOT NULL,
	`plan_type` text,
	`description` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`startDate` integer,
	`endDate` integer,
	`createdAt` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	FOREIGN KEY (`pet_id`) REFERENCES `pets`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`practice_id`) REFERENCES `practices`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `admissions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`pet_id` text NOT NULL,
	`client_id` text NOT NULL,
	`attending_vet_id` text NOT NULL,
	`practice_id` text NOT NULL,
	`reason` text NOT NULL,
	`notes` text,
	`room_id` integer,
	`admissionDate` integer NOT NULL,
	`dischargeDate` integer,
	`status` text DEFAULT 'pending' NOT NULL,
	`createdAt` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	FOREIGN KEY (`pet_id`) REFERENCES `pets`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`client_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`attending_vet_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`practice_id`) REFERENCES `practices`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `rooms` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`room_number` text NOT NULL,
	`type` text DEFAULT 'standard' NOT NULL,
	`capacity` integer NOT NULL,
	`notes` text,
	`practice_id` text NOT NULL,
	`status` text DEFAULT 'available' NOT NULL,
	`createdAt` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	FOREIGN KEY (`practice_id`) REFERENCES `practices`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `custom_field_categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`practice_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`createdAt` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	FOREIGN KEY (`practice_id`) REFERENCES `practices`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `custom_field_groups` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`category_id` integer NOT NULL,
	`practice_id` text NOT NULL,
	`name` text NOT NULL,
	`key` text NOT NULL,
	`description` text,
	`createdAt` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `custom_field_categories`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`practice_id`) REFERENCES `practices`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `custom_field_values` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`group_id` integer NOT NULL,
	`practice_id` text NOT NULL,
	`value` text,
	`label` text,
	`is_active` integer DEFAULT true NOT NULL,
	`createdAt` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	FOREIGN KEY (`group_id`) REFERENCES `custom_field_groups`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`practice_id`) REFERENCES `practices`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `soap_notes` (
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
	`practice_id` text NOT NULL,
	`created_by_id` text NOT NULL,
	`createdAt` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `prescription_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`prescription_id` integer NOT NULL,
	`quantity_dispensed` text NOT NULL,
	`dispensed_by` integer,
	`dateDispensed` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	`notes` text,
	`inventory_transaction_id` integer,
	`practice_id` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `prescriptions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`soap_note_id` integer,
	`pet_id` text NOT NULL,
	`practice_id` text NOT NULL,
	`prescribed_by` integer NOT NULL,
	`dispensed_by` integer,
	`inventory_item_id` integer,
	`medication_name` text NOT NULL,
	`dosage` text NOT NULL,
	`route` text NOT NULL,
	`frequency` text NOT NULL,
	`duration` text NOT NULL,
	`instructions` text,
	`quantity_prescribed` text NOT NULL,
	`quantity_dispensed` text DEFAULT '0',
	`refills_allowed` integer DEFAULT 0,
	`refills_remaining` integer DEFAULT 0,
	`dispensed_in_house` integer DEFAULT true,
	`status` text DEFAULT 'active' NOT NULL,
	`dateCreated` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	`dateDispensed` integer,
	`createdAt` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `treatments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
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
	`administeredDate` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	`cost` text,
	`billable` integer DEFAULT false,
	`notes` text,
	`createdAt` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	FOREIGN KEY (`soap_note_id`) REFERENCES `soap_notes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`pet_id`) REFERENCES `pets`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`practitioner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
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
CREATE TABLE `treatment_templates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`practice_id` integer NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`description` text,
	`default_dosage` text,
	`default_route` text,
	`default_frequency` text,
	`default_duration` text,
	`default_instructions` text,
	`default_procedure_code` text,
	`common_diagnoses` text,
	`inventory_item_id` integer,
	`sort_order` integer DEFAULT 0,
	`is_active` integer DEFAULT true,
	`created_by_id` integer NOT NULL,
	`createdAt` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL
);
--> statement-breakpoint
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
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`practice_id` text,
	`title` text NOT NULL,
	`message` text NOT NULL,
	`type` text DEFAULT 'info' NOT NULL,
	`read` integer DEFAULT false NOT NULL,
	`related_id` text,
	`related_type` text,
	`link` text,
	`createdAt` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`practice_id`) REFERENCES `practices`(`id`) ON UPDATE no action ON DELETE cascade
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
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE `electronic_signatures` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`signer_name` text NOT NULL,
	`signer_email` text NOT NULL,
	`signer_type` text NOT NULL,
	`signature_data` text NOT NULL,
	`document_type` text NOT NULL,
	`document_id` text NOT NULL,
	`practice_id` text NOT NULL,
	`document_name` text NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`device_info` text,
	`signedAt` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	`createdAt` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	`metadata` text DEFAULT '{}',
	`verified` integer DEFAULT false NOT NULL,
	`verification_method` text,
	`verifiedAt` integer
);
--> statement-breakpoint
CREATE TABLE `imaging_annotations` (
	`id` text PRIMARY KEY NOT NULL,
	`series_id` text NOT NULL,
	`created_by_id` text NOT NULL,
	`annotation_type` text NOT NULL,
	`annotation_data` text NOT NULL,
	`color` text DEFAULT '#FF0000',
	`text` text,
	`createdAt` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `imaging_measurements` (
	`id` text PRIMARY KEY NOT NULL,
	`series_id` text NOT NULL,
	`created_by_id` text NOT NULL,
	`measurement_type` text NOT NULL,
	`measurement_data` text NOT NULL,
	`value` text NOT NULL,
	`unit` text NOT NULL,
	`label` text,
	`createdAt` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `imaging_series` (
	`id` text PRIMARY KEY NOT NULL,
	`medical_imaging_id` text NOT NULL,
	`series_number` integer NOT NULL,
	`series_name` text NOT NULL,
	`description` text,
	`file_path` text,
	`number_of_images` integer DEFAULT 0,
	`modality` text NOT NULL,
	`body_part` text,
	`createdAt` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `medical_imaging` (
	`id` text PRIMARY KEY NOT NULL,
	`pet_id` text NOT NULL,
	`practice_id` text NOT NULL,
	`soap_note_id` text,
	`veterinarian_id` text NOT NULL,
	`radiologist_id` text,
	`studyDate` integer NOT NULL,
	`imaging_type` text NOT NULL,
	`anatomical_region` text NOT NULL,
	`laterality` text,
	`view` text,
	`study_name` text NOT NULL,
	`description` text,
	`findings` text,
	`impression` text,
	`recommendations` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`has_annotations` integer DEFAULT false NOT NULL,
	`has_measurements` integer DEFAULT false NOT NULL,
	`machine_info` text,
	`technician_notes` text,
	`createdAt` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `medical_record_attachments` (
	`id` text PRIMARY KEY NOT NULL,
	`file_name` text NOT NULL,
	`file_type` text NOT NULL,
	`file_size` integer NOT NULL,
	`file_path` text NOT NULL,
	`uploaded_by_id` text NOT NULL,
	`pet_id` text NOT NULL,
	`practice_id` text NOT NULL,
	`record_type` text NOT NULL,
	`record_id` text NOT NULL,
	`description` text,
	`tags` text,
	`thumbnail_path` text,
	`series_id` text,
	`dicom_metadata` text,
	`width` integer,
	`height` integer,
	`rotation` integer DEFAULT 0,
	`calibration_factor` text,
	`createdAt` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL
);
--> statement-breakpoint
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
