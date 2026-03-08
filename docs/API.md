# API Reference — Orbit

**Base URL (production)**: `https://api.orbit.workers.dev/api/v1`
**Base URL (local)**: `http://localhost:8787/api/v1`

---

## Response Format

All responses use a consistent envelope:

```json
// Success
{ "data": <payload>, "error": null }

// Error
{ "data": null, "error": { "code": "ERROR_CODE", "message": "Human-readable message" } }
```

### Error Codes
| Code | HTTP Status | Description |
|---|---|---|
| `UNAUTHORIZED` | 401 | Missing or invalid token |
| `FORBIDDEN` | 403 | Authenticated but not authorized for this resource |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 422 | Request body failed validation |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

---

## Authentication

### POST /auth/signup
Create a new account.

**Body**
```json
{ "email": "user@example.com", "password": "min8chars" }
```

**Response**
```json
{
  "data": {
    "user": { "id": "usr_abc", "email": "user@example.com" },
    "accessToken": "<jwt>",
    "refreshToken": "<token>"
  }
}
```

---

### POST /auth/login
Log in with email and password.

**Body**
```json
{ "email": "user@example.com", "password": "..." }
```

**Response**: Same as signup.

---

### POST /auth/refresh
Exchange a refresh token for a new access token.

**Body**
```json
{ "refreshToken": "..." }
```

**Response**
```json
{ "data": { "accessToken": "<new_jwt>" } }
```

---

### POST /auth/logout
Invalidate the current refresh token.

**Headers**: `Authorization: Bearer <access_token>`

**Response**
```json
{ "data": { "success": true } }
```

---

## Accounts

All routes require `Authorization: Bearer <access_token>`.

### GET /accounts
List all linked financial accounts.

**Response**
```json
{
  "data": [
    {
      "id": "acc_abc",
      "name": "Primary Checking",
      "institution": "Demo Bank",
      "accountType": "checking",
      "balanceCents": 425000,
      "currency": "USD",
      "lastSyncedAt": 1709123456
    }
  ]
}
```

---

### POST /accounts/link
Link a new financial account (mock adapter for MVP).

**Body**
```json
{
  "institutionId": "demo_bank",
  "credentials": { "username": "user", "password": "pass" }
}
```

**Response**
```json
{
  "data": {
    "accountsLinked": 2,
    "accounts": [...]
  }
}
```

---

### POST /accounts/:id/sync
Trigger a manual sync for an account.

**Response**
```json
{ "data": { "synced": true, "lastSyncedAt": 1709123456 } }
```

---

## Transactions

### GET /transactions
Get recent transactions across all accounts.

**Query params**
| Param | Type | Description |
|---|---|---|
| `limit` | number | Max results (default 50, max 200) |
| `offset` | number | Pagination offset |
| `accountId` | string | Filter by account |
| `category` | string | Filter by category |
| `from` | number | Unix timestamp (start) |
| `to` | number | Unix timestamp (end) |

**Response**
```json
{
  "data": {
    "transactions": [
      {
        "id": "txn_abc",
        "accountId": "acc_abc",
        "amountCents": -4299,
        "description": "NETFLIX",
        "merchantName": "Netflix",
        "category": "Entertainment",
        "isRecurring": true,
        "transactedAt": 1709000000
      }
    ],
    "total": 143,
    "hasMore": true
  }
}
```

---

### GET /transactions/:id
Get a single transaction.

---

## Subscriptions

### GET /subscriptions
List all detected subscriptions.

**Response**
```json
{
  "data": [
    {
      "id": "sub_abc",
      "merchantName": "Netflix",
      "amountCents": 1799,
      "billingCycle": "monthly",
      "lastChargedAt": 1708000000,
      "nextExpectedAt": 1710619200,
      "status": "active",
      "lastUsedAt": 1706000000
    }
  ]
}
```

---

### PATCH /subscriptions/:id
Update a subscription (flag for cancellation, etc.).

**Body**
```json
{ "status": "flagged" }
```

---

