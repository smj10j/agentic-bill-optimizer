# PRD-015 — Two-Factor Authentication

**Priority**: P1
**Status**: Draft
**Registry**: [REGISTRY.md](./REGISTRY.md)

---

## Problem Statement

Email and password alone is insufficient security for a financial app. Users expect and regulators require stronger authentication for applications that access financial data and initiate money movement. Without 2FA, Orbit is a non-starter for security-conscious users and regulatory compliance.

---

## Key Ideas

- **TOTP authenticator app support**: Google Authenticator, Authy, 1Password, etc.
- **WebAuthn / passkeys**: biometric and hardware key support for passwordless auth
- **Backup codes**: one-time recovery codes for lost device scenarios
- **Remember trusted devices**: reduce friction on recognized devices
- **Step-up auth for sensitive actions**: require re-authentication for large payments or settings changes
- **Recovery flow**: secure account recovery when 2FA device is lost

---

## Success Metrics

| Metric | Target |
|---|---|
| 2FA enrollment rate | >60% of active users |
| Account takeover incidents | 0 |
| Avg authentication time with 2FA | <10 seconds |
| Recovery flow success rate | >95% |
| Step-up auth completion rate | >90% for sensitive actions |
