
CREATE TABLE IF NOT EXISTS "practices" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"password_hash" text NOT NULL,
	"role" text NOT NULL,
	"practice_id" text,
	"current_practice_id" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
  CONSTRAINT "users_role_check" CHECK (role IN ('CLIENT', 'PRACTICE_ADMINISTRATOR', 'ADMINISTRATOR'))
);

CREATE TABLE IF NOT EXISTS "administrator_accessible_practices" (
	"administrator_id" text NOT NULL,
	"practice_id" text NOT NULL,
	"assigned_at" timestamp DEFAULT now(),
	CONSTRAINT "administrator_accessible_practices_administrator_id_practice_id_pk" PRIMARY KEY("administrator_id","practice_id")
);

CREATE TABLE IF NOT EXISTS "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"data" text,
	"created_at" timestamp DEFAULT now()
);

DO $$ BEGIN
 ALTER TABLE "users" ADD CONSTRAINT "users_practice_id_practices_id_fk" FOREIGN KEY ("practice_id") REFERENCES "practices"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "users" ADD CONSTRAINT "users_current_practice_id_practices_id_fk" FOREIGN KEY ("current_practice_id") REFERENCES "practices"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "administrator_accessible_practices" ADD CONSTRAINT "administrator_accessible_practices_administrator_id_users_id_fk" FOREIGN KEY ("administrator_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "administrator_accessible_practices" ADD CONSTRAINT "administrator_accessible_practices_practice_id_practices_id_fk" FOREIGN KEY ("practice_id") REFERENCES "practices"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
