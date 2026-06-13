# CLI reference

The Heramb CLI (`heramb`) orchestrates multi-platform deployments from your terminal.

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

## init

```bash
heramb init
```

Detects your stack from `package.json`, lockfiles, and framework config. Prompts for:

- Railway token (backend deploy)
- Vercel token (frontend deploy)
- Upstash email + API key (Redis)

Stores credentials in `~/.heramb/keys.json` and writes `heramb.config.json` in your project root.

## deploy

```bash
heramb deploy
heramb deploy --backend-only
heramb deploy --frontend-only
heramb deploy --env preview --branch feat/new-dashboard
```

Runs the full deployment pipeline:

1. Provision Redis (if configured)
2. Deploy backend with `REDIS_URL`
3. Derive `WS_URL` from backend URL
4. Deploy frontend with public env aliases
5. Patch `CORS_ORIGIN` on backend and redeploy
6. Smoke-test WebSocket handshake

## env

```bash
heramb env push    # Push local .env to all configured services
heramb env pull    # Pull remote env vars (coming soon)
```

## status & logs

```bash
heramb status
heramb logs backend
heramb ws test wss://your-backend.up.railway.app
```

## Where keys are asked

| Key | Required? | Where |
|-----|-----------|--------|
| Railway / Vercel / Upstash | Yes, for real deploys | `heramb init` (CLI) or **Settings** (web) |
| OpenAI | No — optional fallback only | **Settings** (web) or `OPENAI_API_KEY` env |
| AI during deploy | Never on happy path | Only if unknown error (~300 tokens) |

Heramb does **not** prompt for an AI key during `init` or `deploy`.
