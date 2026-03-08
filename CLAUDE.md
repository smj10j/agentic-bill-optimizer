# Orbit — Claude Code Instructions

## Project Overview
Orbit is an AI-powered financial autopilot. It optimizes a user's financial life — managing bills, tracking subscriptions, finding deals, and earning yield on idle cash — using programmable money infrastructure behind the scenes. Users see only dollars and plain English.

## Implementation Loop

For every feature or fix, follow this loop **in order**:

1. **Gather requirements** — Clarify scope. If ambiguous, ask. Prefer small, shippable increments.
2. **Write a TODO doc** — Before coding, create or update `docs/TODO.md` with a checklist of exactly what will be done. This is the source of truth for the current task.
3. **Implement** — Write code + any new tests. Mark items off in `docs/TODO.md` as completed. Keep changes focused; don't gold-plate.
4. **Run tests** — Run relevant tests: `npm test` (root runs all workspaces). Fix failures before continuing.
5. **Deploy** — Run `npm run deploy` from the relevant workspace. See deployment instructions in `README.md`.
6. **Validate deployment** — Hit deployed endpoints / open deployed URL. Verify the feature works in production.
7. **Update TODO** — Mark remaining items complete. Note anything deferred.
8. **Update docs** — Update any impacted docs: `README.md` (new setup/deploy steps), `docs/TDD.md` (new system integrations), `docs/PRDs/REGISTRY.md` + relevant PRD status, `docs/API.md` (new endpoints).
9. **Commit and push** — Commit with a meaningful message. Push to `main`. CI/CD handles the rest.

## Parallelization
- Run independent subagents/background tasks in parallel where possible (e.g., writing tests while writing docs).
- Don't parallelize steps with dependencies (e.g., deploy before tests pass).

## Decision-Making
Make architectural and implementation decisions autonomously unless:
- The decision has significant user-facing UX impact
- It involves spending money or external API credentials
- It could break production in a non-recoverable way

## Code Standards
- **TypeScript everywhere** — strict mode, no `any` unless absolutely justified
- **No secrets in code** — all secrets via env vars / Cloudflare secrets
- **Tests for behavior, not implementation** — test what the code does, not how
- **Minimal abstraction** — build for today's requirements, leave clear extension points for tomorrow
- **Error handling at system boundaries** — validate external inputs; trust internal code
- **Never mention specific financial institutions** in code, docs, or comments

## Tech Stack Quick Reference
| Layer | Tech | Deploy target |
|---|---|---|
| Frontend | React 18 + TypeScript + Vite + Tailwind | Cloudflare Pages |
| Backend | Hono + TypeScript | Cloudflare Workers |
| Database | Cloudflare D1 (SQLite) | Edge |
| Cache/Sessions | Cloudflare KV | Edge |
| AI Agent | Anthropic Claude API | Via Worker |
| Stablecoin Layer | Abstracted interface (mock → Circle USDC) | Via Worker |

## Workspace Structure
```
orbit/
├── apps/
│   ├── web/          # Cloudflare Pages (React)
│   └── api/          # Cloudflare Workers (Hono)
├── packages/
│   └── shared/       # Shared TypeScript types + utilities
├── docs/             # All project documentation
├── CLAUDE.md         # This file
└── README.md
```

## Key Commands
```bash
# Development
npm run dev           # Start all dev servers
npm run dev:web       # Web only (http://localhost:5173)
npm run dev:api       # API only (http://localhost:8787)

# Testing
npm test              # Run all tests
npm run test:web      # Web tests only
npm run test:api      # API tests only

# Deploy
npm run deploy:web    # Deploy frontend to Cloudflare Pages
npm run deploy:api    # Deploy API to Cloudflare Workers
npm run deploy        # Deploy everything

# Type check
npm run typecheck     # Check all workspaces
```
