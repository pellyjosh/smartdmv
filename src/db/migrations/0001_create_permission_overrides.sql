-- Migration: create permission_overrides table

CREATE TABLE IF NOT EXISTS permission_overrides (
  id varchar(64) PRIMARY KEY,
  user_id varchar(64) NOT NULL,
  user_name text NOT NULL,
  user_email text NOT NULL,
  resource varchar(128) NOT NULL,
  action varchar(64) NOT NULL,
  granted boolean NOT NULL,
  reason text NOT NULL,
  expires_at timestamptz,
  practice_id integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by varchar(64) NOT NULL,
  status varchar(32) NOT NULL
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_permission_overrides_practice_id ON permission_overrides(practice_id);
CREATE INDEX IF NOT EXISTS idx_permission_overrides_user_id ON permission_overrides(user_id);
CREATE INDEX IF NOT EXISTS idx_permission_overrides_status ON permission_overrides(status);
