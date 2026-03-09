/**
 * Finance service — reads/writes financial data from D1.
 * The mock finance adapter seeds initial data; this service is the source of truth
 * for all data that has been persisted to the database.
 */

import type { D1Database } from "@cloudflare/workers-types";
import type { Account, Transaction, Subscription, Bill } from "@orbit/shared";
import { generateId } from "../lib/id.js";

// ─── Accounts ─────────────────────────────────────────────────────────────────

export async function getAccounts(db: D1Database, userId: string): Promise<Account[]> {
  const rows = await db
    .prepare(
      "SELECT id, user_id, name, institution, account_type, balance_cents, currency, last_synced_at, created_at FROM accounts WHERE user_id = ? ORDER BY created_at ASC"
    )
    .bind(userId)
    .all<DbAccount>();

  return rows.results.map(toAccount);
}

export async function insertAccount(db: D1Database, account: Omit<Account, "id">): Promise<Account> {
  const id = generateId("acc");
  const now = Math.floor(Date.now() / 1000);
  await db
    .prepare(
      "INSERT INTO accounts (id, user_id, name, institution, account_type, balance_cents, currency, last_synced_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(
      id,
      account.userId,
      account.name,
      account.institution,
      account.accountType,
      account.balanceCents,
      account.currency,
      account.lastSyncedAt ?? now,
      now
    )
    .run();
  return { ...account, id, createdAt: now };
}

export async function updateAccountSync(
  db: D1Database,
  accountId: string,
  userId: string,
  syncedAt: number
): Promise<void> {
  await db
    .prepare("UPDATE accounts SET last_synced_at = ? WHERE id = ? AND user_id = ?")
    .bind(syncedAt, accountId, userId)
    .run();
}

// ─── Transactions ─────────────────────────────────────────────────────────────

export async function getTransactions(
  db: D1Database,
  userId: string,
  options: { accountId?: string; limit?: number; offset?: number; from?: number; to?: number } = {}
): Promise<{ transactions: Transaction[]; total: number }> {
  const { limit = 50, offset = 0, accountId, from, to } = options;

  let whereClause = "WHERE user_id = ?";
  const binds: (string | number)[] = [userId];

  if (accountId) {
    whereClause += " AND account_id = ?";
    binds.push(accountId);
  }
  if (from) {
    whereClause += " AND transacted_at >= ?";
    binds.push(from);
  }
  if (to) {
    whereClause += " AND transacted_at <= ?";
    binds.push(to);
  }

  const [rows, countRow] = await Promise.all([
    db
      .prepare(`SELECT * FROM transactions ${whereClause} ORDER BY transacted_at DESC LIMIT ? OFFSET ?`)
      .bind(...binds, limit, offset)
      .all<DbTransaction>(),
    db
      .prepare(`SELECT COUNT(*) as count FROM transactions ${whereClause}`)
      .bind(...binds)
      .first<{ count: number }>(),
  ]);

  return {
    transactions: rows.results.map(toTransaction),
    total: countRow?.count ?? 0,
  };
}

export async function getTransaction(
  db: D1Database,
  id: string,
  userId: string
): Promise<Transaction | null> {
  const row = await db
    .prepare("SELECT * FROM transactions WHERE id = ? AND user_id = ?")
    .bind(id, userId)
    .first<DbTransaction>();
  return row ? toTransaction(row) : null;
}

export async function insertTransactions(
  db: D1Database,
  transactions: Omit<Transaction, "id" | "createdAt">[]
): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  const stmts = transactions.map((t) =>
    db
      .prepare(
        "INSERT OR IGNORE INTO transactions (id, account_id, user_id, amount_cents, description, merchant_name, category, is_recurring, recurring_id, transacted_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .bind(
        generateId("txn"),
        t.accountId,
        t.userId,
        t.amountCents,
        t.description,
        t.merchantName,
        t.category,
        t.isRecurring ? 1 : 0,
        t.recurringId,
        t.transactedAt,
        now
      )
  );
  await db.batch(stmts);
}

// ─── Subscriptions ────────────────────────────────────────────────────────────

export async function getSubscriptions(db: D1Database, userId: string): Promise<Subscription[]> {
  const rows = await db
    .prepare("SELECT * FROM subscriptions WHERE user_id = ? ORDER BY amount_cents DESC")
    .bind(userId)
    .all<DbSubscription>();
  return rows.results.map(toSubscription);
}

