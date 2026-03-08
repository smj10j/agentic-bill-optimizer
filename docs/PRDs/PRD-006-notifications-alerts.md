# PRD-006 — Push Notifications & Alerts

**Priority**: P0
**Status**: In Review
**Last Updated**: 2026-03-08
**Registry**: [REGISTRY.md](./REGISTRY.md)

---

## Vision

Orbit should be ambient — always watching, surfacing the right information at the right moment without requiring the user to open the app. Notifications are the delivery mechanism for this ambient intelligence: they make the product feel alive, drive timely action, and prevent costly oversights. Done right, they're a feature users are glad they enabled. Done wrong, they're the reason users delete the app.

---

## Problem Statement

Without notifications, Orbit's value is locked inside the app. A bill due tomorrow, an unusual $200 charge, a $15/month subscription the user forgot about — none of these generate value if the user has to open the app to discover them. Notifications unlock the full ambient-agent proposition: your financial copilot is always paying attention, even when you're not.

---

## Delivery Channels

### Channel Priority Stack

| Channel | Delivery | Use Cases | MVP? |
|---|---|---|---|
| **In-App Feed** | Always available (no opt-in) | All notifications; permanent record | Yes |
| **Web Push** | Browser, service worker | Timely alerts, action requests | Yes |
| **Email** | Transactional email | Critical alerts, weekly digest, fallback | Yes |
| **Mobile Push** | iOS/Android native | All timely alerts | No (deferred until native app) |
| **SMS** | Carrier | Critical only (fraud, failed payment) | No (deferred) |

**Web Push on iOS**: Requires the app to be installed as a PWA (add to home screen). We prompt for this contextually after first meaningful action. Email is the fallback for non-PWA Safari users.

**Email provider**: Resend (Workers-compatible, excellent deliverability, generous free tier). Fallback: Postmark.

---

## Notification Taxonomy

### Critical (always delivered; break through quiet hours)
| Event | Channel | Message Pattern |
|---|---|---|
| Bill due today | Push + Email | "Your electric bill ($127) is due today. [Pay now]" |
| Bill past due | Push + Email | "Your internet bill ($89) was due yesterday. [Pay now]" |
| Insufficient funds for upcoming bill | Push + Email | "You may not have enough for your rent ($1,200) on Friday. [Review]" |
| Unusual large charge detected | Push + Email | "Unusual charge: $340 at [Merchant] — was this you? [Yes] [Dispute]" |
| Orbit action failed | Push + Email | "Your electric bill payment failed. [Retry] [Get help]" |
| Agent action needs approval (high-risk) | Push + Email | "[Action summary] — Needs your approval [Approve] [Reject]" |
| Account connection broken | Push + Email | "Your Chase connection needs attention. [Reconnect]" |

### High Priority (delivered promptly; respect quiet hours)
| Event | Channel | Message Pattern |
|---|---|---|
| Agent action taken (auto-approved) | Push | "Orbit paid your electric bill ($127). [Undo] [View]" |
| Agent action needs approval (medium) | Push | "[Action summary] [Approve] [View]" |
| Subscription price increase detected | Push | "Netflix raised your price by $2/month. [Negotiate] [Cancel] [Ok]" |
| New insight available | Push | "You're spending 40% more on dining this month. [See insight]" |
| Bill due in 3 days | Push | "Electric bill ($127) due Friday. Orbit will pay it optimally. [View]" |

### Normal Priority (batched; can be aggregated)
| Event | Channel | Message Pattern |
|---|---|---|
| Bill paid successfully | Push (batched) | "3 bills paid this week — $342 total. [View]" |
| Yield earnings update | Push (weekly) | "You earned $4.82 in yield this week. [View]" |
| New savings opportunity | Push (batched) | "Orbit found 2 ways to save this week. [View]" |
| Subscription usage insight | In-app only | — |

### Informational (in-app feed only; no push)
- Agent reasoning details
- Historical transaction categorization updates
- Settings confirmations

---

## Notification Preferences

### Default State (for all new users)
| Category | Default |
|---|---|
| Critical alerts | On (cannot be disabled) |
| Agent actions | On |
| Bill reminders | On |
| Unusual charges | On |
| Insights & savings | On |
| Yield updates | Off |
| Marketing/product | Off |

### Preference UI
- Simple category toggles (not a matrix)
- Per-channel override per category (push vs email)
- Quiet hours: start time + end time (default 10pm–8am)
- "Pause all" option with duration: 1 hour / tonight / 1 week

### Anti-Fatigue Rules (enforced server-side, not configurable)
- Max 3 push notifications per day per user (excluding Critical)
- Max 1 "insight" push per day
- Same insight never re-notified within 7 days
- Same biller never notified more than once per day
- If a notification isn't opened in 48 hours, reduce frequency for that category by 50%

---

## Smart Timing

All non-Critical notifications are held and delivered according to:

1. **Timezone**: Detected from browser `Intl.DateTimeFormat`, stored per-user
2. **Quiet hours**: Default 10pm–8am local; user-configurable
3. **Preferred morning time**: Batched low-priority notifications delivered at 9am local (default; adjustable)
4. **Session awareness**: Don't push a notification if the user is actively in the app (show in-app instead)
5. **Delivery window**: If a notification misses its window (server backlog), hold until next appropriate window rather than delivering late at night

