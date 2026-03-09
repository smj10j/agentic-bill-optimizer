-- PRD-007: Proactive Agent Insights
-- Stores generated insights and user feedback.

CREATE TABLE IF NOT EXISTS insights (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('savings', 'risk', 'pattern', 'yield')),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'delivered', 'viewed', 'acted', 'dismissed', 'expired')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  dollar_impact_cents INTEGER,
  relevance_score INTEGER NOT NULL DEFAULT 0,
  urgency INTEGER NOT NULL DEFAULT 0,
  entity_type TEXT,
  entity_id TEXT,
  metadata TEXT NOT NULL DEFAULT '{}',
  feedback TEXT,
  delivered_at INTEGER,
  viewed_at INTEGER,
  acted_at INTEGER,
  dismissed_at INTEGER,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_insights_user_status ON insights(user_id, status);
CREATE INDEX IF NOT EXISTS idx_insights_user_created ON insights(user_id, created_at DESC);
