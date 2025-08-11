-- Fix prescription ID sequence
-- This script creates a sequence for the prescriptions table ID column
-- and sets it as the default value

-- Create a sequence for prescriptions id if it doesn't exist
CREATE SEQUENCE IF NOT EXISTS prescriptions_id_seq;

-- Set the sequence as the default for the id column
ALTER TABLE prescriptions ALTER COLUMN id SET DEFAULT nextval('prescriptions_id_seq');

-- Set the sequence ownership to the id column
ALTER SEQUENCE prescriptions_id_seq OWNED BY prescriptions.id;

-- Get the current max ID and set the sequence to start from there + 1
SELECT setval('prescriptions_id_seq', COALESCE(MAX(id), 0) + 1, false) FROM prescriptions;

-- Do the same for prescription_history table
CREATE SEQUENCE IF NOT EXISTS prescription_history_id_seq;
ALTER TABLE prescription_history ALTER COLUMN id SET DEFAULT nextval('prescription_history_id_seq');
ALTER SEQUENCE prescription_history_id_seq OWNED BY prescription_history.id;
SELECT setval('prescription_history_id_seq', COALESCE(MAX(id), 0) + 1, false) FROM prescription_history;
