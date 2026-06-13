import { serve } from '@hono/node-server';
import { apiReference } from '@scalar/hono-api-reference';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import {
  buildOpenApiSpec,
  DOCS_FAVICON_PATH,
  DOCS_FAVICON_SVG,
  SCALAR_CUSTOM_CSS,
} from './openapi.js';
import {
  authMethods,
  LocksLoginSchema,
  loginWithLocks,
} from './auth/locks-login.js';
import {
  consumeOAuthState,
  createOAuthState,
  loadEnv,
  LoginSchema,
  RegisterSchema,
} from './config.js';
import { GithubTokenSchema } from './auth/provider-tokens.js';
import { loginWithGithubToken } from './auth/github-token.js';
import { verifyToken } from './auth/jwt.js';
import { getMe, loginUser, registerUser } from './auth/service.js';
import {
  githubAuthorizeUrl,
  googleAuthorizeUrl,
  handleGithubCallback,
  handleGoogleCallback,
} from './auth/oauth.js';
import { createUser, findUserByEmail, hashPassword } from './store/users.js';

const env = loadEnv();
const app = new Hono();

app.use(
  '*',
  cors({
    origin: [env.WEB_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'OPTIONS'],
  })
);

function ensureDemoUser() {
  const demoEmail = 'demo@heramb.dev';
  if (!findUserByEmail(demoEmail)) {
    createUser({
      name: 'Demo User',
      email: demoEmail,
      passwordHash: hashPassword('heramb123'),
      provider: 'email',
    });
    console.log('Demo account ready: demo@heramb.dev / heramb123');
  }
}

ensureDemoUser();

app.get('/openapi.json', (c) => {
  const base = new URL(c.req.url).origin;
  return c.json(buildOpenApiSpec(base));
});

app.get(DOCS_FAVICON_PATH, (c) =>
  c.body(DOCS_FAVICON_SVG, 200, {
    'content-type': 'image/svg+xml; charset=utf-8',
    'cache-control': 'public, max-age=86400',
  })
);

app.get(
  '/docs',
  apiReference({
    pageTitle: 'Heramb API Reference',
    favicon: DOCS_FAVICON_PATH,
    layout: 'modern',
    showSidebar: true,
    spec: { url: '/openapi.json' },
    customCss: SCALAR_CUSTOM_CSS,
  })
);

app.get('/health', (c) => c.json({ ok: true, service: 'heramb-api' }));

app.get('/auth/methods', (c) => c.json(authMethods(env)));

app.post('/auth/register', async (c) => {
  try {
    const body = RegisterSchema.parse(await c.req.json());
    const result = await registerUser(env, body);
    return c.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Registration failed';
    return c.json({ error: msg }, msg.includes('already') ? 409 : 400);
  }
});

app.post('/auth/login', async (c) => {
  try {
    const body = LoginSchema.parse(await c.req.json());
    const result = await loginUser(env, body);
    return c.json(result);
  } catch {
    return c.json({ error: 'Invalid email or password' }, 401);
  }
});

/** Sign in by pasting provider tokens — no OAuth app registration needed */
app.post('/auth/locks', async (c) => {
  try {
    const body = LocksLoginSchema.parse(await c.req.json());
    const result = await loginWithLocks(env, body);
    return c.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Token sign-in failed';
    return c.json({ error: msg }, 401);
  }
});

/** Sign in with GitHub personal access token only */
app.post('/auth/github-token', async (c) => {
  try {
    const body = GithubTokenSchema.parse(await c.req.json());
    const result = await loginWithGithubToken(env, body.token);
    return c.json({
      token: result.token,
      user: result.user,
      locks: { github: body.token },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Invalid GitHub token';
    return c.json({ error: msg }, 401);
  }
});

app.get('/auth/me', async (c) => {
  const auth = c.req.header('Authorization');
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return c.json({ error: 'Unauthorized' }, 401);

  try {
    const payload = await verifyToken(token, env.JWT_SECRET);
    if (!payload.sub) return c.json({ error: 'Unauthorized' }, 401);
    return c.json({ user: getMe(payload.sub) });
  } catch {
    return c.json({ error: 'Unauthorized' }, 401);
  }
});

app.get('/auth/oauth/github', (c) => {
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
    return c.json(
      {
        error:
          'GitHub OAuth not configured. Use token sign-in instead — paste a GitHub PAT on the login page.',
      },
      503
    );
  }
  const state = createOAuthState('github');
  return c.redirect(githubAuthorizeUrl(env, state));
});

app.get('/auth/oauth/github/callback', async (c) => {
  const code = c.req.query('code');
  const state = c.req.query('state');
  if (!code || !state || !consumeOAuthState(state, 'github')) {
    return c.redirect(`${env.WEB_URL}/login?error=oauth_state`);
  }
  try {
    const redirectUrl = await handleGithubCallback(env, code);
    return c.redirect(redirectUrl);
  } catch (err) {
    const msg = encodeURIComponent(err instanceof Error ? err.message : 'oauth_failed');
    return c.redirect(`${env.WEB_URL}/login?error=${msg}`);
  }
});

app.get('/auth/oauth/google', (c) => {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    return c.json(
      {
        error:
          'Google OAuth not configured. Use GitHub/Railway/Vercel tokens or email sign-in instead.',
      },
      503
    );
  }
  const state = createOAuthState('google');
  return c.redirect(googleAuthorizeUrl(env, state));
});

app.get('/auth/oauth/google/callback', async (c) => {
  const code = c.req.query('code');
  const state = c.req.query('state');
  if (!code || !state || !consumeOAuthState(state, 'google')) {
    return c.redirect(`${env.WEB_URL}/login?error=oauth_state`);
  }
  try {
    const redirectUrl = await handleGoogleCallback(env, code);
    return c.redirect(redirectUrl);
  } catch (err) {
    const msg = encodeURIComponent(err instanceof Error ? err.message : 'oauth_failed');
    return c.redirect(`${env.WEB_URL}/login?error=${msg}`);
  }
});

const port = Number(process.env.PORT ?? 3001);

serve({ fetch: app.fetch, port }, () => {
  console.log(`Heramb API listening on http://localhost:${port}`);
});

export default app;
