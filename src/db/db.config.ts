// src/db/db.config.ts
import * as pgCore from 'drizzle-orm/pg-core';
import * as sqliteCore from 'drizzle-orm/sqlite-core';
import type { PgTimestampBuilder, PgTimestampConfig } from 'drizzle-orm/pg-core';
import type { SQLiteTextBuilder, SQLiteTextJsonMode, SQLiteTimestampProxyConfig } from 'drizzle-orm/sqlite-core';

const dbType = process.env.DB_TYPE || 'postgres'; // Default to PostgreSQL

let selectedCore: typeof pgCore | typeof sqliteCore;
let selectedTableFn: typeof pgCore.pgTable | typeof sqliteCore.sqliteTable;
let selectedTextFn: typeof pgCore.text | typeof sqliteCore.text;
let selectedPrimaryKeyFn: typeof pgCore.primaryKey | typeof sqliteCore.primaryKey;
let selectedIntegerFn: typeof pgCore.integer | typeof sqliteCore.integer;
let selectedTimestampFn: 
    ((name: string, config?: PgTimestampConfig | undefined) => PgTimestampBuilder) | 
    ((name: string, config?: SQLiteTimestampProxyConfig | undefined) => SQLiteTextBuilder<SQLiteTextJsonMode | undefined, string | Date | undefined, string | Date>);


if (dbType === 'sqlite') {
  selectedCore = sqliteCore;
  selectedTableFn = sqliteCore.sqliteTable;
  selectedTextFn = sqliteCore.text;
  selectedPrimaryKeyFn = sqliteCore.primaryKey;
  selectedIntegerFn = sqliteCore.integer;
  // For SQLite, timestamp is often represented as TEXT (ISO8601) or INTEGER (Unix epoch)
  // We'll map to TEXT for simplicity here to align with how schema.ts might use it with { mode: 'date' }
  selectedTimestampFn = (name: string, config?: SQLiteTimestampProxyConfig | undefined) => {
    // Drizzle's SQLite `timestampProxy` returns a column that can be configured.
    // If config.mode is 'date', it stores as 'YYYY-MM-DD HH:MM:SS.SSS'
    // If config.mode is 'number', it stores as unix epoch seconds.
    // If config.mode is 'bigint', it stores as unix epoch milliseconds.
    // Let's use text to store ISO strings if { mode: 'date' } is implied by schema.
    // The schemas use { mode: 'date' } or { mode: 'date', withTimezone: true }
    // For SQLite, `timestampProxy` with default config or `{ mode: 'text' }` (if available) or just `text()` is fine.
    // `sqliteCore.timestamp(name, config)` is `timestampProxy`.
     return sqliteCore.timestamp(name, config);
  };
  
} else { // Default to postgres
  selectedCore = pgCore;
  selectedTableFn = pgCore.pgTable;
  selectedTextFn = pgCore.text;
  selectedPrimaryKeyFn = pgCore.primaryKey;
  selectedIntegerFn = pgCore.integer;
  selectedTimestampFn = pgCore.timestamp;
}

export const text = selectedTextFn;
export const timestamp = selectedTimestampFn;
export const primaryKey = selectedPrimaryKeyFn;
export const integer = selectedIntegerFn;
export const dbTable = selectedTableFn;
