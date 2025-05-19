
// src/db/db.config.ts
import * as pgCore from 'drizzle-orm/pg-core';
import * as sqliteCore from 'drizzle-orm/sqlite-core';

// Import specific types needed for strong typing
import type {
  PgTableFn,
  PgTextFn,
  PgTimestampFn,
  PgIntegerFn,
  PgPrimaryKeyFn,
  // PgTimestampConfig and PgTimestampBuilder are implicitly handled by PgTimestampFn type
} from 'drizzle-orm/pg-core';

import type {
  SQLiteTableFn,
  SQLiteTextFn,
  SQLiteTimestampProxyFn, // This is the actual type for sqliteCore.timestamp
  SQLiteIntegerFn,
  SQLitePrimaryKeyFn,
  // SQLiteTimestampProxyConfig, SQLiteTextBuilder, SQLiteTextMode are implicitly handled by SQLiteTimestampProxyFn
} from 'drizzle-orm/sqlite-core';

const dbType = process.env.DB_TYPE || 'postgres'; // Default to PostgreSQL

// Declare variables that will hold the dialect-specific functions
let selectedTableFn: PgTableFn | SQLiteTableFn;
let selectedTextFn: PgTextFn | SQLiteTextFn;
let selectedIntegerFn: PgIntegerFn | SQLiteIntegerFn;
let selectedPrimaryKeyFn: PgPrimaryKeyFn | SQLitePrimaryKeyFn;

// The timestamp function is the most complex due to differing signatures and return types.
// We define a union type for the function itself.
type ConfigurableTimestampFn =
  | PgTimestampFn 
  | SQLiteTimestampProxyFn;

let selectedTimestampFn: ConfigurableTimestampFn;

if (dbType === 'sqlite') {
  selectedTableFn = sqliteCore.sqliteTable;
  selectedTextFn = sqliteCore.text;
  selectedIntegerFn = sqliteCore.integer;
  selectedPrimaryKeyFn = sqliteCore.primaryKey;
  selectedTimestampFn = sqliteCore.timestamp; // sqliteCore.timestamp is a timestampProxy
} else {
  // Default to postgres
  selectedTableFn = pgCore.pgTable;
  selectedTextFn = pgCore.text;
  selectedIntegerFn = pgCore.integer;
  selectedPrimaryKeyFn = pgCore.primaryKey;
  selectedTimestampFn = pgCore.timestamp;
}

// Export the selected functions
// TypeScript should be able to infer the correct usage based on the union types
// when these are called in your schema definition files.
export const dbTable = selectedTableFn;
export const text = selectedTextFn;
export const integer = selectedIntegerFn;
export const primaryKey = selectedPrimaryKeyFn;
export const timestamp = selectedTimestampFn;
