# Web dashboard

The Heramb web UI is a React app at `packages/web`. It provides a landing page, deployment dashboard, and settings for provider tokens.

## Routes

| Route | Access | Description |
|-------|--------|-------------|
| `/` | Public | Landing page — features, install, live terminal demo |
| `/guide` | Public | In-app user guide |
| `/login` | Public | Email/password, token sign-in, OAuth |
| `/auth/callback` | Public | OAuth callback handler (web-side) |
| `/dashboard` | Protected | Deployment dashboard |
| `/settings` | Protected | Provider tokens + optional OpenAI key |
| `/docs` | Public | Scalar API reference (proxied to API in dev) |

## Development

```bash
npm run dev          # Starts API + web
npm run dev:web      # Web only (port 5173)
npm run dev:api      # API only (port 3001)
```

The Vite dev server proxies `/auth`, `/health`, `/docs`, and `/openapi.json` to the API on port 3001.

## Settings page

After signing in, open **Settings** to manage:

- **GitHub** personal access token
- **Railway** API token
- **Vercel** API token
- **Upstash** email + API key
- **OpenAI** API key (optional — only used for unknown deploy error diagnosis)

Tokens entered here are stored in your browser session and used by the dashboard. For CLI deploys, tokens are stored in `~/.heramb/keys.json` during `heramb init`.

## Production deploy

Build and deploy the static SPA:

```bash
npm run build -w @heramb1/web
# Deploy packages/web/dist to Vercel, Netlify, etc.
```

Point the API at your production `WEB_URL` and ensure CORS allows your frontend origin.
