# PRD-050 — Credit Card Reward Optimizer

**Priority**: P1
**Status**: Draft
**Last Updated**: 2026-03-09
**Registry**: [REGISTRY.md](./REGISTRY.md)

---

## Vision

The average US household leaves $400–600 in annual credit card rewards on the table by using the wrong card for each purchase category. Orbit knows every merchant, every category, and which cards the user has — turning reward optimization into a fully automated, zero-friction system.

---

## Problem Statement

Credit card rewards are notoriously complex:
- Cards have different multipliers per category (dining, travel, groceries, gas, streaming)
- Bonus categories rotate quarterly (Chase Freedom, Discover It)
- Welcome bonuses require minimum spend thresholds
- Annual fees must be justified by rewards earned
- Point valuations differ (Chase UR = ~$0.02/point in some redemptions, $0.01 in others)

Most people pick one card and use it for everything, leaving category-specific rewards uncaptured. Even financially savvy people forget to use the right card in the moment.

The fix: Orbit knows the user's cards, knows current purchase patterns, and can proactively recommend or automate the optimal card selection.

---

## Data Sources

### Card Portfolio Detection
From Plaid transaction data, Orbit identifies:
- Which credit cards the user has (from account list + transaction patterns)
- Spending categories per card (what the user currently puts on each card)
- Annual fees, recurring charges (card fee charged annually)

### Reward Structure Database
Maintain a database of major credit card reward structures:
```json
{
  "chase_sapphire_preferred": {
    "multipliers": {
      "travel": 3.0,
      "dining": 3.0,
      "streaming": 3.0,
      "grocery": 3.0,
      "other": 1.0
    },
    "annual_fee_cents": 9500,
    "point_value_cents": 2.0,   // Chase UR redeemed for travel
    "sign_on_bonus": { "points": 60000, "spend_required_cents": 400000, "months": 3 }
  }
}
```

Database covers the top 50 US credit cards. Updated quarterly (manually or via computer use to scrape card landing pages).

### Spending Category Mapping
Map Plaid merchant categories to card reward categories:
- `FOOD_AND_DRINK` → dining
- `TRAVEL` → travel
- `SHOPS > GROCERY_STORES` → grocery
- `SERVICE > CABLE` → streaming/other

---

## Core Features

### 1. Card Usage Optimizer Report
Monthly analysis of optimal card allocation:

> **This month's opportunity: $47 in uncaptured rewards**
> - You put $340 in dining on your basic card (1% back). If you'd used your [Card], you'd have earned 3% — $6.80 vs. $3.40 you actually earned.
> - You put $215 in groceries on [Card A] (1% back). [Card B] gives 4% on groceries — that's $4.30 left on the table.

### 2. Real-Time "Best Card" Recommendation
When Orbit detects a transaction posted, it logs which card was used and evaluates:
- Was the optimal card used?
- If not, show missed rewards in weekly summary

**Proactive version (ideal)**: Before a known upcoming purchase (a regular subscription renewal), suggest: "Your [Streaming Service] renews tomorrow. Your [Card] gives 3× on streaming vs. your current card's 1×. Consider switching the payment method."

### 3. Rotating Category Tracker
Cards like Chase Freedom rotate bonus categories quarterly. Orbit tracks:
- Current quarter's bonus categories for all user cards
- Notifies user at start of each quarter: "Chase Freedom: this quarter's 5% categories are grocery stores and PayPal. Start using it for groceries in January."
- Auto-expires at quarter end with reminder to re-evaluate

### 4. Welcome Bonus Optimizer
When a new card is detected (large new account + early high-spend pattern):
- Track spend toward welcome bonus threshold
- Alert: "You're $800 away from your [Card] welcome bonus ($500 value). You have 2 months to hit it."
- Suggest shifting upcoming purchases to accelerate bonus completion

### 5. Annual Fee Justification Analysis
Annually, for each card with a fee:
- Calculate rewards earned in the past year
- Calculate annual fee
- Net value = rewards − fee
- "Your [Card] earned $340 in rewards. The annual fee is $95. Net value: $245. ✓ Worth keeping."
- For negative net value: "Your [Card] earned $30 in rewards but costs $95/year. Net: −$65. Consider downgrading to no-fee version or cancelling."

### 6. Card Portfolio Recommendation
Based on actual spending patterns, recommend the optimal card portfolio:
- "Given your spending: $X/month dining, $Y/month groceries, $Z/month travel, this 2-card combination would earn approximately $800/year in rewards."
- No specific card names — general category/feature guidance to avoid regulatory issues
- Point to comparison tools (not affiliated) for specific card applications

---

## Reward Valuation Model

Point values are not all equal:
```
actual_reward_cents = points_earned × redemption_value_per_point

// Example:
// Chase UR: $0.0125 (cash back) to $0.02 (travel portal) to $0.025 (transfer partners)
// Amex MR: $0.01 (cash) to $0.02 (transfer partners)
// Capital One Miles: $0.01 (cash) to $0.013 (travel)
```

Orbit uses a conservative "cash back equivalent" valuation by default, with the option to show travel redemption value.

---

## Data Model

```sql
CREATE TABLE user_cards (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  account_id TEXT REFERENCES accounts(id),
  card_slug TEXT NOT NULL,          -- 'chase_sapphire_preferred', etc.
  detected_multipliers TEXT,        -- JSON override if we detected actual offers
  active INTEGER DEFAULT 1,
  annual_fee_cents INTEGER DEFAULT 0,
  annual_fee_date INTEGER,          -- when fee renews
  welcome_bonus_target_cents INTEGER,
  welcome_bonus_spend_cents INTEGER DEFAULT 0,
  welcome_bonus_deadline INTEGER,
  created_at INTEGER NOT NULL
);

CREATE TABLE reward_opportunities (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  transaction_id TEXT REFERENCES transactions(id),
  optimal_card_id TEXT,             -- which card should have been used
  used_card_id TEXT,
  optimal_reward_cents INTEGER,
  actual_reward_cents INTEGER,
  missed_cents INTEGER,
  category TEXT,
  created_at INTEGER NOT NULL
);
```

---

## Monetization Opportunity

Card recommendation is a natural affiliate revenue source:
- When recommending card upgrades or new cards, link through affiliate programs (major card issuers have them)
- Be transparent: "Orbit may receive a referral fee if you apply for this card through our link. This doesn't affect our recommendation."
- Only recommend when genuinely better for the user — trust is the product

---

## Success Metrics

| Metric | Target |
|---|---|
| Avg annual rewards captured increase per user | >$200 |
| Optimal card usage rate (post-activation) | >75% of transactions |
| Welcome bonus completion rate | >80% for users who start |
| Annual fee analysis users who take action | >30% |
| Feature adoption rate among users with 2+ cards | >50% |

---

## Dependencies

- PRD-005 (Real Account Linking) — card portfolio detection from Plaid
- PRD-016 (Anomaly Detection) — shared transaction categorization infrastructure
- PRD-025 (Price Memory) — annual fee tracking
