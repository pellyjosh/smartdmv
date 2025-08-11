-- Fix prescription table IDs to auto-increment properly
-- Run this script directly in your PostgreSQL database

-- Create sequences if they don't exist
CREATE SEQUENCE IF NOT EXISTS prescriptions_id_seq;
CREATE SEQUENCE IF NOT EXISTS prescription_history_id_seq;

-- Set the sequences to start from the current max ID + 1
SELECT setval('prescriptions_id_seq', COALESCE((SELECT MAX(id) FROM prescriptions), 0) + 1, false);
SELECT setval('prescription_history_id_seq', COALESCE((SELECT MAX(id) FROM prescription_history), 0) + 1, false);

-- Alter the tables to use the sequences as default
ALTER TABLE prescriptions ALTER COLUMN id SET DEFAULT nextval('prescriptions_id_seq');
ALTER TABLE prescription_history ALTER COLUMN id SET DEFAULT nextval('prescription_history_id_seq');

-- Set the sequences to be owned by the columns
ALTER SEQUENCE prescriptions_id_seq OWNED BY prescriptions.id;
ALTER SEQUENCE prescription_history_id_seq OWNED BY prescription_history.id;
