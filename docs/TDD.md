# Technical Design Document — Orbit

**Version**: 0.1
**Status**: 🟡 Draft

---

## Architecture Overview

Orbit is a monorepo with three packages deployed to Cloudflare's edge network:

```
┌─────────────────────────────────────────────────────┐
│                    User's Browser                    │
└───────────────────┬─────────────────────────────────┘
                    │ HTTPS
┌───────────────────▼─────────────────────────────────┐
│            Cloudflare Pages (apps/web)               │
│         React 18 + TypeScript + Vite + Tailwind      │
└───────────────────┬─────────────────────────────────┘
                    │ fetch() → REST / SSE
┌───────────────────▼─────────────────────────────────┐
│           Cloudflare Workers (apps/api)              │
│              Hono + TypeScript                        │
│  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐ │
│  │  Auth   │ │  Agent   │ │ Finance  │ │ Deals   │ │
│  │ Routes  │ │  Routes  │ │ Routes   │ │ Routes  │ │
│  └─────────┘ └────┬─────┘ └────┬─────┘ └─────────┘ │
│                   │             │                     │
│  ┌────────────────▼─────────────▼───────────────┐   │
│  │              Service Layer                    │   │
│  │  AgentService │ FinanceService │ YieldService │   │
│  └──────┬────────────────────────────┬──────────┘   │
│         │                            │               │
│  ┌──────▼──────┐          ┌──────────▼────────┐     │
│  │ Anthropic   │          │  Money Interface  │     │
│  │ Claude API  │          │  (mock → USDC)    │     │
│  └─────────────┘          └───────────────────┘     │
└──────────┬──────────────────────┬──────────────────-┘
           │                      │
┌──────────▼──────┐    ┌──────────▼──────────────────┐
│ Cloudflare D1   │    │      Cloudflare KV           │
│ (SQLite / data) │    │  (sessions, cache, rate lim) │
└─────────────────┘    └─────────────────────────────┘
```

---

## Tech Stack Decisions

### Frontend: React 18 + Vite + Tailwind
- **Why React**: Broad ecosystem, good TypeScript support, team familiarity assumed.
- **Why Vite**: Fast dev server, excellent HMR, first-class Cloudflare Pages support.
- **Why Tailwind**: Rapid iteration, consistent design system, no CSS naming overhead.
- **Component library**: shadcn/ui — copy-paste components, full control, Tailwind-based.
- **State**: React Query for server state, Zustand for minimal client state.
- **Routing**: TanStack Router (type-safe, file-based optional).

### Backend: Hono on Cloudflare Workers
- **Why Hono**: Ultralight (<15kb), built for edge runtime, Express-like ergonomics, first-class TypeScript.
- **Why Cloudflare Workers**: Free tier is generous (100k req/day), global edge, no cold starts, D1+KV are native.
- **Alternative considered**: Express on Node (eliminated: not edge-native, cold starts).

### Database: Cloudflare D1
- SQLite at the edge. Perfect for read-heavy financial dashboards.
- Schema migrations via Wrangler D1 migrations.
- For writes that need consistency, we serialize through the Worker.
- **Scaling escape hatch**: D1 → Turso (LibSQL) — same SQLite API, just a connection string change.

### Sessions / Cache: Cloudflare KV
- JWT stored server-side as refresh token + session map.
- Rate limiting state stored in KV.
- AI response caching (where safe) stored in KV with TTL.

### AI Agent: Anthropic Claude API
- Model: `claude-sonnet-4-6` (balance of capability and cost).
- Pattern: Tool use (function calling) for structured agent actions.
- Streaming: Server-Sent Events (SSE) for real-time chat responses.
- Context: Conversation history stored in D1, summarized when long.
- **Agent tools** (MVP):
  - `get_account_summary` — fetch account balances and recent transactions
  - `get_subscriptions` — list detected recurring charges
  - `get_upcoming_bills` — bills due in next 30 days
  - `get_spending_analysis` — categorical breakdown
  - `get_yield_status` — idle cash and current yield
  - `flag_subscription` — mark a subscription for cancellation review
  - `explain_transaction` — AI explanation of a specific transaction

### Programmable Money Interface
An abstraction layer that hides settlement infrastructure. MVP uses a mock implementation. Designed to swap to Circle USDC / real stablecoin rails without changing calling code.

```typescript
interface MoneyInterface {
  getYieldRate(): Promise<number>;                          // APY as decimal
  getYieldBalance(userId: string): Promise<number>;         // in USD cents
  sweepToYield(userId: string, amountCents: number): Promise<TxResult>;
  sweepFromYield(userId: string, amountCents: number): Promise<TxResult>;
  settleBill(userId: string, billId: string): Promise<TxResult>;
}
```

