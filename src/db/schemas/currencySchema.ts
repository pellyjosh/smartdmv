import { dbTable, text, timestamp, primaryKeyId } from '@/db/db.config';
import { relations, sql } from 'drizzle-orm';
import { practices } from './practicesSchema';

export const currencies = dbTable('currencies', {
  id: primaryKeyId(),
  code: text('code').notNull().unique(), // ISO code e.g. USD, NGN
  name: text('name').notNull(),
  symbol: text('symbol').notNull(),
  decimals: text('decimals').default(sql`'2'`),
  active: text('active', { enum: ['yes', 'no'] }).notNull().default(sql`'yes'`),
  createdAt: timestamp('created_at', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`).$onUpdate(() => sql`CURRENT_TIMESTAMP`),
});

export const currenciesRelations = relations(currencies, ({ many }) => ({
  // Optionally reference practices if reverse relation is needed
}));

export interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  decimals?: string;
  active?: string;
  createdAt: Date;
  updatedAt: Date;
}
