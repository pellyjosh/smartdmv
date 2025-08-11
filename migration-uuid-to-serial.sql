-- PostgreSQL Migration: Convert from UUID to Serial Primary Keys
-- This script converts all UUID primary keys to serial auto-increment integers

-- IMPORTANT: This is a destructive migration that will:
-- 1. Drop all foreign key constraints
-- 2. Convert primary keys from UUID to serial integers
-- 3. Update all foreign key references 
-- 4. Recreate foreign key constraints
-- 
-- BACKUP YOUR DATA BEFORE RUNNING THIS MIGRATION!

BEGIN;

-- Step 1: Drop all foreign key constraints first
-- (This allows us to modify primary keys without constraint violations)

ALTER TABLE pets DROP CONSTRAINT IF EXISTS pets_owner_id_fkey;
ALTER TABLE pets DROP CONSTRAINT IF EXISTS pets_practice_id_fkey;
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_pet_id_fkey;
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_client_id_fkey;
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_staff_id_fkey;
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_practitioner_id_fkey;
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_practice_id_fkey;
ALTER TABLE health_plans DROP CONSTRAINT IF EXISTS health_plans_pet_id_fkey;
ALTER TABLE health_plans DROP CONSTRAINT IF EXISTS health_plans_practice_id_fkey;
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_practice_id_fkey;
ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_user_id_fkey;
ALTER TABLE administrator_accessible_practices DROP CONSTRAINT IF EXISTS administrator_accessible_practices_administrator_id_fkey;
ALTER TABLE administrator_accessible_practices DROP CONSTRAINT IF EXISTS administrator_accessible_practices_practice_id_fkey;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_practice_id_fkey;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_current_practice_id_fkey;

-- Step 2: Create temporary mapping tables to store UUID -> Integer mappings
CREATE TEMPORARY TABLE practice_id_mapping (
    uuid_id TEXT,
    new_id SERIAL
);

CREATE TEMPORARY TABLE user_id_mapping (
    uuid_id TEXT,
    new_id SERIAL
);

CREATE TEMPORARY TABLE pet_id_mapping (
    uuid_id TEXT,
    new_id SERIAL
);

-- Step 3: Populate mapping tables with existing data
INSERT INTO practice_id_mapping (uuid_id)
SELECT id FROM practices ORDER BY created_at;

INSERT INTO user_id_mapping (uuid_id)
SELECT id FROM users ORDER BY created_at;

INSERT INTO pet_id_mapping (uuid_id)
SELECT id FROM pets ORDER BY created_at;

