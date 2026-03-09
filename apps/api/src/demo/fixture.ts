/**
 * PRD-043: Demo Mode fixture data — "Alex" persona.
 * All API routes return this data when the request carries a demo JWT.
 * No D1 reads or writes occur in demo mode.
 */

import type { Account, Transaction, Subscription, Bill } from "@orbit/shared";

export const DEMO_USER_ID = "demo_alex";

const NOW = Math.floor(Date.now() / 1000);
const DAY = 86400;
const WEEK = 7 * DAY;

// ─── Accounts ─────────────────────────────────────────────────────────────────

export const DEMO_ACCOUNTS: Account[] = [
  {
    id: "acc_demo_checking",
    userId: DEMO_USER_ID,
    name: "Checking ····4821",
    institution: "Chase",
    accountType: "checking",
    balanceCents: 324718,
    currency: "USD",
    lastSyncedAt: NOW - 3600,
    createdAt: NOW - 90 * DAY,
    plaidItemId: "plaid_demo_chase",
    plaidAccountId: "chase_checking_demo",
    connectionStatus: "healthy",
    linkedAt: NOW - 90 * DAY,
  },
  {
    id: "acc_demo_savings",
    userId: DEMO_USER_ID,
    name: "Savings ····9043",
    institution: "Capital One",
    accountType: "savings",
    balanceCents: 85000,
    currency: "USD",
    lastSyncedAt: NOW - 3600,
    createdAt: NOW - 90 * DAY,
    plaidItemId: "plaid_demo_capone",
    plaidAccountId: "capone_savings_demo",
    connectionStatus: "healthy",
    linkedAt: NOW - 90 * DAY,
  },
  {
    id: "acc_demo_credit",
    userId: DEMO_USER_ID,
    name: "Visa ····7732",
    institution: "Capital One",
    accountType: "credit",
    balanceCents: -142000,
    currency: "USD",
    lastSyncedAt: NOW - 3600,
    createdAt: NOW - 90 * DAY,
    plaidItemId: "plaid_demo_capone",
    plaidAccountId: "capone_credit_demo",
    connectionStatus: "healthy",
    linkedAt: NOW - 90 * DAY,
  },
];

// ─── Subscriptions ─────────────────────────────────────────────────────────────

export const DEMO_SUBSCRIPTIONS: Subscription[] = [
  {
    id: "sub_demo_netflix",
    userId: DEMO_USER_ID,
    merchantName: "Netflix",
    amountCents: 2299,
    billingCycle: "monthly",
    lastChargedAt: NOW - 5 * DAY,
    nextExpectedAt: NOW + 25 * DAY,
    status: "active",
    lastUsedAt: NOW - 2 * DAY,
    createdAt: NOW - 365 * DAY,
  },
  {
    id: "sub_demo_hulu",
    userId: DEMO_USER_ID,
    merchantName: "Hulu",
    amountCents: 1799,
    billingCycle: "monthly",
    lastChargedAt: NOW - 8 * DAY,
    nextExpectedAt: NOW + 22 * DAY,
    status: "active",
    lastUsedAt: NOW - 6 * WEEK, // KEY INSIGHT: 6 weeks unused
    createdAt: NOW - 365 * DAY,
  },
  {
    id: "sub_demo_spotify",
    userId: DEMO_USER_ID,
    merchantName: "Spotify",
    amountCents: 1199,
    billingCycle: "monthly",
    lastChargedAt: NOW - 3 * DAY,
    nextExpectedAt: NOW + 27 * DAY,
    status: "active",
    lastUsedAt: NOW - DAY,
    createdAt: NOW - 730 * DAY,
  },
  {
    id: "sub_demo_gym",
    userId: DEMO_USER_ID,
    merchantName: "Gym+",
    amountCents: 6499,
    billingCycle: "monthly",
    lastChargedAt: NOW - 12 * DAY,
    nextExpectedAt: NOW + 18 * DAY,
    status: "active",
    lastUsedAt: NOW - 8 * WEEK, // KEY INSIGHT: 8 weeks no check-in
    createdAt: NOW - 730 * DAY,
  },
  {
    id: "sub_demo_dropbox",
    userId: DEMO_USER_ID,
    merchantName: "Dropbox",
    amountCents: 1199,
    billingCycle: "monthly",
    lastChargedAt: NOW - 15 * DAY,
    nextExpectedAt: NOW + 15 * DAY,
    status: "active",
    lastUsedAt: NOW - 3 * DAY,
    createdAt: NOW - 365 * DAY,
  },
  {
    id: "sub_demo_adobe",
    userId: DEMO_USER_ID,
    merchantName: "Adobe Creative Cloud",
    amountCents: 5999,
    billingCycle: "monthly",
    lastChargedAt: NOW - 2 * DAY,
    nextExpectedAt: NOW + 28 * DAY,
    status: "active",
    lastUsedAt: NOW - DAY,
    createdAt: NOW - 730 * DAY,
  },
  {
    id: "sub_demo_linkedin",
    userId: DEMO_USER_ID,
    merchantName: "LinkedIn Premium",
    amountCents: 3999,
    billingCycle: "monthly",
    lastChargedAt: NOW - 7 * DAY,
    nextExpectedAt: NOW + 23 * DAY,
    status: "active",
    lastUsedAt: NOW - 12 * WEEK, // KEY INSIGHT: 3 months no login
    createdAt: NOW - 365 * DAY,
  },
];

