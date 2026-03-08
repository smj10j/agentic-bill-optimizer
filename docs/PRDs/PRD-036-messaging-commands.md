# PRD-036 — SMS & Messaging Commands

**Priority**: P3
**Status**: Draft
**Registry**: [REGISTRY.md](./REGISTRY.md)

---

## Problem Statement

Not everyone wants to open an app. Meeting users where they already are — SMS, iMessage, WhatsApp — reduces friction. Quick commands via text ("balance", "pay electric bill", "how much did I spend today") make Orbit ambient and always available.

---

## Key Ideas

- SMS command interface with natural language parsing
- Quick-reply actions for common operations
- Balance checks and spending summaries on demand
- Bill pay initiation via text message
- Alert responses and acknowledgments inline
- Rich messaging (cards, buttons) where platforms support it
- Multi-platform support (SMS, iMessage, WhatsApp)
- Graceful fallback for unsupported message types

---

## Success Metrics

- Messaging MAU (% of users who interact via messaging channels)
- Command success rate (% parsed and executed correctly)
- Response latency (p50, p95 for message-to-reply)
- Channel mix distribution across SMS, iMessage, WhatsApp
- Incremental engagement lift (users who engage via messaging vs. app-only)
