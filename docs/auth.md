# Authentication

Heramb uses JWT sessions with multiple sign-in methods. OAuth is optional — token sign-in works without registering OAuth apps.

## Sign-in methods

| Method | Endpoint | Notes |
|--------|----------|-------|
| Email + password | `POST /auth/register`, `POST /auth/login` | Demo: `demo@heramb.dev` / `heramb123` |
| Provider tokens | `POST /auth/locks` | Paste GitHub, Railway, and/or Vercel tokens |
| GitHub PAT only | `POST /auth/github-token` | GitHub personal access token |
| GitHub OAuth | `GET /auth/oauth/github` | Requires `GITHUB_CLIENT_ID` + `GITHUB_CLIENT_SECRET` |
| Google OAuth | `GET /auth/oauth/google` | Requires `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` |

Check which methods are enabled: `GET /auth/methods`

## Token sign-in (no OAuth setup)

Paste provider tokens on the login page. Heramb verifies each token against the provider API and creates a session:

- **GitHub** — validates PAT via GitHub API
- **Railway** — validates token via Railway GraphQL
- **Vercel** — validates token via Vercel REST API
- **Upstash** — optional email + API key pair

This is the recommended path for local development — no OAuth app registration needed.

## OAuth setup (optional)

```bash
cp packages/api/.env.example packages/api/.env
```

Register callback URLs with your OAuth providers:

- GitHub: `http://localhost:3001/auth/oauth/github/callback`
- Google: `http://localhost:3001/auth/oauth/google/callback`

Set in `.env`:

```
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

## JWT sessions

Successful sign-in returns:

```json
{
  "token": "<jwt>",
  "user": { "id": "...", "name": "...", "email": "..." }
}
```

Use the token for protected endpoints:

```
Authorization: Bearer <jwt>
```

Current user: `GET /auth/me`

## API reference

Full request/response schemas: [http://localhost:3001/docs](http://localhost:3001/docs)
