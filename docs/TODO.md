# TODO — Orbit

Current implementation tasks, updated as work progresses.

---

## Current Sprint: MVP Scaffold

### Project Setup
- [x] CLAUDE.md with implementation loop
- [x] README.md with setup and deploy instructions
- [x] .gitignore
- [x] Root package.json (npm workspaces)
- [x] docs/PRD.md
- [x] docs/TDD.md
- [x] docs/API.md
- [x] docs/SECURITY.md
- [x] docs/DESIGN.md
- [ ] Root tsconfig.json
- [ ] packages/shared — shared types
- [ ] apps/api — Cloudflare Workers + Hono setup
- [ ] apps/web — React + Vite setup
- [ ] GitHub Actions CI workflow
- [ ] Initial git commit

### API Foundation
- [ ] Hono app entry point with middleware (CORS, auth, error handling)
- [ ] Auth routes (signup, login, refresh, logout)
- [ ] D1 schema migrations
- [ ] KV bindings for sessions
- [ ] Health endpoint
- [ ] wrangler.toml configuration

### Shared Package
- [ ] User, Account, Transaction, Subscription, Bill types
- [ ] Money utility (cents ↔ display formatting)
- [ ] API response envelope types

### Web Foundation
- [ ] Vite config for Cloudflare Pages
- [ ] Tailwind + shadcn/ui setup
- [ ] TanStack Router setup
- [ ] Auth pages (login, signup)
- [ ] Layout shell (nav, header)
- [ ] API client utility

### Mock Data Layer
- [ ] Mock financial account adapter
- [ ] Seed data for development
- [ ] Mock yield/money interface

### Agent Integration
- [ ] Claude API service with tool use
- [ ] Agent tools implementation (get_account_summary, get_subscriptions, etc.)
- [ ] SSE streaming chat endpoint

---

## Backlog

- Real Plaid integration (Phase 2)
- Real stablecoin yield (Phase 2)
- Push notifications (Phase 2)
- Autopilot mode (Phase 2)
- E2E tests with Playwright (Phase 2)
