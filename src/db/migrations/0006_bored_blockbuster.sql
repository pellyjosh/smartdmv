CREATE TABLE "permission_overrides" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"user_name" text NOT NULL,
	"user_email" text NOT NULL,
	"resource" text NOT NULL,
	"action" text NOT NULL,
	"granted" boolean NOT NULL,
	"reason" text NOT NULL,
	"expires_at" timestamp,
	"practice_id" integer NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"created_by" text NOT NULL,
	"status" text NOT NULL
);
