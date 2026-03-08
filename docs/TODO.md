# TODO — Orbit

Current implementation tasks, updated as work progresses.

---

## Sprint 1: MVP Scaffold + Core API — COMPLETE ✅

### Project Setup
- [x] CLAUDE.md with implementation loop
- [x] README.md with setup and deploy instructions
- [x] .gitignore
- [x] Root package.json (npm workspaces)
- [x] docs/PRDs/REGISTRY.md
- [x] docs/PRDs/PRD-001-mvp-foundation.md
- [x] docs/TDD.md
- [x] docs/API.md
- [x] docs/SECURITY.md
- [x] docs/DESIGN.md
- [x] Root tsconfig.json
- [x] packages/shared — shared types + money utils
- [x] apps/api — Cloudflare Workers + Hono setup
- [x] apps/web — React + Vite + TanStack Router setup
- [x] GitHub Actions CI workflow
- [x] Initial git commit

### Cloudflare Provisioning
- [x] D1 database created (`orbit-db`)
- [x] KV namespace created (`SESSIONS`)
- [x] D1 schema migrated (local + remote)
- [x] JWT_SECRET set as Worker secret
- [x] Cloudflare Pages project created (`orbit-app`)

### API Foundation
- [x] Hono app entry point with middleware (CORS, auth, error handling)
- [x] Auth routes (signup, login, refresh, logout)
- [x] Accounts routes (list, link, sync)
- [x] Transactions routes (list, get by id)
- [x] Subscriptions routes (list, update status, cancel)
- [x] Bills routes (list, pay)
- [x] Yield routes (get position, sweep-in, sweep-out)
- [x] Agent routes (chat/SSE, conversations, actions, reverse)
- [x] Finance service (D1 read/write for all entities)
- [x] Agent service (Claude API + tool use + SSE streaming)
- [x] Health endpoint
- [x] wrangler.toml configuration

### Mock Data Layer
- [x] Mock financial account adapter
- [x] Mock yield/money interface
- [x] Seed data for development

### Web Foundation
- [x] Vite config for Cloudflare Pages
- [x] Tailwind + CSS setup
- [x] TanStack Router setup
- [x] Auth store (context + localStorage)
- [x] Login/Signup pages
- [x] Protected layout shell (nav, header)
- [x] Dashboard page
- [x] Agent chat page (SSE streaming)
- [x] Bills page
- [x] Subscriptions page
- [x] Yield page
- [x] MoneyAmount, StatusBadge, Skeleton components
- [x] API client utility

### Deployment
- [x] API deployed to Cloudflare Workers
  → https://orbit-api.stevej-67b.workers.dev
- [x] Web deployed to Cloudflare Pages
  → https://orbit-app-c97.pages.dev
- [x] Health endpoint validated ✅

---

## Sprint 2: Backlog

### Auth & UX
- [ ] Anthropic API key set (waiting on user)
- [ ] Validate agent chat end-to-end in production
- [ ] Token refresh flow wired in web API client
- [ ] Better error toasts on auth failures

### Real Data Integration
- [ ] Real account link flow (Plaid or equivalent)
- [ ] Periodic background sync via Cron Triggers

### Agent Improvements
- [ ] Conversation history trimming (summarize when >20 messages)
- [ ] Rate limiting on /agent/chat endpoint
- [ ] Agent proactive insights push (scheduled triggers)

### Testing
- [ ] API unit tests (auth, finance service)
- [ ] API integration tests (route-level with Workers test bindings)
- [ ] E2E tests for auth flow (Playwright)

### Production Hardening
- [ ] GitHub repo remote set + push to origin
- [ ] GitHub Actions connected to Cloudflare (CLOUDFLARE_API_TOKEN secret)
- [ ] Cloudflare Pages connected to GitHub for auto-deploy
- [ ] Custom domain (optional)
