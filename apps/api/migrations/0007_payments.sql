-- PRD-045: Bill Payment Execution — payments tracking table
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bill_id TEXT REFERENCES bills(id),
  biller_name TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'initiated'
    CHECK (status IN ('initiated', 'clearing', 'settled', 'failed', 'cancelled')),
  idempotency_key TEXT NOT NULL UNIQUE,
  from_account_id TEXT,
  failure_code TEXT,
  failure_message TEXT,
  initiated_at INTEGER NOT NULL,
  cleared_at INTEGER,
  settled_at INTEGER,
  failed_at INTEGER,
  cancelled_at INTEGER,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_idempotency ON payments(idempotency_key);
