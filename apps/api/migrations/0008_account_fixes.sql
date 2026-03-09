-- 0008: Account data fixes
-- 1. Remove duplicate accounts (keep oldest per user+name+institution)
--    Cascades to delete orphaned transactions from duplicates (mock data).
-- 2. Add partial unique index on plaid_account_id to prevent future duplication.

DELETE FROM accounts
WHERE rowid NOT IN (
  SELECT MIN(rowid) FROM accounts GROUP BY user_id, name, institution
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_plaid_account_id
  ON accounts(plaid_account_id)
  WHERE plaid_account_id IS NOT NULL;
