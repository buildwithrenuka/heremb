# Heramb 🐘

**Removes the obstacles between your code and production.**

> Deploy ke vighna, Heramb door kare.

Heramb is a deployment orchestration **CLI + web dashboard** that deploys your frontend and backend to any combination of platforms, automatically wires env vars between services in the correct order, handles the CORS chicken-and-egg problem, and configures WebSockets and Redis — without copy-pasting URLs between dashboards.

## Install (npm)

```bash
# Run without installing globally
npx @heramb/cli init
npx @heramb/cli deploy

# Or install globally
npm install -g @heramb/cli
heramb deploy
```

## Web UI

```bash
npm install
npm run dev          # Landing page + dashboard at http://localhost:5173
npm run build        # Builds CLI + web for production
```

| Route | Description |
|-------|-------------|
| `/` | Landing page — features, install, live terminal demo |
| `/guide` | User guide |
| `/docs` | Scalar API reference (proxied to API in dev) |
| `/settings` | Provider tokens + optional OpenAI key (protected) |
| `/login` | Email/password + GitHub/Google OAuth |

**Documentation:** [User guide](./docs/README.md) · API docs at `/docs` when the API is running

Deploy the web app to Vercel/Netlify from `packages/web/dist` after `npm run build -w @heramb/web`.

### Auth (JWT + OAuth)

Form-Builder–style JWT sessions, extended with GitHub and Google OAuth:

```bash
# Terminal 1 — API (port 3001)
cp packages/api/.env.example packages/api/.env
# Set JWT_SECRET, GITHUB_CLIENT_ID/SECRET, GOOGLE_CLIENT_ID/SECRET
npm run dev:api

# Terminal 2 — Web (port 5173)
npm run dev

# Or both:
npm run dev:all
```

OAuth callback URLs to register:
- GitHub: `http://localhost:3001/auth/oauth/github/callback`
- Google: `http://localhost:3001/auth/oauth/google/callback`

### Where keys are asked

| Key | Required? | Where |
|-----|-----------|--------|
| Railway / Vercel / Upstash | Yes, for real deploys | `heramb init` (CLI) or **Settings** (web) |
| OpenAI | **No** — optional fallback only | **Settings** (web) or `OPENAI_API_KEY` env |
| AI during deploy | Never on happy path | Only if unknown error (~300 tokens) |

Heramb does **not** prompt for an AI key during `init` or `deploy`.

## Quick start (development)

```bash
# Install dependencies and build
npm install
npm run build

# Link CLI globally (optional)
npm link -w @heramb/cli

# In your app repo
heramb init      # detect stack, create config, store tokens
heramb deploy    # orchestrated multi-platform deploy
```

## Commands

| Command | Description |
|---------|-------------|
| `heramb init` | Scan repo, detect stack, prompt for API tokens, generate `heramb.config.json` |
| `heramb deploy` | Full orchestrated deploy with dependency resolution |
| `heramb deploy --backend-only` | Skip frontend |
| `heramb deploy --frontend-only` | Skip backend and Redis |
| `heramb deploy --env preview --branch feat/x` | Isolated preview environment per branch |
| `heramb migrate backend --from heroku --to render` | Provider migration with zero-downtime plan |
| `heramb status` | Unified status across all providers |
| `heramb env push` | Sync local `.env` to all services |
| `heramb env pull` | Pull remote env vars (coming soon) |
| `heramb ws test [url]` | WebSocket smoke test |
| `heramb logs <service>` | Tail logs from a service |
| `heramb migrate [service]` | Move a service to another provider |

## Use cases

See [USE_CASES.md](./USE_CASES.md) for seven real-world scenarios — solo founders, preview environments, provider migrations, agencies, CORS nightmares, CI/CD, and first-time deployers.

## Documentation

| Resource | Location |
|----------|----------|
| User guide | [docs/](./docs/README.md) — getting started, CLI, auth, config |
| API reference | `http://localhost:3001/docs` (Scalar) · OpenAPI at `/openapi.json` |
| In-app guide | `http://localhost:5173/guide` |

## How it works

Heramb models your deployment as a **dependency graph**:

```
REDIS_URL           ← Redis provider (first)
BACKEND_URL         ← backend deploy (needs REDIS_URL)
WS_URL              ← derived from BACKEND_URL (https → wss)
CORS_ORIGIN         ← frontend deploy URL (patched after frontend)
NEXT_PUBLIC_API_URL ← alias of BACKEND_URL
NEXT_PUBLIC_WS_URL  ← alias of WS_URL
```

Steps are topologically sorted and executed in order. The CORS circular dependency is solved by temporarily setting `CORS_ORIGIN=*`, deploying the frontend, then patching and redeploying the backend.

A clean deploy uses **zero AI tokens**.

## Config

See [`heramb.config.example.json`](./heramb.config.example.json).

Credentials are stored in `~/.heramb/keys.json`.

## Monorepo structure

```
packages/
├── core/              # Orchestration engine, dependency graph, error table
├── cli/               # Commander CLI (@heramb/cli on npm)
├── api/               # Hono auth API + Scalar docs
├── web/               # Landing page + deployment dashboard (React)
└── providers/
    ├── railway/       # Railway GraphQL lock
    ├── vercel/        # Vercel REST lock
    └── upstash/       # Upstash Redis lock
```

## Provider locks

Platforms implement a standard interface:

- `deploy()` → `{ url, serviceId }`
- `getStatus()` → `{ status, url }`
- `setEnvVars()` → `{ ok }`
- `getLogs()` → stream
- `destroy()` → `{ ok }`

**Implemented:** Railway, Vercel, Upstash  
**Planned:** Render, Netlify, Fly.io, Heroku, Cloudflare Pages

## Development

```bash
npm run build              # Build all packages (CLI + web)
npm run dev                # Web UI dev server (localhost:5173)
npm run dev:cli            # Watch CLI TypeScript
node packages/cli/dist/index.js --help
```

## License

MIT