---

## Web Push Implementation

### Service Worker
The app registers a service worker (`/sw.js`) that handles:
- Background push message receipt
- Notification display
- Click handling (deep link routing)
- Notification badge management

### VAPID Keys
- Generated once, stored as Cloudflare Worker secrets
- Never rotated mid-deployment (would invalidate all subscriptions)
- Public key sent to client on app load

### Subscription Lifecycle
```
1. User lands on app, SW registers in background (no permission request yet)
2. User links first account → contextual permission prompt:
   "Orbit found your first insight. Want to be notified when we find more?"
   [Yes, notify me] [Maybe later]
3. Browser permission dialog (if user says yes)
4. On grant: POST /api/v1/notifications/subscribe with {endpoint, keys}
   → Stored in D1 push_subscriptions table
5. On revoke: browser fires pushsubscriptionchange event → DELETE subscription
```

**Subscription table:**
```sql
CREATE TABLE push_subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  endpoint TEXT UNIQUE NOT NULL,
  p256dh TEXT NOT NULL,  -- client public key
  auth TEXT NOT NULL,    -- client auth secret
  device_hint TEXT,      -- "Chrome/Mac", "Firefox/Windows" (from UA)
  created_at INTEGER NOT NULL,
  last_used_at INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

**Multiple devices**: One user can have multiple subscriptions (desktop + laptop + PWA). All active subscriptions receive the notification.

**Expired subscriptions**: If a push results in HTTP 410 (Gone), the subscription is automatically removed from the DB.

---

## Email Implementation

**Provider**: Resend (primary) via their REST API (Workers-compatible, no Node.js deps)

**Email types:**

| Type | Trigger | From |
|---|---|---|
| Transactional alert | Real-time event (failed payment, fraud) | alerts@orbit.app |
| Action approval request | Agent needs approval | action@orbit.app |
| Weekly digest | Sunday 8am user-local | digest@orbit.app |
| Account re-link required | Connection error | support@orbit.app |

**Template design:**
- Single-column, mobile-first HTML
- Plain text equivalent (required for deliverability)
- Clear unsubscribe link in footer (CAN-SPAM + GDPR compliant)
- Orbit branding: simple, not heavy/promotional
- One primary CTA per email; max two secondary actions

**Deliverability requirements:**
- SPF, DKIM, DMARC records configured on orbit.app domain
- Resend handles these when domain is verified
- Bounce handling: 2 hard bounces → suppress address, alert user in-app

---

## In-App Notification Feed

Always-available fallback: every notification delivered to any channel is also recorded in the in-app notification feed. Users who miss a push or email can always catch up here.

**Feed UI:**
- Bell icon in nav with unread badge count (capped at 99+)
- Feed entries: icon (category), timestamp, title, body, action button(s)
- Swipe to dismiss individual notifications
- "Mark all read" action
- Infinite scroll with 30-day history (older entries archived, not deleted)

---

## Open Questions — Resolved

**Q: Safari on iOS doesn't support web push without PWA install. How do we handle this?**
A: iOS 16.4+ supports Web Push for PWA apps installed to home screen. We implement an install prompt banner when the user visits on Safari mobile after linking an account. Email is the fallback for users who don't install. We track "notification-reachable users" as a metric.

**Q: When should we ask for notification permission?**
A: After the user links their first account and we generate their first real insight. The prompt is contextual: "We found something interesting about your finances — want us to alert you when we find more?" This is a consent moment tied to value, not a cold ask on app open. Asking too early is the primary cause of push permission denial.

**Q: How do we handle action buttons in notifications (Approve/Reject) without opening the app?**
A: Web Push supports up to 2 action buttons in the notification payload. Each action triggers a `notificationclick` event in the service worker, which calls our API directly (no app UI needed for simple approve/reject). For complex actions, the button opens the app to the relevant screen.

**Q: What email provider should we use?**
A: Resend. It has a Workers-compatible HTTP API, excellent deliverability, 3,000 free emails/month (sufficient for early MVP), and a clean SDK. Postmark is the backup — same properties, slightly better deliverability reputation for transactional email.

**Q: How do we prevent abuse of push subscriptions (someone stealing a subscription endpoint)?**
A: Push subscription endpoints are encrypted and bound to the browser. They cannot be used by third parties. Our server validates that the requesting user matches the stored user_id before sending any push.

---

## Success Metrics

| Metric | Target |
|---|---|
| Push notification opt-in rate | >65% |
| Email open rate (transactional) | >40% |
| Notification click-through rate | >25% |
| Actions taken directly from notifications | >15% of actionable alerts |
| Notification-triggered bill payments (prevented late fees) | Track; target 0 late payments |
| User-reported notification fatigue (survey) | <10% |
| Unsubscribe rate (email) | <2% |
| Push permission revocation rate (30-day) | <5% |
| "Notification-reachable" users (push or email active) | >85% of active users |
