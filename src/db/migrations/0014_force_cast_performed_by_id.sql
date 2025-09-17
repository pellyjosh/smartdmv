-- Force-cast performed_by_id to integer using USING clause, then add FK
BEGIN;

-- Force cast using integer conversion where possible; non-numeric values become NULL
ALTER TABLE inventory_transactions
  ALTER COLUMN performed_by_id TYPE integer USING (NULLIF(regexp_replace(performed_by_id, '[^0-9]', '', 'g'), '')::integer);

-- If needed, ensure performed_by_id references users.id (added later by drizzle), leave as integer now
COMMIT;
