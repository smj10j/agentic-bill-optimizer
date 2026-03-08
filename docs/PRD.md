# Product Requirements Document — Orbit

**Version**: 0.1 (MVP Draft)
**Status**: 🟡 In Progress

---

## Vision

Orbit is an AI financial autopilot. It makes your money work harder for you by handling the tedious, high-friction parts of personal finance automatically — paying bills at the right time, identifying savings opportunities, killing unused subscriptions, and earning yield on idle cash — all surfaced in plain English with full transparency.

Users should feel like they have a personal CFO in their pocket. The infrastructure that powers it (programmable money, instant settlement, yield protocols) is invisible. Users see dollars and clear explanations. Never jargon.

---

## Target Users

**Primary**: Digitally-native consumers who:
- Live paycheck-to-paycheck or have modest emergency savings
- Are fee-sensitive and value every dollar
- Want to optimize but don't have time or expertise
- Trust mobile-first experiences with their financial data

**Secondary**: Anyone who wants their financial life on autopilot and doesn't want to manually track bills, subscriptions, or opportunities.

---

## Core Problems We Solve

1. **Idle cash loses value** — Money sitting in a checking account earns nothing; Orbit puts it to work while keeping it accessible.
2. **Bills are paid late (or overpaid)** — Users miss due dates or pay too much; Orbit times payments optimally and flags rate reduction opportunities.
3. **Subscription sprawl** — Users pay for services they forgot about; Orbit tracks and flags unused subscriptions.
4. **Deals are missed** — Savings opportunities (cashback, price drops, offers) exist but require constant attention; Orbit surfaces them automatically.
5. **Financial advice is reactive** — Most apps tell you what happened; Orbit tells you what to do next and does it (with permission).

---

## MVP Feature Set

### Phase 1: Foundation (MVP)
| Feature | Status | Description |
|---|---|---|
| User auth | 🔲 Planned | Email + password, JWT sessions |
| Account linking (mock) | 🔲 Planned | Connect financial accounts via mock Plaid-style adapter |
| Transaction feed | 🔲 Planned | View recent transactions, categorized |
| Spending analysis | 🔲 Planned | AI-powered summary of spending patterns |
| Subscription tracker | 🔲 Planned | Detect recurring charges, flag unused ones |
| Bill management | 🔲 Planned | View upcoming bills, pay with one tap |
| AI chat interface | 🔲 Planned | Ask questions, get actions from the AI agent |
| Yield dashboard | 🔲 Planned | Show idle cash earning yield (mock → real) |

### Phase 2: Automation
| Feature | Status | Description |
|---|---|---|
| Autopilot toggle | 🔲 Planned | Let agent act autonomously within user-set limits |
| Auto bill pay | 🔲 Planned | Agent pays bills at optimal time automatically |
| Auto subscription cancel | 🔲 Planned | Agent cancels unused subs with one-tap approval |
| Deal finder | 🔲 Planned | Surface offers and cashback relevant to user spending |
| Programmable money rules | 🔲 Planned | "When balance > X, sweep to yield wallet" |

### Phase 3: Integrations
| Feature | Status | Description |
|---|---|---|
| Real account linking | 🔲 Planned | Plaid or equivalent real integration |
| Real stablecoin settlement | 🔲 Planned | Circle USDC for yield and instant settlement |
| Merchant APIs | 🔲 Planned | Direct deal integrations |
| Notifications | 🔲 Planned | Push + email for key events |

---

## Non-Goals (MVP)

- Crypto trading or investment products
- Business / SMB features
- Tax optimization
- International (USD only for MVP)

---

## User Stories

### Auth
- As a user, I can sign up with email and password so I can access my Orbit account.
- As a user, I can log in and stay logged in across sessions.

### Financial Overview
- As a user, I can see a dashboard of my accounts, balances, and recent activity.
- As a user, I can see my spending broken down by category.

### AI Agent
- As a user, I can ask the AI agent questions about my finances in plain English.
- As a user, I can ask the agent to explain any transaction or pattern.
- As a user, the agent proactively surfaces insights ("You're spending 23% more on food this month").

### Bills & Subscriptions
- As a user, I can see all my upcoming bills in one place.
- As a user, I can see all my subscriptions with last-used dates.
- As a user, I can cancel a subscription with one tap (agent handles it).

### Yield
- As a user, I can see how much my idle cash is earning.
- As a user, I can set a minimum "float" to keep available and sweep the rest to yield.

### Autopilot
- As a user, I can enable Autopilot mode with spending limits.
- As a user, every action the agent takes is logged and explainable in plain English.
- As a user, I can reverse any agent action within a grace period.

---

## Success Metrics (MVP)

| Metric | Target |
|---|---|
| User activation (completes account link) | >60% of signups |
| D7 retention | >40% |
| Actions taken via agent | >2 per user per week |
| Avg savings identified per user/mo | >$20 |
| Time to first insight | <2 minutes from signup |

---

## Design Principles

1. **Transparency over magic** — Every action is explainable. No black boxes.
2. **User in control** — Agent suggests, user approves (or sets blanket approval with limits).
3. **Dollars, not jargon** — Never expose underlying infrastructure to users.
4. **Progressive trust** — Start with advice, earn trust, unlock automation.
5. **Mobile-first** — Primary experience is on phone; desktop is secondary.