// ─── Bills ─────────────────────────────────────────────────────────────────────

export const DEMO_BILLS: Bill[] = [
  {
    id: "bill_demo_rent",
    userId: DEMO_USER_ID,
    name: "Rent",
    amountCents: 145000,
    dueAt: NOW + 6 * DAY,
    status: "pending",
    paidAt: null,
    createdAt: NOW - 30 * DAY,
    gracePeriodDays: 0,
    lateFeeCents: 0,
    paymentRail: "ach",
    smartPayEnabled: true,
    billerCategory: "rent",
  },
  {
    id: "bill_demo_electric",
    userId: DEMO_USER_ID,
    name: "Electric",
    amountCents: 13422,
    dueAt: NOW + 11 * DAY,
    status: "pending",
    paidAt: null,
    createdAt: NOW - 30 * DAY,
    gracePeriodDays: 5,
    lateFeeCents: 1500,
    paymentRail: "ach",
    smartPayEnabled: true,
    billerCategory: "utility",
  },
  {
    id: "bill_demo_internet",
    userId: DEMO_USER_ID,
    name: "Internet",
    amountCents: 7999,
    dueAt: NOW + 14 * DAY,
    status: "pending",
    paidAt: null,
    createdAt: NOW - 30 * DAY,
    gracePeriodDays: 0,
    lateFeeCents: 0,
    paymentRail: "ach",
    smartPayEnabled: true,
    billerCategory: "utility",
  },
  {
    id: "bill_demo_insurance",
    userId: DEMO_USER_ID,
    name: "Car Insurance",
    amountCents: 18700,
    dueAt: NOW + 22 * DAY,
    status: "pending",
    paidAt: null,
    createdAt: NOW - 30 * DAY,
    gracePeriodDays: 28,
    lateFeeCents: 0,
    paymentRail: "ach",
    smartPayEnabled: true,
    billerCategory: "insurance",
  },
  {
    id: "bill_demo_cc_min",
    userId: DEMO_USER_ID,
    name: "Capital One Credit Card",
    amountCents: 2800,
    dueAt: NOW + 9 * DAY,
    status: "pending",
    paidAt: null,
    createdAt: NOW - 30 * DAY,
    gracePeriodDays: 0,
    lateFeeCents: 2900,
    paymentRail: "ach",
    smartPayEnabled: false,
    billerCategory: "credit_card",
  },
];

// ─── Transactions ──────────────────────────────────────────────────────────────

