Migration notes: inventory_transactions.performed_by_id type fix

Problem:

- `inventory_transactions.performed_by_id` was previously defined as `text` in earlier migrations, but the updated schema uses an integer foreign key referencing `users.id` (integer). Running `drizzle-kit push` failed because Postgres couldn't cast arbitrary text to integer.

Actions taken:

1. Updated schema: `src/db/schemas/inventoryTransactionsSchema.ts` changed `performedById` to use `foreignKeyInt('performed_by_id')`.
2. Added migration `0013_sanitize_performed_by_id.sql` to normalize existing values by converting numeric strings to integers and setting non-numeric strings to NULL.
3. Added migration `0014_force_cast_performed_by_id.sql` with an explicit `ALTER TABLE ... USING` expression to safely coerce values to integer.
4. Ran a targeted psql script (sourced from `.env`) to strip non-digits and alter the column type with `USING` prior to running `drizzle-kit push`.
5. Re-ran `npm run db:push` which completed successfully.

Notes & follow-ups:

- Back up DB before running these migrations in production. Non-numeric values will be set to NULL.
- Consider adding validation in code to ensure any future inserts use numeric user IDs for `performed_by_id`.
- If you rely on string-based external IDs, consider adding a separate textual field instead of reusing `performed_by_id`.
