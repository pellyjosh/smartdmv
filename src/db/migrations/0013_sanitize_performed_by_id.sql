-- sanitize performed_by_id values before changing type to integer
-- Convert numeric text values to integer, set non-numeric to NULL
BEGIN;

-- Update numeric-looking values
UPDATE inventory_transactions
SET performed_by_id = CAST(performed_by_id AS integer)
WHERE performed_by_id ~ '^\\d+$';

-- Set non-numeric values to NULL (or choose a fallback)
UPDATE inventory_transactions
SET performed_by_id = NULL
WHERE NOT (performed_by_id ~ '^\\d+$');

COMMIT;
