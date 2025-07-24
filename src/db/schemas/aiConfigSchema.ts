import { dbTable, text, timestamp, boolean } from '@/db/db.config';
import { relations, sql } from 'drizzle-orm';
import { practices } from './practicesSchema';
import { users } from './usersSchema';

const isSqlite = process.env.DB_TYPE === 'sqlite';

export const aiConfigs = dbTable('ai_configs', {
  id: text('id').primaryKey(),
  practiceId: text('practice_id').notNull().references(() => practices.id as any, { onDelete: 'cascade' }),
  geminiApiKey: text('gemini_api_key'), // Encrypted API key
  isEnabled: boolean('is_enabled').notNull().default(false),
  configuredBy: text('configured_by').notNull().references(() => users.id as any, { onDelete: 'cascade' }),
  
  // Additional AI configuration options
  maxTokens: text('max_tokens'), // Store as text for flexibility, default '1000'
  temperature: text('temperature'), // Store as text for decimal precision, default '0.7'
  
  createdAt: isSqlite
    ? timestamp('createdAt', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`)
    : timestamp('createdAt', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),

  updatedAt: isSqlite
    ? timestamp('updatedAt', { mode: 'timestamp_ms' }).notNull().default(sql`(strftime('%s', 'now') * 1000)`).$onUpdate(() => isSqlite ? sql`(strftime('%s', 'now') * 1000)` : sql`CURRENT_TIMESTAMP`)
    : timestamp('updatedAt', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull().$onUpdate(() => sql`CURRENT_TIMESTAMP`),
});

export const aiConfigsRelations = relations(aiConfigs, ({ one }) => ({
  practice: one(practices, {
    fields: [aiConfigs.practiceId],
    references: [practices.id],
    relationName: 'practiceAiConfig',
  }),
  configuredByUser: one(users, {
    fields: [aiConfigs.configuredBy],
    references: [users.id],
    relationName: 'userAiConfigs',
  }),
}));

export interface AiConfig {
  id: string;
  practiceId: string;
  geminiApiKey: string | null;
  isEnabled: boolean;
  configuredBy: string;
  maxTokens: string;
  temperature: string;
  createdAt: Date;
  updatedAt: Date;
}
