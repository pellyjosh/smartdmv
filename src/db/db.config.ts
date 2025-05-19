// db.config.ts snippet
import * as pgCore from 'drizzle-orm/pg-core';
import * as sqliteCore from 'drizzle-orm/sqlite-core';

const dbType = process.env.DB_TYPE || 'postgres';

export const dbTable = (name: string, columns: any, config?: any) => {
  if (dbType === 'sqlite') {
    return sqliteCore.sqliteTable(name, columns, config);
  }
  return pgCore.pgTable(name, columns, config);
};

// Export other column builders directly since their signatures align well
export const text = dbType === 'sqlite' ? sqliteCore.text : pgCore.text;
export const integer = dbType === 'sqlite' ? sqliteCore.integer : pgCore.integer;
export const primaryKey = dbType === 'sqlite' ? sqliteCore.primaryKey : pgCore.primaryKey;
export const timestamp = dbType === 'sqlite' ? sqliteCore.integer : pgCore.timestamp; // SQLite uses integer for timestamps