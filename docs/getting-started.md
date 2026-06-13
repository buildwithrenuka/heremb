# Getting started

## Prerequisites

- Node.js 18+
- npm
- Provider API tokens (Railway, Vercel, and/or Upstash) for real deploys

## Install

```bash
# Run without installing globally
npx @heramb/cli init
npx @heramb/cli deploy

# Or install globally
npm install -g @heramb/cli
heramb deploy
```

## Development setup

Clone the repo and install dependencies:

```bash
npm install
npm run build
```

### Run CLI + web together

```bash
npm run dev          # API (3001) + web (5173)
```

| Service | URL |
|---------|-----|
| Web UI | http://localhost:5173 |
| API | http://localhost:3001 |
| API docs | http://localhost:3001/docs |
| User guide (web) | http://localhost:5173/guide |

### Configure the API

```bash
cp packages/api/.env.example packages/api/.env
# Set JWT_SECRET; OAuth vars are optional (token sign-in works without them)
```

## First deploy

In your application repo:

```bash
heramb init      # Detect stack, create config, store tokens
heramb deploy    # Orchestrated multi-platform deploy
```

`heramb init` scans your repo, detects your stack (Next.js, Express, Socket.io, etc.), prompts for provider tokens, and writes `heramb.config.json`.

`heramb deploy` builds a dependency graph, deploys services in the correct order, wires env vars, solves the CORS circular dependency, and smoke-tests WebSockets.

## What happens during deploy

Heramb models your deployment as a dependency graph:

```
REDIS_URL           ← Redis provider (first)
BACKEND_URL         ← backend deploy (needs REDIS_URL)
WS_URL              ← derived from BACKEND_URL (https → wss)
CORS_ORIGIN         ← frontend deploy URL (patched after frontend)
NEXT_PUBLIC_API_URL ← alias of BACKEND_URL
NEXT_PUBLIC_WS_URL  ← alias of WS_URL
```

Steps are topologically sorted. CORS is solved by temporarily setting `CORS_ORIGIN=*`, deploying the frontend, then patching and redeploying the backend.

A clean deploy uses **zero AI tokens**.

## Next steps

- [CLI reference](./cli.md) — all commands and flags
- [Configuration](./configuration.md) — config file and credential storage
- [Authentication](./auth.md) — sign in to the web dashboard
