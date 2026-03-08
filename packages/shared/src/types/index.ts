// ─── API Response Envelope ───────────────────────────────────────────────────

export type ApiSuccess<T> = { data: T; error: null };
export type ApiError = {
  data: null;
  error: { code: string; message: string };
};
export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ─── User ────────────────────────────────────────────────────────────────────

export type User = {
  id: string;
  email: string;
  createdAt: number;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

// ─── Accounts ────────────────────────────────────────────────────────────────

export type AccountType = "checking" | "savings" | "credit";

export type Account = {
  id: string;
  userId: string;
  name: string;
  institution: string;
  accountType: AccountType;
  balanceCents: number;
  currency: string;
  lastSyncedAt: number | null;
  createdAt: number;
};

// ─── Transactions ─────────────────────────────────────────────────────────────

export type Transaction = {
  id: string;
  accountId: string;
  userId: string;
  amountCents: number; // negative = debit, positive = credit
  description: string;
  merchantName: string | null;
  category: string | null;
  isRecurring: boolean;
  recurringId: string | null;
  transactedAt: number;
  createdAt: number;
};

// ─── Subscriptions ────────────────────────────────────────────────────────────

export type BillingCycle = "weekly" | "monthly" | "annual";
export type SubscriptionStatus = "active" | "flagged" | "cancelled";

export type Subscription = {
  id: string;
  userId: string;
  merchantName: string;
  amountCents: number;
  billingCycle: BillingCycle;
  lastChargedAt: number | null;
  nextExpectedAt: number | null;
  status: SubscriptionStatus;
  lastUsedAt: number | null;
  createdAt: number;
};

// ─── Bills ───────────────────────────────────────────────────────────────────

export type BillStatus = "pending" | "paid" | "overdue";

export type Bill = {
  id: string;
  userId: string;
  name: string;
  amountCents: number;
  dueAt: number;
  status: BillStatus;
  paidAt: number | null;
  createdAt: number;
};

// ─── Agent ───────────────────────────────────────────────────────────────────

export type MessageRole = "user" | "assistant";

export type ConversationMessage = {
  role: MessageRole;
  content: string;
  createdAt: number;
};

export type Conversation = {
  id: string;
  userId: string;
  messages: ConversationMessage[];
  createdAt: number;
  updatedAt: number;
};

export type AgentActionStatus = "pending" | "completed" | "reversed";

export type AgentAction = {
  id: string;
  userId: string;
  actionType: string;
  description: string;
  payload: Record<string, unknown>;
  status: AgentActionStatus;
  reversedAt: number | null;
  createdAt: number;
};

// ─── Yield ───────────────────────────────────────────────────────────────────

export type YieldPosition = {
  id: string;
  userId: string;
  balanceCents: number;
  apyBasisPoints: number; // e.g. 450 = 4.50%
  totalEarnedCents: number;
  updatedAt: number;
};
