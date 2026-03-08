# PRD-042 — Dashboard & Home Experience

**Priority**: P0
**Status**: Implemented
**Last Updated**: 2026-03-08
**Registry**: [REGISTRY.md](./REGISTRY.md)

---

## Vision

The dashboard is the product's face. It's the first screen users see every day, the surface that answers "how am I doing?", and the control center for everything Orbit is doing on their behalf. After implementing PRD-002–007, the home screen needs to integrate insights, autopilot status, pending approvals, bill timing, and yield — all without overwhelming the user. The design principle: *ambient clarity*. The user should understand their financial situation in 5 seconds and know exactly what needs attention.

---

## Problem Statement

The current `DashboardPage.tsx` was designed around static mock data with a flat list of accounts, bills, and subscriptions. It has no concept of autopilot state, pending action approvals, proactive insights, smart bill timing status, or yield performance. After the P0 features are implemented, a user landing on this screen would see none of the intelligence Orbit is running on their behalf. The home experience needs a complete redesign that surfaces the right information at the right hierarchy without requiring the user to navigate to five different pages to understand their situation.

---

## Information Architecture

### Primary Hierarchy (always visible above the fold)
1. **Net Worth / Balance Bar** — total liquid cash + yield position; trend vs. last month
2. **Action Required** — pending approvals, reconnection alerts, bills at risk (zero-to-one cards; only shown when needed)
3. **Active Insights** — top 1–2 unread insights with primary CTA; "see all" link to insights feed

### Secondary (visible with one scroll)
4. **Autopilot Status Card** — what Orbit is handling; quick enable/configure link
5. **Upcoming Bills** — next 5–7 days with smart pay status badges
6. **Yield Snapshot** — current APY, balance in yield, earnings this month
7. **Recent Activity** — last 5 agent actions or transactions

### Tertiary (bottom of page or secondary tab)
8. **Spending Pulse** — current month vs. average, by top category
9. **Subscriptions at Risk** — unused subscriptions needing review (if any)

---

## Component Specifications

### 1. Net Worth Bar

```
┌──────────────────────────────────────────┐
│  $4,832.17                    ▲ +$127 mo │
│  Total available                          │
│  Checking $3,247  ·  Yield $1,585        │
└──────────────────────────────────────────┘
```

- Shows sum of all linked checking + savings + yield positions
- Excludes credit card balances (not "available cash")
- Month-over-month delta (up/down with color)
- Tap expands to full account breakdown
- Refreshed on app open (Plaid balance API); stale indicator if > 30 min old

### 2. Action Required Cards

Only rendered when there's something requiring attention. Slot holds a maximum of 3 cards (prioritized by urgency):

**Approval card** (agent action needs user sign-off):
```
┌──────────────────────────────────────────┐
│  ⏳  Action needs your approval           │
│  Pay electric bill · $127.45 · Due Fri   │
│                        [Approve] [Review] │
└──────────────────────────────────────────┘
```

**Risk card** (bill at risk, low balance):
```
┌──────────────────────────────────────────┐
│  ⚠️  Rent due Friday — balance may be low │
│  $1,200 due · Current: $1,047            │
│                    [Move from yield] [OK] │
└──────────────────────────────────────────┘
```

**Connection card** (account needs re-auth):
```
┌──────────────────────────────────────────┐
│  🔗  Chase connection needs attention     │
│  Tap to reconnect in 30 seconds           │
│                              [Reconnect]  │
└──────────────────────────────────────────┘
```

When no action is required, this slot is hidden entirely (not replaced with a placeholder).

### 3. Insights Feed

Renders the top 2 highest-priority unread insights. Each card:
```
┌──────────────────────────────────────────┐
│  💡  You haven't used Gym+ in 7 weeks    │
│  That's $65/month going unused.           │
│              [Cancel subscription] [Keep] │
└──────────────────────────────────────────┘
```

- Insight type icon (💡 savings, ⚠️ risk, 📈 pattern, 💰 yield)
- Title + one-line body
- Primary and secondary CTA
- Swipe to dismiss; thumbs-up/down on long-press
- "3 more insights →" link when more are queued

### 4. Autopilot Status Card

```
┌──────────────────────────────────────────┐
│  🤖  Autopilot: Active                   │
│  Handling bills & yield sweeps           │
│  7 actions taken this week · $4.80 saved │
│                    [View history] [Edit]  │
└──────────────────────────────────────────┘
```

States:
- **Active**: shows tier name, actions taken this week, savings delivered
- **Partially active**: "Autopilot is on for bills only — enable yield sweeps?"
- **Off**: "Turn on Autopilot to let Orbit handle the routine stuff" [Enable]
- **New user**: "Set up Autopilot" with one-tap preset selection

### 5. Upcoming Bills Timeline

