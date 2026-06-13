# Heramb User Guide

Welcome to Heramb — the deployment orchestration CLI and web dashboard that wires your frontend, backend, Redis, and env vars across Railway, Vercel, Upstash, and more.

## Quick links

| Guide | Description |
|-------|-------------|
| [Getting started](./getting-started.md) | Install, first deploy, dev setup |
| [CLI reference](./cli.md) | All `heramb` commands |
| [Web dashboard](./web-dashboard.md) | Routes, settings, provider tokens |
| [Authentication](./auth.md) | Sign-in methods, OAuth, JWT |
| [Configuration](./configuration.md) | `heramb.config.json` and credentials |

## API reference

Interactive API docs (Scalar) are served when the API is running:

- **Dev:** [http://localhost:3001/docs](http://localhost:3001/docs) (or [http://localhost:5173/docs](http://localhost:5173/docs) via Vite proxy)
- **OpenAPI spec:** `/openapi.json`

## Use cases

For real-world deployment scenarios, see [USE_CASES.md](../USE_CASES.md) in the repo root.

## Support

- Demo account (auto-created on API start): `demo@heramb.dev` / `heramb123`
- Health check: `GET /health`
