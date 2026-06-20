# @heramb1/cli

**Deploy full-stack apps across multiple platforms — without the dashboard tab circus.**

Heramb orchestrates frontend, backend, Redis, CORS, and WebSocket wiring in the correct order. One CLI instead of copy-pasting URLs between Railway, Vercel, Netlify, and Upstash.

**npm:** [@heramb1/cli](https://www.npmjs.com/package/@heramb1/cli) · **Website:** [heramb.pages.dev](https://heramb.pages.dev) · **Node.js:** 18+

---

## Install

```bash
# Run without installing globally
npx @heramb1/cli init
npx @heramb1/cli deploy

# Or install globally
npm install -g @heramb1/cli
heramb deploy
```

---

## Quick start

```bash
cd your-app
heramb init      # detect stack, create heramb.config.json, store API tokens
heramb deploy    # Redis → backend → frontend, env vars wired automatically
heramb status    # unified status across providers
```

---

## What Heramb does

Modern apps often span several platforms — frontend on Vercel or Netlify, backend on Railway, Redis on Upstash. Each service needs URLs from the others before it can start.

Heramb models your deployment as a **dependency graph** and runs every step in order:

```
REDIS_URL           ← Redis (first)
BACKEND_URL         ← backend (needs REDIS_URL)
WS_URL              ← derived from BACKEND_URL
CORS_ORIGIN         ← frontend URL (patched after frontend deploy)
NEXT_PUBLIC_*       ← aliases wired automatically
```

- **Dependency graph** — services deploy in the correct sequence
- **CORS handled** — temporary wildcard, then patch and redeploy backend
- **WebSocket smoke test** — handshake verified before deploy completes
- **Preview environments** — isolated deploys per branch

A clean deploy uses **zero AI tokens**.

---

## Commands

| Command | Description |
|---------|-------------|
| `heramb init` | Scan repo, detect stack, prompt for tokens, generate `heramb.config.json` |
| `heramb deploy` | Full orchestrated multi-platform deploy |
| `heramb deploy --backend-only` | Skip frontend |
| `heramb deploy --frontend-only` | Skip backend and Redis |
| `heramb deploy --env preview --branch feat/x` | Preview environment for a branch |
| `heramb status` | Status across all configured providers |
| `heramb env push` | Sync local `.env` to remote services |
| `heramb logs <service>` | Tail logs from a service |
| `heramb ws test [url]` | WebSocket smoke test |
| `heramb migrate [service]` | Move a service to another provider |

Run `heramb --help` for the full list.

---

## Supported providers

| Provider | Role |
|----------|------|
| **Railway** | Backend / API |
| **Vercel** | Frontend (Next.js, etc.) |
| **Netlify** | Frontend / static sites |
| **Upstash** | Redis |

API tokens are stored in `~/.heramb/keys.json` during `heramb init` — never commit this file.

---

## Configuration

`heramb init` creates `heramb.config.json` in your project root. See the [repository](https://github.com/buildwithrenuka/heremb) for an example config.

Credentials: `~/.heramb/keys.json`

---

## What Heramb is (and is not)

**Heramb is** a deployment orchestration CLI for apps split across multiple platforms. It wires env vars, deploy order, CORS, and WebSocket checks.

**Heramb is not** a hosting provider, infrastructure-as-code tool, or a replacement for platform-specific deploy CLIs. It orchestrates the gap *between* services.

---

## Links

- [npm — @heramb1/cli](https://www.npmjs.com/package/@heramb1/cli)
- [heramb.pages.dev](https://heramb.pages.dev) — product page & guide
- [GitHub](https://github.com/buildwithrenuka/heremb) — source & issues

---

## License

MIT
