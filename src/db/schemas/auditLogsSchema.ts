import { relations, sql } from 'drizzle-orm';
import { dbTable, uuid, timestamp, text, jsonb, boolean, primaryKeyId } from '@/db/db.config';

export const auditLogs = dbTable('audit_logs', {
  id: primaryKeyId(),
  timestamp: timestamp('timestamp', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  userId: text('user_id'),
  action: text('action').notNull(),
  recordType: text('record_type').notNull(),
  recordId: text('record_id'),
  description: text('description'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  metadata: jsonb('metadata'),
  changes: jsonb('changes'),
  reason: text('reason'),
  practiceId: text('practice_id'),
  organizationId: text('organization_id'),
  version: text('version'),
  isActive: boolean('is_active').default(true),
});

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  // relations to users/practices can be added here
}));

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;

export interface AuditLogRecord extends AuditLog {}
