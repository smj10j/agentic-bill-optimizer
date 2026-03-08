import type { Account, Transaction, Subscription, Bill } from "@orbit/shared";

/**
 * Financial data adapter — abstraction over account data providers.
 *
 * MVP: MockFinanceAdapter (seeded with demo data)
 * Future: Plaid, MX, or direct bank integrations
 */
export interface FinanceAdapter {
  /** Link accounts for a user and return linked accounts */
  linkAccounts(userId: string, credentials: Record<string, string>): Promise<Account[]>;

  /** Get all accounts for a user */
  getAccounts(userId: string): Promise<Account[]>;

  /** Sync latest data for an account */
  syncAccount(userId: string, accountId: string): Promise<{ syncedAt: number }>;

  /** Get recent transactions */
  getTransactions(
    userId: string,
    options?: { accountId?: string; limit?: number; offset?: number }
  ): Promise<{ transactions: Transaction[]; total: number }>;

  /** Detect recurring charges (subscriptions) from transaction history */
  detectSubscriptions(userId: string): Promise<Subscription[]>;

  /** Get upcoming bills */
  getUpcomingBills(userId: string, lookAheadDays?: number): Promise<Bill[]>;
}
