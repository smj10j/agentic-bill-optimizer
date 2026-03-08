-- Autopilot settings per user
CREATE TABLE IF NOT EXISTS autopilot_settings (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  enabled INTEGER NOT NULL DEFAULT 0,
  tier INTEGER NOT NULL DEFAULT 0, -- 0=suggestions, 1=notify_do, 2=supervised, 3=full
  daily_limit_cents INTEGER NOT NULL DEFAULT 50000,       -- $500
  single_action_limit_cents INTEGER NOT NULL DEFAULT 20000, -- $200
  night_freeze_enabled INTEGER NOT NULL DEFAULT 0,
  night_freeze_start_hour INTEGER NOT NULL DEFAULT 22,    -- 10pm
  night_freeze_end_hour INTEGER NOT NULL DEFAULT 8,       -- 8am
  bill_payment_limit_cents INTEGER NOT NULL DEFAULT 50000,
  yield_sweep_in_limit_cents INTEGER NOT NULL DEFAULT 100000,
  yield_sweep_out_limit_cents INTEGER NOT NULL DEFAULT 50000,
  require_approval_subscription_cancel INTEGER NOT NULL DEFAULT 1,
  always_autopay TEXT NOT NULL DEFAULT '[]',  -- JSON array of biller names
  never_autopay TEXT NOT NULL DEFAULT '[]',   -- JSON array of biller names
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_autopilot_settings_user_id ON autopilot_settings(user_id);

-- Extend agent_actions with autopilot-aware fields
ALTER TABLE agent_actions ADD COLUMN approval_status TEXT NOT NULL DEFAULT 'auto_approved';
-- Values: auto_approved | pending | approved | rejected
ALTER TABLE agent_actions ADD COLUMN risk_level TEXT NOT NULL DEFAULT 'low';
-- Values: low | medium | high | critical
ALTER TABLE agent_actions ADD COLUMN amount_cents INTEGER NOT NULL DEFAULT 0;
ALTER TABLE agent_actions ADD COLUMN reasoning TEXT NOT NULL DEFAULT '';
ALTER TABLE agent_actions ADD COLUMN undo_expires_at INTEGER;
ALTER TABLE agent_actions ADD COLUMN approval_expires_at INTEGER;