export const DEMO_TRANSACTIONS: Transaction[] = [
  // Subscriptions
  { id: "txn_d1", accountId: "acc_demo_checking", userId: DEMO_USER_ID, amountCents: -1799, description: "HULU", merchantName: "Hulu", category: "Entertainment", isRecurring: true, recurringId: "sub_demo_hulu", transactedAt: NOW - 8 * DAY, createdAt: NOW - 8 * DAY },
  { id: "txn_d2", accountId: "acc_demo_checking", userId: DEMO_USER_ID, amountCents: -2299, description: "NETFLIX.COM", merchantName: "Netflix", category: "Entertainment", isRecurring: true, recurringId: "sub_demo_netflix", transactedAt: NOW - 5 * DAY, createdAt: NOW - 5 * DAY },
  { id: "txn_d3", accountId: "acc_demo_checking", userId: DEMO_USER_ID, amountCents: -1199, description: "SPOTIFY USA", merchantName: "Spotify", category: "Entertainment", isRecurring: true, recurringId: "sub_demo_spotify", transactedAt: NOW - 3 * DAY, createdAt: NOW - 3 * DAY },
  // KEY INSIGHT: Spotify double-charge
  { id: "txn_d4", accountId: "acc_demo_checking", userId: DEMO_USER_ID, amountCents: -1199, description: "SPOTIFY USA", merchantName: "Spotify", category: "Entertainment", isRecurring: true, recurringId: "sub_demo_spotify", transactedAt: NOW - 4 * DAY, createdAt: NOW - 4 * DAY },
  { id: "txn_d5", accountId: "acc_demo_checking", userId: DEMO_USER_ID, amountCents: -6499, description: "GYM+ MEMBERSHIP", merchantName: "Gym+", category: "Health & Fitness", isRecurring: true, recurringId: "sub_demo_gym", transactedAt: NOW - 12 * DAY, createdAt: NOW - 12 * DAY },
  { id: "txn_d6", accountId: "acc_demo_checking", userId: DEMO_USER_ID, amountCents: -5999, description: "ADOBE SYSTEMS", merchantName: "Adobe Creative Cloud", category: "Software", isRecurring: true, recurringId: "sub_demo_adobe", transactedAt: NOW - 2 * DAY, createdAt: NOW - 2 * DAY },
  { id: "txn_d7", accountId: "acc_demo_checking", userId: DEMO_USER_ID, amountCents: -3999, description: "LINKEDIN PREMIUM", merchantName: "LinkedIn Premium", category: "Software", isRecurring: true, recurringId: "sub_demo_linkedin", transactedAt: NOW - 7 * DAY, createdAt: NOW - 7 * DAY },
  { id: "txn_d8", accountId: "acc_demo_checking", userId: DEMO_USER_ID, amountCents: -1199, description: "DROPBOX INC", merchantName: "Dropbox", category: "Software", isRecurring: true, recurringId: "sub_demo_dropbox", transactedAt: NOW - 15 * DAY, createdAt: NOW - 15 * DAY },
  // Dining (spike: 38% above average)
  { id: "txn_d10", accountId: "acc_demo_credit", userId: DEMO_USER_ID, amountCents: -3200, description: "CHIPOTLE", merchantName: "Chipotle", category: "Dining", isRecurring: false, recurringId: null, transactedAt: NOW - 2 * DAY, createdAt: NOW - 2 * DAY },
  { id: "txn_d11", accountId: "acc_demo_credit", userId: DEMO_USER_ID, amountCents: -8700, description: "NOBU RESTAURANT", merchantName: "Nobu", category: "Dining", isRecurring: false, recurringId: null, transactedAt: NOW - 4 * DAY, createdAt: NOW - 4 * DAY },
  { id: "txn_d12", accountId: "acc_demo_credit", userId: DEMO_USER_ID, amountCents: -4500, description: "SHAKE SHACK", merchantName: "Shake Shack", category: "Dining", isRecurring: false, recurringId: null, transactedAt: NOW - 6 * DAY, createdAt: NOW - 6 * DAY },
  { id: "txn_d13", accountId: "acc_demo_credit", userId: DEMO_USER_ID, amountCents: -1250, description: "STARBUCKS", merchantName: "Starbucks", category: "Coffee", isRecurring: false, recurringId: null, transactedAt: NOW - DAY, createdAt: NOW - DAY },
  { id: "txn_d14", accountId: "acc_demo_credit", userId: DEMO_USER_ID, amountCents: -1250, description: "STARBUCKS", merchantName: "Starbucks", category: "Coffee", isRecurring: false, recurringId: null, transactedAt: NOW - 3 * DAY, createdAt: NOW - 3 * DAY },
  { id: "txn_d15", accountId: "acc_demo_credit", userId: DEMO_USER_ID, amountCents: -1250, description: "STARBUCKS", merchantName: "Starbucks", category: "Coffee", isRecurring: false, recurringId: null, transactedAt: NOW - 7 * DAY, createdAt: NOW - 7 * DAY },
  { id: "txn_d16", accountId: "acc_demo_credit", userId: DEMO_USER_ID, amountCents: -5600, description: "DOORDASH", merchantName: "DoorDash", category: "Dining", isRecurring: false, recurringId: null, transactedAt: NOW - 8 * DAY, createdAt: NOW - 8 * DAY },
  { id: "txn_d17", accountId: "acc_demo_credit", userId: DEMO_USER_ID, amountCents: -6800, description: "SUSHI RESTAURANT", merchantName: "Sushi + Co", category: "Dining", isRecurring: false, recurringId: null, transactedAt: NOW - 10 * DAY, createdAt: NOW - 10 * DAY },
  { id: "txn_d18", accountId: "acc_demo_credit", userId: DEMO_USER_ID, amountCents: -9500, description: "THE ITALIAN PLACE", merchantName: "The Italian Place", category: "Dining", isRecurring: false, recurringId: null, transactedAt: NOW - 13 * DAY, createdAt: NOW - 13 * DAY },
  // Groceries
  { id: "txn_d20", accountId: "acc_demo_credit", userId: DEMO_USER_ID, amountCents: -18700, description: "WHOLE FOODS", merchantName: "Whole Foods", category: "Groceries", isRecurring: false, recurringId: null, transactedAt: NOW - 5 * DAY, createdAt: NOW - 5 * DAY },
  { id: "txn_d21", accountId: "acc_demo_credit", userId: DEMO_USER_ID, amountCents: -14200, description: "TRADER JOES", merchantName: "Trader Joe's", category: "Groceries", isRecurring: false, recurringId: null, transactedAt: NOW - 11 * DAY, createdAt: NOW - 11 * DAY },
  // Gas
  { id: "txn_d30", accountId: "acc_demo_credit", userId: DEMO_USER_ID, amountCents: -7200, description: "SHELL", merchantName: "Shell", category: "Gas", isRecurring: false, recurringId: null, transactedAt: NOW - 9 * DAY, createdAt: NOW - 9 * DAY },
  // Historical dining for comparison (30-60 days ago)
  { id: "txn_h1", accountId: "acc_demo_credit", userId: DEMO_USER_ID, amountCents: -4500, description: "CHIPOTLE", merchantName: "Chipotle", category: "Dining", isRecurring: false, recurringId: null, transactedAt: NOW - 35 * DAY, createdAt: NOW - 35 * DAY },
  { id: "txn_h2", accountId: "acc_demo_credit", userId: DEMO_USER_ID, amountCents: -3200, description: "PIZZA PLACE", merchantName: "Pizza Place", category: "Dining", isRecurring: false, recurringId: null, transactedAt: NOW - 38 * DAY, createdAt: NOW - 38 * DAY },
  { id: "txn_h3", accountId: "acc_demo_credit", userId: DEMO_USER_ID, amountCents: -5100, description: "RESTAURANT", merchantName: "Local Bistro", category: "Dining", isRecurring: false, recurringId: null, transactedAt: NOW - 42 * DAY, createdAt: NOW - 42 * DAY },
  { id: "txn_h4", accountId: "acc_demo_credit", userId: DEMO_USER_ID, amountCents: -1250, description: "STARBUCKS", merchantName: "Starbucks", category: "Coffee", isRecurring: false, recurringId: null, transactedAt: NOW - 45 * DAY, createdAt: NOW - 45 * DAY },
  { id: "txn_h5", accountId: "acc_demo_credit", userId: DEMO_USER_ID, amountCents: -7800, description: "DINNER OUT", merchantName: "Nice Restaurant", category: "Dining", isRecurring: false, recurringId: null, transactedAt: NOW - 50 * DAY, createdAt: NOW - 50 * DAY },
  { id: "txn_h6", accountId: "acc_demo_credit", userId: DEMO_USER_ID, amountCents: -3800, description: "LUNCH", merchantName: "Sandwich Shop", category: "Dining", isRecurring: false, recurringId: null, transactedAt: NOW - 55 * DAY, createdAt: NOW - 55 * DAY },
  { id: "txn_h7", accountId: "acc_demo_credit", userId: DEMO_USER_ID, amountCents: -4200, description: "CHIPOTLE", merchantName: "Chipotle", category: "Dining", isRecurring: false, recurringId: null, transactedAt: NOW - 60 * DAY, createdAt: NOW - 60 * DAY },
];

