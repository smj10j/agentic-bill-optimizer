-- PRD-006: Push Notifications & Alerts
-- Web push subscriptions + in-app notification feed.

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT UNIQUE NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  device_hint TEXT,
  created_at INTEGER NOT NULL,
  last_used_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,         -- 'action_approval', 'bill_due', 'payment_completed', 'insight', etc.
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('critical', 'high', 'normal', 'info')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  action_url TEXT,            -- deep link path (e.g. '/autopilot', '/bills')
  action_label TEXT,          -- CTA text (e.g. 'Review')
  read_at INTEGER,
  dismissed_at INTEGER,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(user_id, created_at DESC);

-- User notification preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  agent_actions INTEGER NOT NULL DEFAULT 1,
  bill_reminders INTEGER NOT NULL DEFAULT 1,
  unusual_charges INTEGER NOT NULL DEFAULT 1,
  insights INTEGER NOT NULL DEFAULT 1,
  yield_updates INTEGER NOT NULL DEFAULT 0,
  quiet_hours_enabled INTEGER NOT NULL DEFAULT 1,
  quiet_hours_start INTEGER NOT NULL DEFAULT 22,
  quiet_hours_end INTEGER NOT NULL DEFAULT 8,
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  updated_at INTEGER NOT NULL
);