export async function upsertSubscription(
  db: D1Database,
  sub: Omit<Subscription, "id" | "createdAt">
): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  await db
    .prepare(
      `INSERT INTO subscriptions (id, user_id, merchant_name, amount_cents, billing_cycle, last_charged_at, next_expected_at, status, last_used_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         amount_cents = excluded.amount_cents,
         last_charged_at = excluded.last_charged_at,
         next_expected_at = excluded.next_expected_at,
         status = excluded.status`
    )
    .bind(
      generateId("sub"),
      sub.userId,
      sub.merchantName,
      sub.amountCents,
      sub.billingCycle,
      sub.lastChargedAt,
      sub.nextExpectedAt,
      sub.status,
      sub.lastUsedAt,
      now
    )
    .run();
}

export async function updateSubscriptionStatus(
  db: D1Database,
  id: string,
  userId: string,
  status: Subscription["status"]
): Promise<boolean> {
  const result = await db
    .prepare("UPDATE subscriptions SET status = ? WHERE id = ? AND user_id = ?")
    .bind(status, id, userId)
    .run();
  return result.meta.changes > 0;
}

// ─── Bills ────────────────────────────────────────────────────────────────────

export async function getBills(
  db: D1Database,
  userId: string,
  options: { status?: string; lookAheadDays?: number } = {}
): Promise<Bill[]> {
  const { status, lookAheadDays = 30 } = options;
  const cutoff = Math.floor(Date.now() / 1000) + lookAheadDays * 86400;

  let query = "SELECT * FROM bills WHERE user_id = ? AND due_at <= ?";
  const binds: (string | number)[] = [userId, cutoff];

  if (status) {
    query += " AND status = ?";
    binds.push(status);
  }

  query += " ORDER BY due_at ASC";

  const rows = await db.prepare(query).bind(...binds).all<DbBill>();
  return rows.results.map(toBill);
}

export async function upsertBills(
  db: D1Database,
  bills: Omit<Bill, "id" | "createdAt">[]
): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  const stmts = bills.map((b) =>
    db
      .prepare(
        "INSERT OR IGNORE INTO bills (id, user_id, name, amount_cents, due_at, status, paid_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .bind(generateId("bill"), b.userId, b.name, b.amountCents, b.dueAt, b.status, b.paidAt, now)
  );
  await db.batch(stmts);
}

export async function updateBillSmartPay(
  db: D1Database,
  id: string,
  userId: string,
  patch: {
    gracePeriodDays?: number;
    lateFeeCents?: number;
    paymentRail?: string;
    smartPayEnabled?: boolean;
    billerCategory?: string;
  }
): Promise<boolean> {
  const sets: string[] = [];
  const binds: (string | number)[] = [];

  if (patch.gracePeriodDays !== undefined) { sets.push("grace_period_days = ?"); binds.push(patch.gracePeriodDays); }
  if (patch.lateFeeCents !== undefined) { sets.push("late_fee_cents = ?"); binds.push(patch.lateFeeCents); }
  if (patch.paymentRail !== undefined) { sets.push("payment_rail = ?"); binds.push(patch.paymentRail); }
  if (patch.smartPayEnabled !== undefined) { sets.push("smart_pay_enabled = ?"); binds.push(patch.smartPayEnabled ? 1 : 0); }
  if (patch.billerCategory !== undefined) { sets.push("biller_category = ?"); binds.push(patch.billerCategory); }

  if (sets.length === 0) return true;

  binds.push(id, userId);
  const result = await db
    .prepare(`UPDATE bills SET ${sets.join(", ")} WHERE id = ? AND user_id = ?`)
    .bind(...binds)
    .run();
  return result.meta.changes > 0;
}

export async function markBillPaid(
  db: D1Database,
  id: string,
  userId: string,
  paidAt: number
): Promise<boolean> {
  const result = await db
    .prepare("UPDATE bills SET status = 'paid', paid_at = ? WHERE id = ? AND user_id = ? AND status = 'pending'")
    .bind(paidAt, id, userId)
    .run();
  return result.meta.changes > 0;
}

// ─── Yield ────────────────────────────────────────────────────────────────────

export async function getOrCreateYieldPosition(
  db: D1Database,
  userId: string
): Promise<{ balanceCents: number; apyBasisPoints: number; totalEarnedCents: number; updatedAt: number }> {
  const existing = await db
    .prepare("SELECT balance_cents, apy_basis_points, total_earned_cents, updated_at FROM yield_positions WHERE user_id = ?")
    .bind(userId)
    .first<DbYield>();

  if (existing) return toYieldPosition(existing);

  const now = Math.floor(Date.now() / 1000);
  await db
    .prepare("INSERT INTO yield_positions (id, user_id, balance_cents, apy_basis_points, total_earned_cents, updated_at) VALUES (?, ?, 0, 450, 0, ?)")
    .bind(generateId("yld"), userId, now)
    .run();

  return { balanceCents: 0, apyBasisPoints: 450, totalEarnedCents: 0, updatedAt: now };
}