// ─── Insights ─────────────────────────────────────────────────────────────────

export const DEMO_INSIGHTS = [
  {
    id: "ins_demo_gym",
    userId: DEMO_USER_ID,
    type: "unused_subscription",
    category: "savings",
    status: "new",
    title: "Gym+ — unused for 8 weeks",
    body: "You're paying $64.99/month for Gym+ but haven't checked in for 8 weeks. That's $519.92 paid since your last visit.",
    dollarImpactCents: 77988,
    relevanceScore: 82,
    urgency: 54,
    entityType: "subscription",
    entityId: "sub_demo_gym",
    metadata: { merchantName: "Gym+", weeksUnused: 8, monthlyAmountCents: 6499 },
    feedback: null,
    deliveredAt: NOW - 3600,
    viewedAt: null,
    actedAt: null,
    dismissedAt: null,
    expiresAt: NOW + 30 * DAY,
    createdAt: NOW - 3600,
  },
  {
    id: "ins_demo_hulu",
    userId: DEMO_USER_ID,
    type: "unused_subscription",
    category: "savings",
    status: "new",
    title: "Hulu — unused for 6 weeks",
    body: "You haven't used Hulu ($17.99/month) in 6 weeks. That's $215.88/year for a service you're not using.",
    dollarImpactCents: 21588,
    relevanceScore: 72,
    urgency: 48,
    entityType: "subscription",
    entityId: "sub_demo_hulu",
    metadata: { merchantName: "Hulu", weeksUnused: 6, monthlyAmountCents: 1799 },
    feedback: null,
    deliveredAt: NOW - 3600,
    viewedAt: null,
    actedAt: null,
    dismissedAt: null,
    expiresAt: NOW + 30 * DAY,
    createdAt: NOW - 3600,
  },
  {
    id: "ins_demo_linkedin",
    userId: DEMO_USER_ID,
    type: "unused_subscription",
    category: "savings",
    status: "new",
    title: "LinkedIn Premium — 3 months no login",
    body: "You haven't logged into LinkedIn in 3 months but are paying $39.99/month. That's $479.88/year.",
    dollarImpactCents: 47988,
    relevanceScore: 78,
    urgency: 51,
    entityType: "subscription",
    entityId: "sub_demo_linkedin",
    metadata: { merchantName: "LinkedIn Premium", weeksUnused: 12, monthlyAmountCents: 3999 },
    feedback: null,
    deliveredAt: NOW - 3600,
    viewedAt: null,
    actedAt: null,
    dismissedAt: null,
    expiresAt: NOW + 30 * DAY,
    createdAt: NOW - 3600,
  },
  {
    id: "ins_demo_spotify_dupe",
    userId: DEMO_USER_ID,
    type: "duplicate_charge",
    category: "savings",
    status: "new",
    title: "Possible double-charge from Spotify",
    body: "You may have been charged twice by Spotify — $11.99 on two consecutive days. One may be recoverable.",
    dollarImpactCents: 1199,
    relevanceScore: 75,
    urgency: 70,
    entityType: "transaction",
    entityId: "txn_d3",
    metadata: { merchantName: "Spotify", amount1Cents: 1199, amount2Cents: 1199 },
    feedback: null,
    deliveredAt: NOW - 3600,
    viewedAt: null,
    actedAt: null,
    dismissedAt: null,
    expiresAt: NOW + 30 * DAY,
    createdAt: NOW - 3600,
  },
  {
    id: "ins_demo_idle_cash",
    userId: DEMO_USER_ID,
    type: "idle_cash",
    category: "yield",
    status: "new",
    title: "Cash sitting idle in savings",
    body: "You have $850 in savings earning 0.01% APY. Moving it to Orbit Yield at 5.12% APY would earn ~$43/year more.",
    dollarImpactCents: 4300,
    relevanceScore: 65,
    urgency: 40,
    entityType: "account",
    entityId: "acc_demo_savings",
    metadata: { idleCashCents: 85000, annualYieldCents: 4300, apyBasisPoints: 512 },
    feedback: null,
    deliveredAt: NOW - 3600,
    viewedAt: null,
    actedAt: null,
    dismissedAt: null,
    expiresAt: NOW + 30 * DAY,
    createdAt: NOW - 3600,
  },
  {
    id: "ins_demo_dining",
    userId: DEMO_USER_ID,
    type: "spending_spike",
    category: "pattern",
    status: "new",
    title: "Dining spend is up 40% this month",
    body: "You've spent $340 on Dining this month — 40% more than your $243 monthly average. At this pace, you'll finish $97 over your typical spend.",
    dollarImpactCents: 9700,
    relevanceScore: 58,
    urgency: 35,
    entityType: "category",
    entityId: "Dining",
    metadata: { category: "Dining", currentCents: 34000, historicalMonthlyCents: 24300, overPercent: 40 },
    feedback: null,
    deliveredAt: NOW - 3600,
    viewedAt: null,
    actedAt: null,
    dismissedAt: null,
    expiresAt: NOW + 30 * DAY,
    createdAt: NOW - 3600,
  },
];

