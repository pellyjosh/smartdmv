-- Create audit_logs table for tracking system activities
-- This migration should be run to add audit logging functionality

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  user_id TEXT,
  action TEXT NOT NULL,
  record_type TEXT NOT NULL,
  record_id TEXT,
  description TEXT,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB,
  changes JSONB,
  reason TEXT,
  practice_id TEXT,
  organization_id TEXT,
  version TEXT,
  is_active BOOLEAN DEFAULT TRUE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_record_type ON audit_logs(record_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_practice_id ON audit_logs(practice_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_record_id ON audit_logs(record_id);

-- Create a composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_audit_logs_compound ON audit_logs(record_type, action, timestamp DESC);

COMMENT ON TABLE audit_logs IS 'System audit trail for tracking all user actions and changes';
COMMENT ON COLUMN audit_logs.action IS 'Action performed (CREATE, UPDATE, DELETE, VIEW, LOCK, etc.)';
COMMENT ON COLUMN audit_logs.record_type IS 'Type of record affected (USER, PERMISSION, SOAP_NOTE, etc.)';
COMMENT ON COLUMN audit_logs.metadata IS 'Additional context data in JSON format';
COMMENT ON COLUMN audit_logs.changes IS 'Before/after data for tracking changes';
