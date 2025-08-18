-- Migration: Add whiteboard_notes table for staff notes functionality
-- This table stores practice-specific staff notes for each day

CREATE TABLE IF NOT EXISTS "whiteboard_notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"practice_id" integer NOT NULL,
	"author_id" integer NOT NULL,
	"note" text NOT NULL,
	"date" text NOT NULL,
	"createdAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "whiteboard_notes_practice_id_practices_id_fk" FOREIGN KEY ("practice_id") REFERENCES "practices"("id") ON DELETE cascade,
	CONSTRAINT "whiteboard_notes_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE cascade
);

-- Create indexes for better performance on common queries
CREATE INDEX IF NOT EXISTS "idx_whiteboard_notes_practice_date" ON "whiteboard_notes" ("practice_id", "date");
CREATE INDEX IF NOT EXISTS "idx_whiteboard_notes_author" ON "whiteboard_notes" ("author_id");
CREATE INDEX IF NOT EXISTS "idx_whiteboard_notes_created_at" ON "whiteboard_notes" ("createdAt");
