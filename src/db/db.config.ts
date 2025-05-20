import * as pgCore from 'drizzle-orm/pg-core';
import * as sqliteCore from 'drizzle-orm/sqlite-core';

const dbType = process.env.DB_TYPE || 'postgres';

export const dbTable = (name: string, columns: any, config?: any) => {
  if (dbType === 'sqlite') {
    return sqliteCore.sqliteTable(name, columns, config);
  }
  return pgCore.pgTable(name, columns, config);
};

export const text = (name: string, p0?: { enum: readonly ["CLIENT", "PRACTICE_ADMINISTRATOR", "ADMINISTRATOR"]; }) =>
  dbType === 'sqlite' ? sqliteCore.text(name) : pgCore.text(name);

export const integer = (name: string) =>
  dbType === 'sqlite' ? sqliteCore.integer() : pgCore.integer(name);

export const primaryKey = dbType === 'sqlite' ? sqliteCore.primaryKey : pgCore.primaryKey;

export const timestamp = (name: string, p0?: { mode: string; }) =>
  dbType === 'sqlite' ? sqliteCore.integer() : pgCore.timestamp(name);