### POST /subscriptions/:id/cancel
Initiate cancellation flow for a subscription.

**Response**
```json
{
  "data": {
    "actionId": "act_abc",
    "description": "Cancellation request sent to Netflix. Effective end of billing period.",
    "status": "pending"
  }
}
```

---

## Bills

### GET /bills
List upcoming bills.

**Query params**: `status` (pending | paid | overdue), `days` (look-ahead window, default 30)

**Response**
```json
{
  "data": [
    {
      "id": "bill_abc",
      "name": "Electric Bill",
      "amountCents": 8750,
      "dueAt": 1709500000,
      "status": "pending"
    }
  ]
}
```

---

### POST /bills/:id/pay
Pay a bill immediately.

**Response**
```json
{
  "data": {
    "actionId": "act_xyz",
    "description": "Paid Electric Bill ($87.50) from Primary Checking.",
    "paidAt": 1709100000
  }
}
```

---

## AI Agent

### POST /agent/chat
Send a message to the AI agent. Returns a stream (SSE) of response tokens.

**Headers**: `Accept: text/event-stream`

**Body**
```json
{
  "message": "How much did I spend on food last month?",
  "conversationId": "conv_abc"   // optional, creates new if omitted
}
```

**Response**: Server-Sent Events stream
```
data: {"type":"token","content":"You "}
data: {"type":"token","content":"spent "}
data: {"type":"token","content":"$342 "}
data: {"type":"action","action":{"type":"get_spending_analysis","result":{...}}}
data: {"type":"done","conversationId":"conv_abc"}
```

---

### GET /agent/conversations
List conversation history.

---

### GET /agent/conversations/:id
Get a conversation with full message history.

---

### GET /agent/actions
Get the agent action audit log (all actions taken on behalf of user).

**Response**
```json
{
  "data": [
    {
      "id": "act_abc",
      "actionType": "bill_payment",
      "description": "Paid Electric Bill ($87.50) from Primary Checking.",
      "status": "completed",
      "createdAt": 1709100000,
      "reversedAt": null
    }
  ]
}
```

---

### POST /agent/actions/:id/reverse
Reverse a recent agent action (within grace period).

**Response**
```json
{ "data": { "reversed": true, "description": "Reversed: Payment of $87.50 refunded." } }
```

---

## Yield

### GET /yield
Get current yield position.

**Response**
```json
{
  "data": {
    "balanceCents": 125000,
    "apyBasisPoints": 450,
    "totalEarnedCents": 5200,
    "displayApy": "4.50%"
  }
}
```

---

### POST /yield/sweep-in
Move idle cash from checking to yield position.

**Body**
```json
{ "amountCents": 50000 }
```

---

### POST /yield/sweep-out
Move funds from yield back to checking.

**Body**
```json
{ "amountCents": 50000 }
```

---

## Dashboard

All endpoints require `Authorization: Bearer <token>`.

### GET /dashboard/summary
Single aggregate endpoint for the home screen. Returns all data needed to render the dashboard in one request.

**Response**
```json
{
  "data": {
    "balanceSummary": {
      "checkingSavingsCents": 324700,
      "yieldCents": 158500,
      "totalCents": 483200,
      "lastSyncedAt": 1709100000,
      "accounts": [{ "id": "...", "name": "Chase Checking", "balanceCents": 324700, "accountType": "checking", ... }]
    },
    "pendingActions": [],
    "autopilot": {
      "enabled": true,
      "tier": 1,
      "actionsThisWeek": 3
    },
    "upcomingBills": [{ "id": "...", "name": "Electric", "amountCents": 8700, "dueAt": 1709200000, "status": "pending", ... }],
    "overdueBills": [],
    "yieldSnapshot": {
      "balanceCents": 158500,
      "apyBasisPoints": 450,
      "totalEarnedCents": 1240,
      "monthlyEarningCents": 594,
      "weeklyEarningCents": 137
    },
    "recentActivity": [{ "id": "...", "actionType": "flag_subscription", "description": "...", "status": "completed", "createdAt": 1709100000, "reversedAt": null }],
    "flaggedSubscriptions": []
  },
  "error": null
}
```

