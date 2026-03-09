-- PRD-005: Real Account Linking
-- Adds Plaid integration fields to accounts + plaid_items table.

ALTER TABLE accounts ADD COLUMN plaid_item_id TEXT;
ALTER TABLE accounts ADD COLUMN plaid_account_id TEXT;
ALTER TABLE accounts ADD COLUMN connection_status TEXT NOT NULL DEFAULT 'healthy' CHECK (connection_status IN ('healthy', 'degraded', 'error', 'requires_reauth', 'disconnected', 'manual'));
ALTER TABLE accounts ADD COLUMN linked_at INTEGER;

-- One plaid_item per bank connection (may have multiple accounts per item)
CREATE TABLE IF NOT EXISTS plaid_items (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_id TEXT UNIQUE NOT NULL,
  institution_id TEXT,
  institution_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'healthy' CHECK (status IN ('healthy', 'degraded', 'error', 'requires_reauth', 'disconnected')),
  error_code TEXT,
  last_webhook_at INTEGER,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_plaid_items_user_id ON plaid_items(user_id);
