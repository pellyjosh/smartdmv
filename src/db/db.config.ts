import * as pgCore from 'drizzle-orm/pg-core';

// PostgreSQL-only configuration
export const dbTable = pgCore.pgTable;

export const text = (
  name: string,
  config?: { enum?: readonly [string, ...string[]]; length?: number; mode?: 'text' | 'array' }
) => {
  if (config?.mode === 'array') {
    return pgCore.text(name).array();
  }
  return pgCore.text(name, config);
};

export const integer = (name: string) => pgCore.integer(name);

export const serial = (name: string) => pgCore.serial(name);

// Helper for primary key IDs - always use serial for PostgreSQL
export const primaryKeyId = (name: string = 'id') => pgCore.serial(name).primaryKey();

// Helper for foreign key references to serial primary keys
export const foreignKeyInt = (name: string) => pgCore.integer(name);

// Helper for foreign key references to text primary keys  
export const foreignKeyText = (name: string) => pgCore.text(name);

export const primaryKey = pgCore.primaryKey;

export const timestamp = (name: string, options?: { mode?: 'date' | 'string'; withTimezone?: boolean }) =>
  pgCore.timestamp(name, options);

export const boolean = (name: string) => pgCore.boolean(name);

export const decimal = (name: string, config?: { precision?: number; scale?: number }) =>
  pgCore.decimal(name, { mode: 'string', ...config });

// Additional PostgreSQL-specific types
export const uuid = (name: string) => pgCore.uuid(name);
export const json = (name: string) => pgCore.json(name);
export const jsonb = (name: string) => pgCore.jsonb(name);
export const bigint = (name: string) => pgCore.bigint(name, { mode: 'number' });
export const bigserial = (name: string) => pgCore.bigserial(name, { mode: 'number' });
export const real = (name: string) => pgCore.real(name);
export const doublePrecision = (name: string) => pgCore.doublePrecision(name);