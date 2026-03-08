# PRD-044 — Settings & Configuration Hub

**Priority**: P0
**Status**: In Review
**Last Updated**: 2026-03-08
**Registry**: [REGISTRY.md](./REGISTRY.md)

---

## Vision

Settings shouldn't be where features go to die. Every configuration surface in Orbit — autopilot guardrails, notification preferences, connected accounts, profile, security — needs a coherent, navigable home that feels like a control panel, not a graveyard. Good settings design means users can find what they need, trust what they see, and leave feeling more in control than when they arrived.

---

## Problem Statement

After implementing PRD-002 (Autopilot), PRD-005 (Account Linking), and PRD-006 (Notifications), there is no UI home for their configuration. A user who wants to change their autopilot spending limit, add a second bank account, or turn off weekend notifications has nowhere to go. There is no Settings page in the current application. This is both a navigation dead end and a trust gap — if users can't see and modify what Orbit is doing, they won't feel safe enabling its more powerful features.

---

## Navigation Entry Points

Settings is accessible via:
1. Bottom nav "More" tab → Settings
2. Dashboard Autopilot card → "Edit" → Autopilot Settings section
3. Notification tap → deep link to Notification Settings section
4. Account connection card → deep link to Accounts section
5. Profile avatar / initials in top-right corner

---

## Settings Sections

### 1. Autopilot

**Path**: Settings → Autopilot

Controls all PRD-002 configuration. This is the most important settings section — the place where users define how much trust they give Orbit.

**Autopilot Master Toggle**
```
Autopilot                    [●  ON ]
Orbit handles routine actions within your limits
```

When toggled off: confirmation dialog ("Are you sure? Orbit will stop taking any automatic actions") with "Pause for..." options: 1 hour / Tonight / 1 week / Permanently. Pause is preferred over permanent off.

**Autonomy Tier**
```
How much should Orbit handle?

  ○  Just suggestions  — I'll take all actions
  ●  Notify & Do       — Act first, tell me right away
  ○  Supervised        — Act within limits, daily digest
  ○  Full autopilot    — Handle everything, weekly review
```

Changing to a higher tier requires step-up auth (Face ID / passkey / 2FA).

**Spending Limits**
```
Daily limit           $──────────●──  $500
Single action limit   $──●───────────  $200

Per-category limits:
  Bill payment         $500      [Edit]
  Yield sweep (out)    $1,000    [Edit]
  Subscription cancel  Requires approval  [Edit]
```

**Always Require Approval**
```
Always ask me before:
  [x] Any new biller (never paid before)
  [x] Single actions over $500
  [ ] Subscription cancellations
  [ ] Yield sweeps
```

**Whitelist / Blacklist**
```
Always handle automatically:
  + Add biller

Never handle automatically:
  Mortgage (Chase)     [Remove]
  + Add biller
```

**Undo Window**
```
Undo window duration
  ● 24 hours  ○ 12 hours  ○ 4 hours
```

Users can shorten but not extend the undo window (backend enforces the maximum).

---

### 2. Accounts

**Path**: Settings → Accounts

Controls all PRD-005 linked accounts.

**Linked Accounts List**
```
Chase Bank                               Healthy ●
  Checking ····4821     $3,247.18
  Savings ····9043        $850.00
                          [Refresh] [Disconnect]

Capital One                              Healthy ●
  Visa ····7732          -$1,420 balance
                          [Refresh] [Disconnect]

+ Add account
```

Each account shows:
- Institution name + logo
- Account type + last 4 digits
- Current balance (from last sync) with timestamp
- Connection status indicator: ● Healthy / ⚠️ Degraded / 🔴 Error / 🔄 Syncing
- Actions: Refresh balance, View transactions, Disconnect

**Primary Account**
```
Primary account (for yield sweeps & bill pay):
  ● Chase Checking ····4821
  ○ Chase Savings ····9043
```

**Add Account**
- Opens Plaid Link flow inline (no new page)
- On success: account appears immediately in list with "Syncing..." state

**Disconnect Flow**
"Disconnect Chase?" → explains what happens: stops syncing, data retained 90 days, Orbit stops managing bills from this account. [Disconnect] [Cancel]

---

### 3. Notifications

**Path**: Settings → Notifications

Controls all PRD-006 notification preferences.

**Category Toggles**
```
Critical alerts          Always on        (cannot disable)

Agent actions            [●  ON ]  Push · Email
Bill reminders           [●  ON ]  Push · Email
Unusual charges          [●  ON ]  Push · Email
Insights & savings       [●  ON ]  Push
Yield updates            [○ OFF ]  Push
Weekly digest            [●  ON ]  Email
```

Per-category: user can disable non-critical categories and configure channel (push vs email vs both).

