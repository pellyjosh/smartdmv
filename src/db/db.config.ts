import * as pgCore from 'drizzle-orm/pg-core';
import * as sqliteCore from 'drizzle-orm/sqlite-core';

const dbType = process.env.DB_TYPE || 'postgres';

export const dbTable = (name: string, columns: any, config?: any) => {
  if (dbType === 'sqlite') {
    return sqliteCore.sqliteTable(name, columns, config);
  }
  return pgCore.pgTable(name, columns, config);
};

export const text = (
  name: string,
  // Drizzle's text config can include enums.
  // Example: { enum: ["value1", "value2"] }
  config?: { enum?: readonly [string, ...string[]]; length?: number } // Added length for pg
) => {
  if (dbType === 'sqlite') {
    // sqliteCore.text can take enum: { enum: ["a", "b"] }
    return sqliteCore.text(name, config ? { enum: config.enum } : undefined);
  }
  // pgCore.text can take enum: { enum: ["a", "b"] } and length
  return pgCore.text(name, config);
};

export const integer = (name: string) =>
  dbType === 'sqlite' ? sqliteCore.integer(name) : pgCore.integer(name);

export const primaryKey = dbType === 'sqlite' ? sqliteCore.primaryKey : pgCore.primaryKey;

// export const timestamp = (
//   name: string,
//   options?: { mode?: 'date' | 'string'; precision?: number; withTimezone?: boolean }
// ) => {
//   if (dbType === 'sqlite') {
//     // Store as Unix epoch seconds (number), Drizzle handles conversion to Date.
//     return sqliteCore.integer(name, { mode: 'timestamp' });
//   }
//   return pgCore.timestamp(name, options);
// };

export const timestamp = (name: string, p0?: { mode: string; }) =>
  dbType === 'sqlite' ? sqliteCore.integer() : pgCore.timestamp(name);