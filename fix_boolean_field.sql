-- Fix boolean field type for custom_field_values table
-- This addresses the specific ETIMEDOUT error you encountered

-- First check if the column is currently integer type and convert it
ALTER TABLE custom_field_values 
ALTER COLUMN is_active TYPE boolean USING (is_active::integer = 1);

ALTER TABLE custom_field_values 
ALTER COLUMN is_active SET DEFAULT true;
