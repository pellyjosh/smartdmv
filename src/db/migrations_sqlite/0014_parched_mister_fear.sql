PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_soap_templates` (
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
INSERT INTO `__new_soap_templates`("id", "name", "description", "category", "species_applicability", "subjective_template", "objective_template", "assessment_template", "plan_template", "is_default", "practice_id", "created_by_id", "createdAt", "updatedAt") SELECT "id", "name", "description", "category", "species_applicability", "subjective_template", "objective_template", "assessment_template", "plan_template", "is_default", "practice_id", "created_by_id", "createdAt", "updatedAt" FROM `soap_templates`;--> statement-breakpoint
DROP TABLE `soap_templates`;--> statement-breakpoint
ALTER TABLE `__new_soap_templates` RENAME TO `soap_templates`;--> statement-breakpoint
PRAGMA foreign_keys=ON;