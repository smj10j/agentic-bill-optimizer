# Orbit

AI-powered financial autopilot. Your money, optimized automatically.

Orbit analyzes your financial life, manages bills, hunts down better deals, tracks subscriptions, and puts idle cash to work — all surfaced in plain English. The infrastructure that powers it (programmable money, instant settlement) is invisible to the user.

## Status

🟢 MVP deployed

| | URL |
|---|---|
| **Web** | https://orbit-app-c97.pages.dev |
| **API** | https://orbit-api.stevej-67b.workers.dev |

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| Backend | Hono on Cloudflare Workers |
| Database | Cloudflare D1 (SQLite at the edge) |
| Cache / Sessions | Cloudflare KV |
| AI Agent | Anthropic Claude API |
| Programmable Money | Abstracted interface (mock → Circle USDC) |
| Deployment | Cloudflare Pages + Workers |

## Monorepo Structure

```
orbit/
├── apps/
│   ├── web/          # Frontend — Cloudflare Pages
│   └── api/          # Backend — Cloudflare Workers
├── packages/
│   └── shared/       # Shared TypeScript types + utilities
├── docs/             # Project documentation
├── CLAUDE.md         # AI agent implementation instructions
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) — `npm install -g wrangler`
- Cloudflare account (free tier works)

### Install

```bash
git clone <repo>
cd orbit
npm install
```

### Environment Setup

**API (`apps/api`)**

Create `apps/api/.dev.vars`:
```
ANTHROPIC_API_KEY=your_key_here
JWT_SECRET=a_long_random_secret
ENVIRONMENT=development
```

**Web (`apps/web`)**

Create `apps/web/.env.local`:
```
VITE_API_URL=http://localhost:8787
```

### Local Development

```bash
# Run all services concurrently
npm run dev

# Or individually
npm run dev:web    # http://localhost:5173
npm run dev:api    # http://localhost:8787
```

### Testing

```bash
npm test           # All workspaces
npm run test:web   # Frontend tests
npm run test:api   # API tests
```

### Type Checking

```bash
npm run typecheck
```

## Deployment

### Infrastructure (already provisioned)

Cloudflare resources are already set up:
- **D1 database**: `orbit-db` (id: `abdc8803-f3ea-4f60-a5fa-dbcae58f4c18`)
- **KV namespace**: `SESSIONS` (id: `94e21f34fd9841e2a179f097be10bfee`)
- **Workers**: `orbit-api` at `https://orbit-api.stevej-67b.workers.dev`
- **Pages**: `orbit-app` at `https://orbit-app-c97.pages.dev`
- **JWT_SECRET**: Set as Worker secret

### First-Time Setup (new developers)

1. Log in to Cloudflare: `wrangler login`

2. The `wrangler.toml` already has the D1 and KV IDs. Apply the schema locally:
   ```bash
   cd apps/api
   wrangler d1 migrations apply orbit-db --local
   ```

3. Set your local dev secrets in `apps/api/.dev.vars` (copy from `.dev.vars.example`):
   ```
   ANTHROPIC_API_KEY=your_key
   JWT_SECRET=any_random_string_for_local_dev
   ```

### Deploy

```bash
npm run deploy        # Deploy everything
npm run deploy:api    # API only
npm run deploy:web    # Web only (or push to main for auto-deploy via Pages CI)
```

### CI/CD

GitHub Actions automatically:
- Runs tests on every PR
- Deploys API to Workers on merge to `main`
- Cloudflare Pages auto-deploys web on push to `main`

See `.github/workflows/` for details.

## Documentation

| Doc | Description |
|---|---|
| [PRD Registry](docs/PRDs/REGISTRY.md) | All PRDs and their status |
| [PRD-001 MVP Foundation](docs/PRDs/PRD-001-mvp-foundation.md) | MVP feature requirements |
| [TDD](docs/TDD.md) | Technical design and architecture |
| [API](docs/API.md) | API reference |
| [Security](docs/SECURITY.md) | Security model and practices |
| [Design](docs/DESIGN.md) | Design system and UX guidelines |
| [TODO](docs/TODO.md) | Current implementation tasks |

## License

MIT