// ─── Yield Position ───────────────────────────────────────────────────────────

export const DEMO_YIELD = {
  id: "yield_demo",
  userId: DEMO_USER_ID,
  balanceCents: 0,
  apyBasisPoints: 512, // 5.12% APY
  totalEarnedCents: 0,
  updatedAt: NOW,
};

// ─── Autopilot Settings ───────────────────────────────────────────────────────

export const DEMO_AUTOPILOT = {
  enabled: false,
  autonomyTier: "notify_and_do" as const,
  dailyLimitCents: 50000,
  singleActionLimitCents: 20000,
  requireApprovalAboveCents: 20000,
  lastUpdatedAt: NOW - 30 * DAY,
};

// ─── Dashboard Summary ────────────────────────────────────────────────────────
// Must match the shape returned by GET /dashboard/summary in routes/dashboard.ts

export const DEMO_DASHBOARD = {
  balanceSummary: {
    checkingSavingsCents: 324718 + 85000,
    yieldCents: 0,
    totalCents: 324718 + 85000 - 142000,
    lastSyncedAt: NOW - 3600,
    accounts: DEMO_ACCOUNTS.filter((a) => a.accountType === "checking" || a.accountType === "savings"),
  },
  pendingActions: [],
  autopilot: {
    enabled: true,
    tier: 1,
    actionsThisWeek: 0,
  },
  upcomingBills: DEMO_BILLS.filter((b) => b.status === "pending"),
  overdueBills: [],
  yieldSnapshot: {
    balanceCents: DEMO_YIELD.balanceCents,
    apyBasisPoints: DEMO_YIELD.apyBasisPoints,
    totalEarnedCents: DEMO_YIELD.totalEarnedCents,
    monthlyEarningCents: 0,
    weeklyEarningCents: 0,
  },
  recentActivity: [],
  flaggedSubscriptions: DEMO_SUBSCRIPTIONS.filter((s) => ["sub_demo_gym", "sub_demo_hulu", "sub_demo_linkedin"].includes(s.id)),
};