**Quiet Hours**
```
Quiet hours
  10:00 PM  to  8:00 AM  [Edit]
  Timezone: Pacific (PT)         [Change]

Override for critical alerts:  [○ OFF ]
```

**Notification Channels**
```
Push notifications               Active ●
  Chrome on MacBook Pro
  Safari on iPhone (PWA)         [Manage]

Email                            Active ●
  alex@example.com               [Change]
```

Install PWA prompt if push is not available (non-PWA iOS Safari):
```
Install Orbit to enable push on iPhone →
[Add to Home Screen guide]
```

**Test Notification**
"Send a test notification" button — sends a push + email immediately. Useful for confirming setup.

---

### 4. Profile & Security

**Path**: Settings → Profile

```
Name             Alex Johnson        [Edit]
Email            alex@example.com    [Edit]
Timezone         Pacific (US/PT)     [Edit]
Member since     March 2026
```

**Security**
```
Password                            [Change]
Two-factor auth              Off    [Enable] ← links to PRD-015
Active sessions              2      [View & revoke]
```

Active sessions shows: device name, last active, location (approximate), [Revoke] per session.

**Data & Privacy**
```
Download my data                    [Request]
Delete my account                   [Delete account]
```

Delete account: multi-step confirmation, explains what happens (data deleted within 30 days, Plaid tokens revoked, emails stopped), requires password re-entry.

---

### 5. Orbit Intelligence

**Path**: Settings → Intelligence

Controls the AI agent's behavior — an advanced section for power users.

**Agent Memory** (links to PRD-020 when implemented)
```
Agent memory          Off (coming soon)
The agent will remember your goals and preferences
across conversations
```

**Insight Preferences**
```
Insight categories:
  [x] Savings opportunities
  [x] Risk alerts
  [x] Spending patterns
  [x] Yield opportunities
  [ ] Benchmark comparisons
      (compare my spending to others like me)

Minimum dollar impact to show:
  $──────●──────  $5
  (Only show insights worth at least $5)
```

**Agent Tone**
```
How should the agent communicate?
  ● Concise — brief, direct answers
  ○ Detailed — full explanations
  ○ Coaching — teach me as we go
```

---

### 6. About & Legal

**Path**: Settings → About

```
Orbit v0.1.0
© 2026 Orbit

Privacy Policy          [→]
Terms of Service        [→]
Security                [→]
Open source credits     [→]
Send feedback           [→]
```

---

## Design Principles for Settings

1. **Progressive disclosure**: Show defaults prominently; hide advanced options in expandable sections. Most users should find what they need in 2 taps.
2. **Show current state**: Every toggle, slider, and option shows its current value. Never make users wonder what's active.
3. **Explain the impact**: A short subtext under each meaningful option explains what it does. No mystery settings.
4. **Confirm dangerous actions**: Disconnect account, delete account, disable autopilot — all require a confirmation step with plain-English consequences.
5. **Immediate feedback**: Setting changes take effect immediately (optimistic UI). No "Save" button. Confirmation toast on significant changes: "Autopilot spending limit updated to $300."

---

## Navigation & Deep Linking

All settings sections must be deep-linkable from notifications and in-app CTAs:

| Source | Deep Link |
|---|---|
| Autopilot card "Edit" | `/settings/autopilot` |
| "Reconnect account" notification | `/settings/accounts` |
| "Update notification preferences" | `/settings/notifications` |
| "Set up 2FA" security prompt | `/settings/security` |
| Insight "Adjust preferences" | `/settings/intelligence` |

---

## Open Questions — Resolved

**Q: Should settings be a separate page or a drawer/modal?**
A: Separate page with its own route (`/settings/*`). A drawer is appropriate for quick controls, but settings contains enough content and nested navigation that a full page is cleaner. The bottom nav "More" tab is the primary entry point.

**Q: How do we handle settings conflicts — e.g., autopilot is on but all categories are set to "requires approval"?**
A: Show a warning inline: "With all categories set to require approval, Autopilot won't take any automatic actions. Consider switching to Suggestions Only." This is advisory, not blocking — let the user configure how they want.

**Q: Should there be a "Reset to defaults" option?**
A: Yes, per section (not global). "Reset autopilot to defaults" is a clear, bounded action. A global reset is too destructive and too rarely needed to justify the footgun risk.

**Q: Where does the action history / audit trail live?**
A: Not in Settings — it's a primary navigation item ("History" or accessible from the dashboard "Recent Activity" link). Settings is for configuration, not data viewing.

---

## Success Metrics

| Metric | Target |
|---|---|
| Users who visit Settings within first week | >50% |
| Settings section completion (all mandatory fields set) | >80% of active users |
| Avg time to find a specific setting | <30 seconds |
| Settings → configuration change conversion (visited and changed something) | >60% |
| User-reported "I feel in control of Orbit" (survey) | >4.2/5.0 |
| Support requests about "how do I change X" | <5% of active users/month |