---

## Data Models

### Users
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,          -- nanoid
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL,  -- unix timestamp
  updated_at INTEGER NOT NULL
);
```

### Accounts (linked financial accounts)
```sql
CREATE TABLE accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  institution TEXT NOT NULL,
  account_type TEXT NOT NULL,   -- 'checking' | 'savings' | 'credit'
  balance_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  last_synced_at INTEGER,
  created_at INTEGER NOT NULL
);
```

### Transactions
```sql
CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  amount_cents INTEGER NOT NULL,  -- negative = debit, positive = credit
  description TEXT NOT NULL,
  merchant_name TEXT,
  category TEXT,
  is_recurring INTEGER DEFAULT 0, -- bool
  recurring_id TEXT,              -- links to subscriptions table
  transacted_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
```

### Subscriptions
```sql
CREATE TABLE subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  merchant_name TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  billing_cycle TEXT NOT NULL,    -- 'monthly' | 'annual' | 'weekly'
  last_charged_at INTEGER,
  next_expected_at INTEGER,
  status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'flagged' | 'cancelled'
  last_used_at INTEGER,
  created_at INTEGER NOT NULL
);
```

### Bills
```sql
CREATE TABLE bills (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  due_at INTEGER NOT NULL,        -- unix timestamp
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'paid' | 'overdue'
  paid_at INTEGER,
  created_at INTEGER NOT NULL
);
```

### Agent Conversations
```sql
CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  messages TEXT NOT NULL,         -- JSON array of {role, content}
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
```

### Agent Actions (audit log)
```sql
CREATE TABLE agent_actions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  action_type TEXT NOT NULL,
  description TEXT NOT NULL,      -- plain English explanation
  payload TEXT NOT NULL,          -- JSON
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'completed' | 'reversed'
  reversed_at INTEGER,
  created_at INTEGER NOT NULL
);
```

### Yield Positions
```sql
CREATE TABLE yield_positions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  balance_cents INTEGER NOT NULL DEFAULT 0,
  apy_basis_points INTEGER NOT NULL, -- e.g. 450 = 4.50%
  total_earned_cents INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);
```

---

## API Design

See [API.md](./API.md) for full reference.

Routes follow REST conventions:
- `GET /api/v1/...` — read operations
- `POST /api/v1/...` — create / initiate actions
- `PATCH /api/v1/...` — partial updates
- `DELETE /api/v1/...` — soft deletes only

All responses: `{ data: T, error: null } | { data: null, error: { code: string, message: string } }`

---

## Authentication

- Email + password signup / login
- Passwords hashed with bcrypt (cost 12)
- JWT access tokens (15 min TTL) + refresh tokens (30 day TTL)
- Refresh tokens stored in KV (invalidatable server-side)
- Authorization header: `Bearer <access_token>`

---

## External Integrations

| System | MVP | Production |
|---|---|---|
| Financial data | Mock adapter | Plaid API |
| Money settlement | Mock adapter | Circle USDC API |
| Yield | Mock (fixed 4.5% APY) | Real yield protocol |
| Notifications | None | Cloudflare Email Workers |

All external integrations are accessed through adapter interfaces. Swapping from mock to real requires only a new implementation, not changes to callers.

---

## Deployment

| Environment | Frontend | Backend |
|---|---|---|
| Local dev | Vite dev server (:5173) | Wrangler dev (:8787) |
| Preview | Cloudflare Pages preview | Workers preview |
| Production | Cloudflare Pages (main branch) | Workers (`wrangler deploy`) |

See [README.md](../README.md) for full deploy instructions.

---

## Testing Strategy

- **Unit tests**: Pure functions and service layer logic — Vitest
- **Integration tests**: API route tests with Workers test bindings — Vitest + `@cloudflare/vitest-pool-workers`
- **E2E tests**: Critical user flows — Playwright (Phase 2)
- **No mocking internals** — mock at adapter boundaries (external APIs), not internal functions

---

## Future Considerations

- **Multi-currency**: Architecture stores amounts as cents with explicit currency field. Adding FX requires a rate service + currency display layer only.
- **Real-time sync**: D1 + WebSockets (Cloudflare Durable Objects) for live balance updates.
- **Mobile app**: API is the source of truth; a React Native app is a drop-in consumer.
- **Multi-institution**: Account adapter is interface-based; adding Plaid or MX is additive.
