# PRD-052 — Native Mobile App

**Priority**: P1
**Status**: Draft
**Last Updated**: 2026-03-09
**Registry**: [REGISTRY.md](./REGISTRY.md)

---

## Vision

Personal finance is a mobile-first experience. People check their balances while in line at the grocery store, get bill reminders while commuting, and approve agent actions from their phone. The current web app works well on mobile browsers, but native apps unlock capabilities that are impossible on the web: reliable background push notifications, Face ID authentication, home screen widgets, and the trust signal that comes with App Store presence.

---

## Problem Statement

Current web app limitations on mobile:

1. **Push notifications**: Web Push (PRD-006) is unreliable on iOS Safari and requires the browser to be running. Native push notifications work even when the app is closed and have much higher delivery rates.
2. **Biometric authentication**: Face ID / Touch ID requires native APIs. Web biometrics (WebAuthn) is available but limited.
3. **App Store presence**: Being in the App Store is a trust signal. Many users won't use a financial app that isn't in the App Store.
4. **Home screen widgets**: Balance widget, upcoming bills, agent status — impossible on web.
5. **Background processing**: Proactive monitoring (PRD-016) needs to run even when app is closed.
6. **Performance**: Native rendering is noticeably faster on mobile, which matters for financial data at a glance.
7. **Offline capability**: View balances and recent transactions without a network connection.

---

## Platform Strategy

### React Native (recommended)
- Shares business logic and most UI with the existing React web app
- TypeScript throughout — same language, shared types from `packages/shared`
- Expo for managed workflow (faster development, OTA updates)
- React Native Web bridge for web reuse (partial)
- One codebase for iOS and Android

**Shared with web app**:
- API client (`apps/web/src/lib/`)
- Shared types (`packages/shared`)
- Business logic and validation
- Most page logic (route handlers)

**Native-only**:
- Push notification registration (APNs + FCM)
- Biometric authentication
- Home screen widgets
- Native navigation (React Navigation)
- Haptic feedback

### Alternative: PWA Enhancement
Before full native: improve the web app as a PWA:
- Add `manifest.json` and service worker for installability
- Web Push (PRD-006) for notifications
- Offline caching of recent data
- "Add to Home Screen" prompt

**Gap**: PWA notifications don't work reliably on iOS. The App Store signal is missing.

**Verdict**: PWA is a useful interim step; native React Native is the right 6-month goal.

---

## Native-Exclusive Features

### 1. Push Notifications (APNs + FCM)
Reliable notification delivery for:
- Bill payment reminders (1 day before, day of)
- Agent actions requiring approval (immediate)
- Anomaly alerts (immediate)
- Paycheck arrived (within minutes)
- Yield earnings summary (weekly)

**Implementation**: Firebase Cloud Messaging (FCM) for both iOS (via APNs) and Android. Device token stored in `user_devices` table; server sends via FCM API.

### 2. Biometric Authentication
- Face ID / Touch ID to unlock app
- Biometric approval for agent actions (replaces password re-entry)
- Secure Enclave storage for session tokens (no localStorage)

### 3. Home Screen Widgets (iOS Widget + Android App Widget)
**Small widget (2×2)**: Net worth + change today
**Medium widget (2×4)**:
- Net worth bar
- Next upcoming bill (name + days)
- Yield earned this month

**Lock Screen widget** (iOS 16+): Next bill amount + due date

### 4. Background App Refresh
- Sync balance data every 30 minutes when connected
- Check for new agent actions that need approval
- Pre-cache upcoming notifications for offline display

### 5. Action Shortcuts (iOS Siri Shortcuts / Android Quick Actions)
Long-press app icon:
- "Check balance"
- "Pay next bill"
- "Open agent chat"

---

## App Architecture

```
apps/
├── web/           # Cloudflare Pages (existing)
├── api/           # Cloudflare Workers (existing)
└── mobile/        # New: Expo + React Native
    ├── src/
    │   ├── screens/        # One per route (Dashboard, Agent, Bills, etc.)
    │   ├── components/     # Mobile-specific UI components
    │   ├── navigation/     # React Navigation setup
    │   ├── store/          # Auth store (mirrors web)
    │   ├── lib/            # Re-exports or wrappers of packages/shared
    │   └── native/         # Biometric, notifications, widgets
    ├── ios/
    ├── android/
    └── app.json
```

**Shared API layer**: Mobile uses the exact same `apiFetch` patterns and route paths as the web app. No API changes needed.

---

## Notification Architecture

```
Cloudflare Worker (orbit-api)
  → trigger notification (bill reminder, anomaly, agent action)
  → looks up user's device tokens from user_devices table
  → calls FCM API with title, body, data payload
  → FCM routes to APNs (iOS) or FCM direct (Android)
  → device receives push notification
  → user taps → app opens to relevant screen
```

```sql
CREATE TABLE user_devices (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  push_token TEXT NOT NULL,
  device_name TEXT,
  last_seen_at INTEGER,
  created_at INTEGER NOT NULL,
  UNIQUE(user_id, push_token)
);
```

---

## Design Principles for Mobile

- **Bottom tab navigation**: Dashboard, Agent, Bills, Settings (4 tabs max)
- **Swipe actions**: Swipe bill card to pay; swipe notification to dismiss
- **Haptic feedback**: On approvals, confirmations, and payment completions
- **Large touch targets**: Minimum 44×44pt for all interactive elements
- **Skeleton loading**: Never show blank screens — skeleton states everywhere
- **Offline banner**: Clear indication when data may be stale (no internet)

---

## Rollout Plan

1. **Phase 1** (MVP native): Core screens + reliable push notifications (6-8 weeks)
   - Authentication (biometric)
   - Dashboard
   - Bills list
   - Agent chat
   - Settings → Accounts
   - Push notification registration
   - App Store submission

2. **Phase 2**: Full feature parity with web app + widgets

3. **Phase 3**: Native-exclusive features (widgets, Siri Shortcuts, background sync)

---

## Success Metrics

| Metric | Target |
|---|---|
| App Store rating | >4.5 stars |
| Day-7 retention (mobile vs. web) | >15% lift |
| Push notification opt-in rate | >80% |
| Push notification delivery rate | >95% |
| Daily active users on mobile | >60% of active users |
| Widget adoption rate | >30% of iOS users |
| Biometric auth adoption | >85% of mobile users |

---

## Dependencies

- PRD-006 (Push Notifications) — notification logic and anti-fatigue rules already implemented; just needs native delivery
- PRD-015 (2FA / Biometric Auth) — step-up auth for mobile
- All existing API routes — mobile consumes the same API as web
