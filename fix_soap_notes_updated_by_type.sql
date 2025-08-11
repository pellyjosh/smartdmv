-- Migration to fix updatedById field type in soap_notes table
-- Change from text to integer to match users.id foreign key relationship

-- First, update any existing text values to integer if possible
-- If there are existing records with non-numeric updatedById, they'll need manual handling

-- Drop the foreign key constraint temporarily if it exists
-- ALTER TABLE soap_notes DROP CONSTRAINT IF EXISTS soap_notes_updated_by_id_users_id_fk;

-- Change the column type from text to integer
ALTER TABLE soap_notes ALTER COLUMN updated_by_id TYPE integer USING updated_by_id::integer;

-- Add the foreign key constraint
ALTER TABLE soap_notes ADD CONSTRAINT soap_notes_updated_by_id_users_id_fk 
  FOREIGN KEY (updated_by_id) REFERENCES users(id);

-- Note: If you have existing data with text values that can't be converted to integers,
-- you may need to clean up the data first or set those values to NULL before running this migration.