export async function updateYieldBalance(
  db: D1Database,
  userId: string,
  delta: number
): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  await db
    .prepare("UPDATE yield_positions SET balance_cents = balance_cents + ?, updated_at = ? WHERE user_id = ?")
    .bind(delta, now, userId)
    .run();
}

// ─── Agent Actions ─────────────────────────────────────────────────────────────

export async function insertAgentAction(
  db: D1Database,
  action: {
    userId: string;
    actionType: string;
    description: string;
    payload: Record<string, unknown>;
    approvalStatus?: "auto_approved" | "pending" | "approved" | "rejected";
    riskLevel?: "low" | "medium" | "high" | "critical";
    amountCents?: number;
    reasoning?: string;
  }
): Promise<string> {
  const id = generateId("act");
  const now = Math.floor(Date.now() / 1000);
  const undoExpiresAt = now + 24 * 60 * 60; // 24-hour undo window
  const approvalStatus = action.approvalStatus ?? "auto_approved";
  const status = approvalStatus === "pending" ? "pending" : "completed";

  await db
    .prepare(
      `INSERT INTO agent_actions
        (id, user_id, action_type, description, payload, status,
         approval_status, risk_level, amount_cents, reasoning, undo_expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      action.userId,
      action.actionType,
      action.description,
      JSON.stringify(action.payload),
      status,
      approvalStatus,
      action.riskLevel ?? "low",
      action.amountCents ?? 0,
      action.reasoning ?? "",
      undoExpiresAt,
      now
    )
    .run();
  return id;
}

export async function getAgentActions(
  db: D1Database,
  userId: string
): Promise<Array<{ id: string; actionType: string; description: string; status: string; createdAt: number; reversedAt: number | null }>> {
  const rows = await db
    .prepare(
      "SELECT id, action_type, description, status, created_at, reversed_at FROM agent_actions WHERE user_id = ? ORDER BY created_at DESC LIMIT 50"
    )
    .bind(userId)
    .all<{ id: string; action_type: string; description: string; status: string; created_at: number; reversed_at: number | null }>();

  return rows.results.map((r) => ({
    id: r.id,
    actionType: r.action_type,
    description: r.description,
    status: r.status,
    createdAt: r.created_at,
    reversedAt: r.reversed_at,
  }));
}

export async function reverseAgentAction(
  db: D1Database,
  id: string,
  userId: string
): Promise<boolean> {
  const now = Math.floor(Date.now() / 1000);
  // Use undo_expires_at if set (24h window), fallback to checking created_at + 24h
  const result = await db
    .prepare(
      `UPDATE agent_actions SET status = 'reversed', reversed_at = ?
       WHERE id = ? AND user_id = ? AND status = 'completed'
         AND (undo_expires_at IS NULL OR undo_expires_at > ?)
         AND (undo_expires_at IS NOT NULL OR created_at >= ?)`
    )
    .bind(now, id, userId, now, now - 24 * 60 * 60)
    .run();
  return result.meta.changes > 0;
}

export async function getPendingActions(
  db: D1Database,
  userId: string
): Promise<Array<{ id: string; actionType: string; description: string; amountCents: number; reasoning: string; riskLevel: string; approvalExpiresAt: number | null; createdAt: number }>> {
  const rows = await db
    .prepare(
      `SELECT id, action_type, description, amount_cents, reasoning, risk_level,
              approval_expires_at, created_at
       FROM agent_actions
       WHERE user_id = ? AND approval_status = 'pending' AND status = 'pending'
       ORDER BY created_at DESC`
    )
    .bind(userId)
    .all<{ id: string; action_type: string; description: string; amount_cents: number; reasoning: string; risk_level: string; approval_expires_at: number | null; created_at: number }>();

  return rows.results.map((r) => ({
    id: r.id,
    actionType: r.action_type,
    description: r.description,
    amountCents: r.amount_cents,
    reasoning: r.reasoning,
    riskLevel: r.risk_level,
    approvalExpiresAt: r.approval_expires_at,
    createdAt: r.created_at,
  }));
}

export async function approveAction(db: D1Database, id: string, userId: string): Promise<boolean> {
  const now = Math.floor(Date.now() / 1000);
  const undoExpiresAt = now + 24 * 60 * 60;
  const result = await db
    .prepare(
      `UPDATE agent_actions
       SET approval_status = 'approved', status = 'completed', undo_expires_at = ?
       WHERE id = ? AND user_id = ? AND approval_status = 'pending'`
    )
    .bind(undoExpiresAt, id, userId)
    .run();
  return result.meta.changes > 0;
}

export async function rejectAction(db: D1Database, id: string, userId: string): Promise<boolean> {
  const result = await db
    .prepare(
      `UPDATE agent_actions
       SET approval_status = 'rejected', status = 'reversed'
       WHERE id = ? AND user_id = ? AND approval_status = 'pending'`
    )
    .bind(id, userId)
    .run();
  return result.meta.changes > 0;
}

// ─── Conversations ─────────────────────────────────────────────────────────────

export async function getConversation(
  db: D1Database,
  id: string,
  userId: string
): Promise<{ id: string; messages: unknown[]; updatedAt: number } | null> {
  const row = await db
    .prepare("SELECT id, messages, updated_at FROM conversations WHERE id = ? AND user_id = ?")
    .bind(id, userId)
    .first<{ id: string; messages: string; updated_at: number }>();
  if (!row) return null;
  return { id: row.id, messages: JSON.parse(row.messages) as unknown[], updatedAt: row.updated_at };
}

export async function upsertConversation(
  db: D1Database,
  userId: string,
  conversationId: string | null,
  messages: unknown[]
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const id = conversationId ?? generateId("conv");

  if (conversationId) {
    await db
      .prepare("UPDATE conversations SET messages = ?, updated_at = ? WHERE id = ? AND user_id = ?")
      .bind(JSON.stringify(messages), now, id, userId)
      .run();
  } else {
    await db
      .prepare("INSERT INTO conversations (id, user_id, messages, created_at, updated_at) VALUES (?, ?, ?, ?, ?)")
      .bind(id, userId, JSON.stringify(messages), now, now)
      .run();
  }
  return id;
}

// ─── DB row → domain type mappers ─────────────────────────────────────────────

type DbAccount = {
  id: string; user_id: string; name: string; institution: string;
  account_type: string; balance_cents: number; currency: string;
  last_synced_at: number | null; created_at: number;
};

type DbTransaction = {
  id: string; account_id: string; user_id: string; amount_cents: number;
  description: string; merchant_name: string | null; category: string | null;
  is_recurring: number; recurring_id: string | null;
  transacted_at: number; created_at: number;
};

type DbSubscription = {
  id: string; user_id: string; merchant_name: string; amount_cents: number;
  billing_cycle: string; last_charged_at: number | null; next_expected_at: number | null;
  status: string; last_used_at: number | null; created_at: number;
};

type DbBill = {
  id: string; user_id: string; name: string; amount_cents: number;
  due_at: number; status: string; paid_at: number | null; created_at: number;
  grace_period_days: number; late_fee_cents: number; payment_rail: string;
  smart_pay_enabled: number; biller_category: string;
};

type DbYield = {
  balance_cents: number; apy_basis_points: number;
  total_earned_cents: number; updated_at: number;
};

function toAccount(r: DbAccount): Account {
  return {
    id: r.id, userId: r.user_id, name: r.name, institution: r.institution,
    accountType: r.account_type as Account["accountType"],
    balanceCents: r.balance_cents, currency: r.currency,
    lastSyncedAt: r.last_synced_at, createdAt: r.created_at,
  };
}

function toTransaction(r: DbTransaction): Transaction {
  return {
    id: r.id, accountId: r.account_id, userId: r.user_id,
    amountCents: r.amount_cents, description: r.description,
    merchantName: r.merchant_name, category: r.category,
    isRecurring: r.is_recurring === 1, recurringId: r.recurring_id,
    transactedAt: r.transacted_at, createdAt: r.created_at,
  };
}

function toSubscription(r: DbSubscription): Subscription {
  return {
    id: r.id, userId: r.user_id, merchantName: r.merchant_name,
    amountCents: r.amount_cents, billingCycle: r.billing_cycle as Subscription["billingCycle"],
    lastChargedAt: r.last_charged_at, nextExpectedAt: r.next_expected_at,
    status: r.status as Subscription["status"],
    lastUsedAt: r.last_used_at, createdAt: r.created_at,
  };
}

function toBill(r: DbBill): Bill {
  return {
    id: r.id, userId: r.user_id, name: r.name, amountCents: r.amount_cents,
    dueAt: r.due_at, status: r.status as Bill["status"],
    paidAt: r.paid_at, createdAt: r.created_at,
    gracePeriodDays: r.grace_period_days ?? 0,
    lateFeeCents: r.late_fee_cents ?? 0,
    paymentRail: (r.payment_rail ?? "ach") as Bill["paymentRail"],
    smartPayEnabled: (r.smart_pay_enabled ?? 1) === 1,
    billerCategory: (r.biller_category ?? "utility") as Bill["billerCategory"],
  };
}

function toYieldPosition(r: DbYield) {
  return {
    balanceCents: r.balance_cents,
    apyBasisPoints: r.apy_basis_points,
    totalEarnedCents: r.total_earned_cents,
    updatedAt: r.updated_at,
  };
}
