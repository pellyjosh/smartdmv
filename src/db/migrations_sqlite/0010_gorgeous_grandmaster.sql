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