**Notes**:
- `upcomingBills`: bills with `status=pending` due within the next 7 days
- `overdueBills`: bills with `status=pending` and `dueAt` in the past
- `recentActivity`: last 5 agent actions, newest first
- `yieldSnapshot.monthlyEarningCents` / `weeklyEarningCents`: estimated from APY × balance

---

## Autopilot

All endpoints require `Authorization: Bearer <token>`.

### GET /autopilot/settings
Returns the current user's autopilot configuration. Creates default settings on first call.

**Response**
```json
{
  "data": {
    "id": "apt_abc123",
    "userId": "usr_xyz",
    "enabled": false,
    "tier": 0,
    "dailyLimitCents": 50000,
    "singleActionLimitCents": 20000,
    "nightFreezeEnabled": false,
    "nightFreezeStartHour": 22,
    "nightFreezeEndHour": 8,
    "billPaymentLimitCents": 50000,
    "yieldSweepInLimitCents": 100000,
    "yieldSweepOutLimitCents": 50000,
    "requireApprovalSubscriptionCancel": true,
    "alwaysAutopay": [],
    "neverAutopay": [],
    "createdAt": 1709100000,
    "updatedAt": 1709100000
  },
  "error": null
}
```

---

### PUT /autopilot/settings
Partial update of autopilot settings. All fields optional.

**Body** (all fields optional)
```json
{
  "enabled": true,
  "tier": 1,
  "dailyLimitCents": 50000,
  "singleActionLimitCents": 20000,
  "nightFreezeEnabled": false,
  "nightFreezeStartHour": 22,
  "nightFreezeEndHour": 8,
  "billPaymentLimitCents": 50000,
  "yieldSweepInLimitCents": 100000,
  "yieldSweepOutLimitCents": 50000,
  "requireApprovalSubscriptionCancel": true,
  "alwaysAutopay": ["Netflix"],
  "neverAutopay": ["Mortgage Co"]
}
```

**Tiers**: `0` = Suggestions Only, `1` = Notify & Do, `2` = Supervised Autopilot, `3` = Full Autopilot

**Limits**: `dailyLimitCents` max 500000 ($5,000), `singleActionLimitCents` max 200000 ($2,000)

---

### GET /autopilot/trust-score
Returns the user's computed trust score based on their undo rate over 30 days.

**Response**
```json
{
  "data": {
    "score": 70,
    "label": "Getting started",
    "undoRate": 0,
    "totalActions": 0,
    "undoneActions": 0
  },
  "error": null
}
```

**Score labels**: 90–100 → "Highly trusted", 75–89 → "Trusted for routine bills", 60–74 → "Building trust", 40–59 → "Limited trust", <40 → "Low trust — review recent actions", 0 actions → "Getting started"

---

### GET /autopilot/actions/pending
Returns agent actions awaiting user approval.

**Response**
```json
{
  "data": [
    {
      "id": "act_abc123",
      "actionType": "subscription_cancel",
      "description": "Cancel Netflix subscription",
      "amountCents": 1599,
      "reasoning": "No usage detected in 45 days",
      "riskLevel": "medium",
      "approvalExpiresAt": 1709186400,
      "createdAt": 1709100000
    }
  ],
  "error": null
}
```

---

### POST /autopilot/actions/:id/approve
Approve a pending agent action. Sets status to `approved` and starts a 24-hour undo window.

**Response**: `{ "data": { "approved": true }, "error": null }`

**Errors**: `404` if action not found or already resolved.

---

### POST /autopilot/actions/:id/reject
Reject a pending agent action. Sets status to `rejected` (no further execution).

**Response**: `{ "data": { "rejected": true }, "error": null }`

**Errors**: `404` if action not found or already resolved.

---

## Health

### GET /health
Check API health.

**Response** (no auth required)
```json
{ "data": { "status": "ok", "timestamp": 1709100000 } }
```