// ─── System prompt context for the agent in demo mode ────────────────────────

export const DEMO_AGENT_CONTEXT = `
You are operating in DEMO MODE with Alex's financial data. Use this data directly — no tool calls needed.

ALEX'S ACCOUNTS:
- Chase Checking ····4821: $3,247.18 (primary)
- Capital One Savings ····9043: $850.00 (earning 0.01% APY — opportunity!)
- Capital One Credit Card ····7732: -$1,420.00 balance, minimum $28 due in 9 days

SUBSCRIPTIONS ($248.93/month total):
- Netflix $22.99/mo — used regularly ✓
- Hulu $17.99/mo — LAST USED 6 WEEKS AGO ⚠️ ($216/yr unused)
- Spotify $11.99/mo — daily use ✓ (ALSO: double-charged last month, $11.99 may be recoverable)
- Gym+ $64.99/mo — LAST CHECK-IN 8 WEEKS AGO ⚠️ ($780/yr, $520 paid since last visit)
- Dropbox $11.99/mo monthly — annual plan saves $24/yr
- Adobe Creative Cloud $59.99/mo — heavy use ✓
- LinkedIn Premium $39.99/mo — LAST LOGIN 3 MONTHS AGO ⚠️ ($480/yr)

UPCOMING BILLS:
- Rent: $1,450 due in 6 days ← urgent
- Credit card minimum: $28 due in 9 days (full balance $1,420 would save ~$28/mo interest)
- Electric: $134.22 due in 11 days (5-day grace period — Orbit will pay optimally)
- Internet: $79.99 due in 14 days
- Car insurance: $187.00 due in 22 days (28-day grace period)

KEY INSIGHTS DETECTED:
1. Gym+ $65/mo — 8 weeks unused. $520 paid since last visit. Cancel saves $780/yr.
2. Hulu $18/mo — 6 weeks unused. Cancel saves $216/yr.
3. LinkedIn Premium $40/mo — 3 months no login. Cancel saves $480/yr.
4. Spotify double-charged in past week. $11.99 potentially recoverable.
5. $850 in savings earning 0.01%. Move to Orbit Yield at 5.12% → +$43/yr.
6. Dining spend $340 this month vs $243 average (40% spike, $97 over).
7. Total wasted subscriptions: ~$1,476/yr if Gym+, Hulu, LinkedIn cancelled.

YIELD OPPORTUNITY: $0 currently in Orbit Yield. $850 savings could earn $43/yr more.

When the user asks what to do, lead with the biggest wins: cancel the 3 unused subscriptions ($1,476/yr savings) and sweep the idle savings to yield ($43/yr).
`.trim();