Compact timeline view (not a list) showing the next 7 days:

```
Today        Thu          Fri          Mon
  │           │            │             │
  ·        Electric     Spotify       Rent
             $127          $17         $1200
           [Smart✓]     [Auto✓]      [⚠️ Review]
```

Status badges:
- `Smart ✓` — Orbit will pay at optimal time
- `Auto ✓` — existing bank autopay handles it
- `Manual` — user pays this manually
- `⚠️ Review` — attention needed (low balance, near due date)
- `Paid ✓` — already settled

Tap any bill → bill detail sheet with smart timing explanation and payment controls.

### 6. Yield Snapshot

```
┌──────────────────────────────────────────┐
│  💰  Yield                   5.12% APY   │
│  $1,585.00 earning                       │
│  +$12.40 this month · +$4.80 this week   │
│                              [Manage →]  │
└──────────────────────────────────────────┘
```

### 7. Recent Activity

Last 5 events from the agent_actions + transactions feed, newest first:
- Agent actions: "Paid electric bill $127" (with undo link if within window)
- Transaction: "Starbucks $6.40"
- Insight acted on: "Cancelled Gym+ — saving $65/mo"

"See all →" links to full action history / transaction feed.

### 8. Spending Pulse

Horizontal bar: current month vs. 3-month average per top 3 categories:
```
Dining    ████████████░░  $340 / $243 avg  ▲ 40%
Groceries ████████░░░░░░  $210 / $285 avg  ▼ 26%
Transport ██████░░░░░░░░  $180 / $180 avg  ─
```

Not a full budget view — just a quick pulse. Links to a fuller spending breakdown.

---

## Navigation Structure

Bottom navigation bar (mobile-first):
```
[ Home ] [ Bills ] [ Agent ] [ Yield ] [ More ]
```

- **Home**: Dashboard (this PRD)
- **Bills**: Bills + Subscriptions combined (smart pay, upcoming, subscription tracker)
- **Agent**: Full-screen AI chat (existing AgentPage.tsx)
- **Yield**: Yield dashboard + sweep controls
- **More**: Settings, notifications, insights history, action history

`More` replaces the current scattered page navigation. It's a secondary navigation hub, not a dumping ground — limited to 5–7 items with clear labels.

---

## Empty & Loading States

**First-time user (no linked account):**
```
┌──────────────────────────────────────────┐
│  Welcome to Orbit                         │
│  Connect your bank to get started         │
│  We'll have insights for you in minutes   │
│                          [Add Account]    │
└──────────────────────────────────────────┘
```
Mock "preview" of what the dashboard will look like — blurred/greyed data with "This is what you'll see" overlay.

**Syncing (just linked):**
- Skeleton shimmer on all cards while initial Plaid sync runs
- "Importing your transactions..." progress indicator
- Expected time: 30–60 seconds

**Partial data (some accounts healthy, some erroring):**
- Healthy accounts display normally
- Erroring account shows connection card in Action Required slot
- Overall numbers calculated from healthy accounts only, with disclaimer

---

## Refresh Behavior

- **On app focus**: Refresh balances if stale > 30 minutes; refresh insight queue
- **Pull-to-refresh**: Manual trigger; full data reload
- **Real-time**: Pending approval cards update immediately when agent proposes an action (WebSocket or polling at 30s interval when app is active)

---

## Open Questions — Resolved

**Q: Should net worth include credit card debt?**
A: No for the headline number. Orbit's primary frame is "available cash" not "net worth" — tracking credit card debt as a negative creates anxiety without immediate actionability. A separate "Debt" card is appropriate for users with PRD-018 (Debt Optimizer) enrolled. The headline stays positive and actionable.

**Q: How many insights should be shown on the home screen?**
A: Two maximum. More creates decision paralysis. The goal of the home screen insight feed is to surface the single most important thing, not to show everything. The insight detail page handles the full queue.

**Q: Should transactions be shown on the home screen?**
A: Only as part of "Recent Activity" — last 5 entries mixing agent actions and notable transactions. A full transaction feed belongs on a dedicated page. The home screen communicates status and prompts action, not raw data.

**Q: Where does onboarding live vs. the dashboard?**
A: First-run experience is defined in PRD-043 and replaces the dashboard during initial setup. Once the user has at least one linked account and one insight, they transition to the normal dashboard. The dashboard has its own empty state for the pre-link moment.

---

## Success Metrics

| Metric | Target |
|---|---|
| Time to understand financial status on app open | <5 seconds |
| Home screen DAU/MAU ratio | >55% (users who open check the home screen) |
| Action Required card conversion (tapped / shown) | >60% |
| Insight CTA tap rate from home screen | >25% |
| Navigation to 3+ different sections in a session | >40% of sessions |
| User-reported "I understand my finances" (survey) | >4.0/5.0 |
