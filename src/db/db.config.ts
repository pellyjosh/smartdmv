
// src/db/db.config.ts
import * as pgCore from 'drizzle-orm/pg-core';
import * as sqliteCore from 'drizzle-orm/sqlite-core';
import type { PgTimestampBuilder, PgTimestampConfig } from 'drizzle-orm/pg-core';
import type { SQLiteTextBuilder, SQLiteTextMode, SQLiteTimestampProxyConfig } from 'drizzle-orm/sqlite-core';

const dbType = process.env.DB_TYPE || 'postgres'; // Default to PostgreSQL

let selectedCore: typeof pgCore | typeof sqliteCore;
let selectedTableFn: typeof pgCore.pgTable | typeof sqliteCore.sqliteTable;
let selectedTextFn: typeof pgCore.text | typeof sqliteCore.text;
let selectedPrimaryKeyFn: typeof pgCore.primaryKey | typeof sqliteCore.primaryKey;
let selectedIntegerFn: typeof pgCore.integer | typeof sqliteCore.integer;
let selectedTimestampFn:
    ((name: string, config?: PgTimestampConfig | undefined) => PgTimestampBuilder) |
    ((name: string, config?: SQLiteTimestampProxyConfig | undefined) => sqliteCore.SQLiteTextBuilder<sqliteCore.SQLiteTextMode | undefined, string | Date, string | Date>);


if (dbType === 'sqlite') {
  selectedCore = sqliteCore;
  selectedTableFn = sqliteCore.sqliteTable;
  selectedTextFn = sqliteCore.text;
  selectedPrimaryKeyFn = sqliteCore.primaryKey;
  selectedIntegerFn = sqliteCore.integer;
  // For SQLite, timestamp is often represented as TEXT (ISO8601) or INTEGER (Unix epoch)
  // Drizzle's SQLite `timestampProxy` (which is what `sqliteCore.timestamp` is) returns a column
  // that can be configured for different modes (date, number, bigint).
  // Its return type is SQLiteTextBuilder<SQLiteTextMode | undefined, string | Date, string | Date>.
  selectedTimestampFn = (name: string, config?: SQLiteTimestampProxyConfig | undefined) => {
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
