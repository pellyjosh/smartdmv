-- PostgreSQL Migration Script: Convert Text UUID Primary Keys to Serial
-- WARNING: This will break foreign key relationships and require data migration
-- Run this in a transaction and test thoroughly!

BEGIN;

-- Step 1: Create temporary columns for new serial IDs
ALTER TABLE users ADD COLUMN new_id SERIAL;
ALTER TABLE practices ADD COLUMN new_id SERIAL;
ALTER TABLE pets ADD COLUMN new_id SERIAL;
ALTER TABLE health_plans ADD COLUMN new_id SERIAL;
ALTER TABLE appointments ADD COLUMN new_id SERIAL;
ALTER TABLE notifications ADD COLUMN new_id SERIAL;
ALTER TABLE sessions ADD COLUMN new_id SERIAL;

-- Step 2: Create mapping tables to track UUID -> Integer conversions
CREATE TEMPORARY TABLE user_id_mapping AS 
SELECT id::text as old_id, new_id FROM users;

CREATE TEMPORARY TABLE practice_id_mapping AS 
SELECT id::text as old_id, new_id FROM practices;

CREATE TEMPORARY TABLE pet_id_mapping AS 
SELECT id::text as old_id, new_id FROM pets;

-- Step 3: Update foreign key references in dependent tables
-- Update pets table foreign keys
UPDATE pets SET 
  new_owner_id = (SELECT new_id FROM user_id_mapping WHERE old_id = pets.owner_id),
  new_practice_id = (SELECT new_id FROM practice_id_mapping WHERE old_id = pets.practice_id);

-- Update appointments table foreign keys  
UPDATE appointments SET
  new_pet_id = (SELECT new_id FROM pet_id_mapping WHERE old_id = appointments.pet_id),
  new_client_id = (SELECT new_id FROM user_id_mapping WHERE old_id = appointments.client_id),
  new_staff_id = (SELECT new_id FROM user_id_mapping WHERE old_id = appointments.staff_id),
  new_practitioner_id = (SELECT new_id FROM user_id_mapping WHERE old_id = appointments.practitioner_id),
  new_practice_id = (SELECT new_id FROM practice_id_mapping WHERE old_id = appointments.practice_id);

-- Continue for all other tables with foreign keys...

-- Step 4: Drop old columns and constraints
ALTER TABLE users DROP CONSTRAINT users_pkey;
ALTER TABLE users DROP COLUMN id;
ALTER TABLE users RENAME COLUMN new_id TO id;
ALTER TABLE users ADD PRIMARY KEY (id);

-- Repeat for all tables...

-- Step 5: Re-add foreign key constraints
ALTER TABLE pets 
  ADD CONSTRAINT pets_owner_id_fkey 
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE;

-- Continue for all foreign key relationships...

COMMIT;

-- Note: This is a complex migration that requires careful planning
-- Consider using a migration tool like Drizzle Kit for safer migrations
