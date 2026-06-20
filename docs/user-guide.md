# Heramb User Guide

> Deploy full-stack apps without the dashboard tab circus.

**npm:** `@heramb1/cli` · **CLI:** `heramb` · **Node.js:** 18+

Live page: [heramb.pages.dev](https://heramb.pages.dev)

---

## The problem

Modern apps span multiple platforms — frontend on Vercel, backend on Railway, Redis on Upstash. Each service needs URLs from the others before it can start. Without orchestration, teams waste hours on:

- Copy-pasting backend URLs into frontend env vars
- CORS errors that require backend patches and redeploys
- Misconfigured Redis and WebSocket connections
- Repeating the same setup for every preview branch

## What Heramb solves

Heramb models your deployment as a dependency graph and executes every step in order:

- **Dependency graph engine** — Redis, backend, and frontend deploy in the correct sequence
- **CORS handled automatically** — patch, redeploy, verify
- **WebSocket smoke tests** — handshake tested before deploy completes
- **Preview environments** — one command per branch

---

## What Heramb does (and does not do)

**Heramb is:** a deployment orchestration CLI for apps split across multiple platforms. It wires env vars, deploy order, CORS, and WebSocket checks — via `heramb init` and `heramb deploy`.

**Heramb is not:** a hosting provider, infrastructure-as-code, or a replacement for platform-specific deploy tools. It orchestrates the gap between services.

| Approach | Cross-service wiring | CORS & WebSockets |
|----------|---------------------|-------------------|
| Manual dashboards | You copy-paste URLs | You fix when broken |
| Single-platform CLI | You wire the rest manually | Not part of deploy flow |
| **Heramb** | Automatic dependency graph | Patched and smoke-tested |

---

## Where Heramb is the perfect tool

See [USE_CASES.md](../USE_CASES.md) for full stories — first deploy, PR previews, migrations, agencies, CORS failures, CI/CD drift.

---

## How to use Heramb

### 01 — Install the npm package

```bash
npx @heramb1/cli --help
```

Or install globally: `npm install -g @heramb1/cli`

### 02 — Initialize your project

```bash
heramb init
```

Scans your stack and creates `heramb.config.json` in your project root.

### 03 — Connect your providers

During init, paste API tokens for Railway, Vercel, and Upstash. Stored in `~/.heramb/keys.json` (never commit).

### 04 — Deploy

```bash
heramb deploy
```

Provisions Redis, deploys backend and frontend, wires env vars, patches CORS, and tests WebSockets.

### 05 — Check status

```bash
heramb status
heramb deploy --env preview --branch feat/my-feature
```

---

## Quick start

```bash
npx @heramb1/cli init && npx @heramb1/cli deploy
```

---

## Further reading

- [CLI reference](./cli.md)
- [Configuration](./configuration.md)
- [Use cases](../USE_CASES.md)
