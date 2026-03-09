import type { Account, Transaction, Subscription, Bill } from "@orbit/shared";
import type { FinanceAdapter } from "./interface.js";
import { generateId } from "../../lib/id.js";

const NOW = Math.floor(Date.now() / 1000);
const DAY = 86400;

/**
 * Mock finance adapter — returns realistic demo data for development/MVP.
 */
export class MockFinanceAdapter implements FinanceAdapter {
  async linkAccounts(userId: string, _credentials: Record<string, string>): Promise<Account[]> {
    return [
      {
        id: generateId("acc"),
        userId,
        name: "Primary Checking",
        institution: "Demo Bank",
        accountType: "checking",
        balanceCents: 425000,
        currency: "USD",
        lastSyncedAt: NOW,
        createdAt: NOW,
        plaidItemId: null,
        plaidAccountId: null,
        connectionStatus: "manual",
        linkedAt: NOW,
      },
      {
        id: generateId("acc"),
        userId,
        name: "High-Yield Savings",
        institution: "Demo Bank",
        accountType: "savings",
        balanceCents: 1200000,
        currency: "USD",
        lastSyncedAt: NOW,
        createdAt: NOW,
        plaidItemId: null,
        plaidAccountId: null,
        connectionStatus: "manual",
        linkedAt: NOW,
      },
    ];
  }

  async getAccounts(_userId: string): Promise<Account[]> {
    return [];
  }

  async syncAccount(_userId: string, _accountId: string): Promise<{ syncedAt: number }> {
    return { syncedAt: NOW };
  }

  async getTransactions(
    _userId: string,
    options?: { accountId?: string; limit?: number; offset?: number }
  ): Promise<{ transactions: Transaction[]; total: number }> {
    const limit = options?.limit ?? 50;
    void options?.accountId; // unused in mock
    const transactions: Transaction[] = [
      {
        id: generateId("txn"),
        accountId: "acc_demo1",
        userId: "demo",
        amountCents: -1799,
        description: "NETFLIX.COM",
        merchantName: "Netflix",
        category: "Entertainment",
        isRecurring: true,
        recurringId: "sub_netflix",
        transactedAt: NOW - 5 * DAY,
        createdAt: NOW - 5 * DAY,
      },
      {
        id: generateId("txn"),
        accountId: "acc_demo1",
        userId: "demo",
        amountCents: -4299,
        description: "SPOTIFY USA",
        merchantName: "Spotify",
        category: "Entertainment",
        isRecurring: true,
        recurringId: "sub_spotify",
        transactedAt: NOW - 8 * DAY,
        createdAt: NOW - 8 * DAY,
      },
      {
        id: generateId("txn"),
        accountId: "acc_demo1",
        userId: "demo",
        amountCents: -12345,
        description: "WHOLE FOODS MARKET",
        merchantName: "Whole Foods",
        category: "Groceries",
        isRecurring: false,
        recurringId: null,
        transactedAt: NOW - 2 * DAY,
        createdAt: NOW - 2 * DAY,
      },
      {
        id: generateId("txn"),
        accountId: "acc_demo1",
        userId: "demo",
        amountCents: 250000,
        description: "DIRECT DEPOSIT PAYROLL",
        merchantName: null,
        category: "Income",
        isRecurring: true,
        recurringId: "rec_payroll",
        transactedAt: NOW - 14 * DAY,
        createdAt: NOW - 14 * DAY,
      },
    ];

    return {
      transactions: transactions.slice(0, limit),
      total: transactions.length,
    };
  }

  async detectSubscriptions(_userId: string): Promise<Subscription[]> {
    return [
      {
        id: "sub_netflix",
        userId: "demo",
        merchantName: "Netflix",
        amountCents: 1799,
        billingCycle: "monthly",
        lastChargedAt: NOW - 5 * DAY,
        nextExpectedAt: NOW + 25 * DAY,
        status: "active",
        lastUsedAt: NOW - 2 * DAY,
        createdAt: NOW - 90 * DAY,
      },
      {
        id: "sub_spotify",
        userId: "demo",
        merchantName: "Spotify",
        amountCents: 1099,
        billingCycle: "monthly",
        lastChargedAt: NOW - 8 * DAY,
        nextExpectedAt: NOW + 22 * DAY,
        status: "active",
        lastUsedAt: NOW - 1 * DAY,
        createdAt: NOW - 180 * DAY,
      },
      {
        id: "sub_gym",
        userId: "demo",
        merchantName: "Planet Fitness",
        amountCents: 2499,
        billingCycle: "monthly",
        lastChargedAt: NOW - 20 * DAY,
        nextExpectedAt: NOW + 10 * DAY,
        status: "flagged",
        lastUsedAt: NOW - 65 * DAY, // Not used in 65 days — flagged
        createdAt: NOW - 365 * DAY,
      },
    ];
  }

  async getUpcomingBills(_userId: string, lookAheadDays = 30): Promise<Bill[]> {
    const defaults = { gracePeriodDays: 0, lateFeeCents: 0, paymentRail: "ach" as const, smartPayEnabled: true, billerCategory: "utility" as const };
    return ([
      {
        id: "bill_electric",
        userId: "demo",
        name: "Electric Bill",
        amountCents: 8750,
        dueAt: NOW + 5 * DAY,
        status: "pending" as const,
        paidAt: null,
        createdAt: NOW - 25 * DAY,
        ...defaults,
      },
      {
        id: "bill_internet",
        userId: "demo",
        name: "Internet",
        amountCents: 5999,
        dueAt: NOW + 8 * DAY,
        status: "pending" as const,
        paidAt: null,
        createdAt: NOW - 22 * DAY,
        ...defaults,
      },
      {
        id: "bill_rent",
        userId: "demo",
        name: "Rent",
        amountCents: 175000,
        dueAt: NOW + 23 * DAY,
        status: "pending" as const,
        paidAt: null,
        createdAt: NOW - 7 * DAY,
        ...defaults,
        billerCategory: "rent" as const,
      },
    ] satisfies Bill[]).filter((b) => b.dueAt <= NOW + lookAheadDays * DAY);
  }
}