-- Step 4: Create new tables with serial primary keys
CREATE TABLE practices_new (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE users_new (
    id SERIAL PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    username TEXT NOT NULL UNIQUE,
    name TEXT,
    password TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    country TEXT,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    emergency_contact_relationship TEXT,
    role TEXT NOT NULL,
    practice_id INTEGER,
    current_practice_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE pets_new (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    species TEXT,
    breed TEXT,
    date_of_birth TIMESTAMP,
    owner_id INTEGER NOT NULL,
    practice_id INTEGER NOT NULL,
    weight TEXT,
    allergies TEXT,
    color TEXT,
    gender TEXT,
    microchip_number TEXT,
    pet_type TEXT,
    photo_path TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Step 5: Migrate data from old tables to new tables with converted IDs
INSERT INTO practices_new (id, name, created_at, updated_at)
SELECT 
    pm.new_id,
    p.name,
    p.created_at,
    p.updated_at
FROM practices p
JOIN practice_id_mapping pm ON p.id = pm.uuid_id
ORDER BY pm.new_id;

INSERT INTO users_new (id, email, username, name, password, phone, address, city, state, zip_code, country, emergency_contact_name, emergency_contact_phone, emergency_contact_relationship, role, practice_id, current_practice_id, created_at, updated_at)
SELECT 
    um.new_id,
    u.email,
    u.username,
    u.name,
    u.password,
    u.phone,
    u.address,
    u.city,
    u.state,
    u.zip_code,
    u.country,
    u.emergency_contact_name,
    u.emergency_contact_phone,
    u.emergency_contact_relationship,
    u.role,
    (SELECT pm.new_id FROM practice_id_mapping pm WHERE pm.uuid_id = u.practice_id),
    (SELECT pm.new_id FROM practice_id_mapping pm WHERE pm.uuid_id = u.current_practice_id),
    u.created_at,
    u.updated_at
FROM users u
JOIN user_id_mapping um ON u.id = um.uuid_id
ORDER BY um.new_id;

INSERT INTO pets_new (id, name, species, breed, date_of_birth, owner_id, practice_id, weight, allergies, color, gender, microchip_number, pet_type, photo_path, created_at, updated_at)
SELECT 
    pm.new_id,
    p.name,
    p.species,
    p.breed,
    p.date_of_birth,
    (SELECT um.new_id FROM user_id_mapping um WHERE um.uuid_id = p.owner_id),
    (SELECT prm.new_id FROM practice_id_mapping prm WHERE prm.uuid_id = p.practice_id),
    p.weight,
    p.allergies,
    p.color,
    p.gender,
    p.microchip_number,
    p.pet_type,
    p.photo_path,
    p.created_at,
    p.updated_at
FROM pets p
JOIN pet_id_mapping pm ON p.id = pm.uuid_id
ORDER BY pm.new_id;

-- Step 6: Update sequence values to continue from the last inserted ID
SELECT setval('practices_new_id_seq', (SELECT MAX(id) FROM practices_new));
SELECT setval('users_new_id_seq', (SELECT MAX(id) FROM users_new));
SELECT setval('pets_new_id_seq', (SELECT MAX(id) FROM pets_new));

-- Step 7: Drop old tables and rename new tables
DROP TABLE IF EXISTS pets CASCADE;
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS health_plans CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS administrator_accessible_practices CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS practices CASCADE;

-- Rename new tables
ALTER TABLE practices_new RENAME TO practices;
ALTER TABLE users_new RENAME TO users;
ALTER TABLE pets_new RENAME TO pets;

-- Step 8: Recreate dependent tables with integer foreign keys
CREATE TABLE appointments (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    date TIMESTAMP NOT NULL,
    duration_minutes TEXT DEFAULT '30',
    status TEXT NOT NULL DEFAULT 'pending',
    pet_id INTEGER REFERENCES pets(id) ON DELETE CASCADE,
    client_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    staff_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    type TEXT,
    practitioner_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    practice_id INTEGER NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE health_plans (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    practice_id INTEGER NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
    plan_type TEXT,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    practice_id INTEGER REFERENCES practices(id) ON DELETE CASCADE,
    type TEXT NOT NULL DEFAULT 'info',
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    priority TEXT DEFAULT 'medium',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMP NOT NULL,
    data TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE administrator_accessible_practices (
    administrator_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    practice_id INTEGER NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (administrator_id, practice_id)
);

-- Step 9: Add foreign key constraints for users table
ALTER TABLE users 
ADD CONSTRAINT users_practice_id_fkey 
FOREIGN KEY (practice_id) REFERENCES practices(id) ON DELETE SET NULL;

ALTER TABLE users 
ADD CONSTRAINT users_current_practice_id_fkey 
FOREIGN KEY (current_practice_id) REFERENCES practices(id) ON DELETE SET NULL;

-- Step 10: Create indexes for better performance
CREATE INDEX idx_pets_owner_id ON pets(owner_id);
CREATE INDEX idx_pets_practice_id ON pets(practice_id);
CREATE INDEX idx_appointments_pet_id ON appointments(pet_id);
CREATE INDEX idx_appointments_client_id ON appointments(client_id);
CREATE INDEX idx_appointments_practice_id ON appointments(practice_id);
CREATE INDEX idx_health_plans_pet_id ON health_plans(pet_id);
CREATE INDEX idx_health_plans_practice_id ON health_plans(practice_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);

COMMIT;

-- Verification queries
SELECT 'practices' as table_name, count(*) as record_count FROM practices
UNION ALL
SELECT 'users' as table_name, count(*) as record_count FROM users
UNION ALL
SELECT 'pets' as table_name, count(*) as record_count FROM pets
UNION ALL
SELECT 'appointments' as table_name, count(*) as record_count FROM appointments
UNION ALL
SELECT 'health_plans' as table_name, count(*) as record_count FROM health_plans
UNION ALL
SELECT 'notifications' as table_name, count(*) as record_count FROM notifications;

-- Show the current sequence values
SELECT 'practices_id_seq' as sequence_name, last_value FROM practices_id_seq
UNION ALL
SELECT 'users_id_seq' as sequence_name, last_value FROM users_id_seq
UNION ALL
SELECT 'pets_id_seq' as sequence_name, last_value FROM pets_id_seq;
