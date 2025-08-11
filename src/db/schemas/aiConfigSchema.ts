import { dbTable, text, timestamp, boolean, primaryKeyId, foreignKeyInt } from '@/db/db.config';
import { relations, sql } from 'drizzle-orm';
import { practices } from './practicesSchema';
import { users } from './usersSchema';

export const aiConfigs = dbTable('ai_configs', {
  id: primaryKeyId(),
  practiceId: foreignKeyInt('practice_id').notNull().references(() => practices.id as any, { onDelete: 'cascade' }),
  geminiApiKey: text('gemini_api_key'), // Encrypted API key
  isEnabled: boolean('is_enabled').notNull().default(false),
  configuredBy: foreignKeyInt('configured_by').notNull().references(() => users.id as any, { onDelete: 'cascade' }),
  
  // Additional AI configuration options
  maxTokens: text('max_tokens'), // Store as text for flexibility, default '1000'
  temperature: text('temperature'), // Store as text for decimal precision, default '0.7'
  
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`).$onUpdate(() => sql`CURRENT_TIMESTAMP`),
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
