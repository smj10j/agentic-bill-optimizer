# PRD-006 — Push Notifications & Alerts

**Priority**: P0
**Status**: Draft
**Registry**: [REGISTRY.md](./REGISTRY.md)

---

## Problem Statement

Users miss important financial events because they have to open the app to see them. Proactive notifications for bills due, unusual spending, agent actions, and savings opportunities drive engagement and prevent costly mistakes. Without notifications, the agent's value is limited to active sessions only.

---

## Key Ideas

- **Push notifications**: web push and mobile (iOS/Android)
- **Email alerts**: fallback channel for critical events (missed bills, large charges)
- **Configurable preferences**: per-category opt-in/out and frequency controls
- **Smart timing**: respect user's timezone and quiet hours (no 3am alerts)
- **Batching**: aggregate low-priority alerts into a daily digest
- **Critical vs informational channels**: urgent items (fraud, due today) break through; tips don't
- **Action buttons in notifications**: approve/dismiss directly from the notification

---

## Success Metrics

| Metric | Target |
|---|---|
| Notification opt-in rate | >70% |
| Notification open rate | >25% |
| Bills missed after notification enabled | 0 |
| User-reported notification fatigue | <10% in survey |
| Actions taken directly from notifications | >15% of actionable alerts |
