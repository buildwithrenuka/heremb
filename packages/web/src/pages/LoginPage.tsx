import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { checkApiHealth, fetchAuthMethods, oauthUrl, type AuthMethods } from '../auth/api';
import styles from './LoginPage.module.css';

type Mode = 'tokens' | 'email-login' | 'email-register';

export function LoginPage() {
  const { login, register, loginWithProviderTokens, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const errorParam = searchParams.get('error');

  const [mode, setMode] = useState<Mode>('tokens');
  const [methods, setMethods] = useState<AuthMethods | null>(null);

  const [github, setGithub] = useState('');
  const [railway, setRailway] = useState('');
  const [vercel, setVercel] = useState('');
  const [upstashEmail, setUpstashEmail] = useState('');
  const [upstashApiKey, setUpstashApiKey] = useState('');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [error, setError] = useState(errorParam ? decodeURIComponent(errorParam) : '');
  const [pending, setPending] = useState(false);
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);

  useEffect(() => {
    checkApiHealth().then(setApiOnline);
    fetchAuthMethods()
      .then(setMethods)
      .catch(() => setMethods(null));
  }, []);

  if (user) {
    navigate('/dashboard', { replace: true });
    return null;
  }

  async function handleTokenLogin(e: FormEvent) {
    e.preventDefault();
    setError('');
    setPending(true);
    try {
      await loginWithProviderTokens({
        github: github || undefined,
        railway: railway || undefined,
        vercel: vercel || undefined,
        upstashEmail: upstashEmail || undefined,
        upstashApiKey: upstashApiKey || undefined,
      });
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Token sign-in failed');
    } finally {
      setPending(false);
    }
  }

  async function handleEmailSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setPending(true);
    try {
      if (mode === 'email-login') {
        await login(email, password);
      } else {
        await register(name, email, password);
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <span className={styles.key}>🔑</span>
          <h1>Unlock Heramb</h1>
          <p>Paste your provider tokens — no OAuth app setup required.</p>
        </div>

        {apiOnline === false && (
          <div className={styles.apiOffline} role="alert">
            <strong>API not running.</strong> Start both servers from the repo root:
            <code>npm run dev</code>
            <span className={styles.apiOfflineHint}>
              (starts API on :3001 and web on :5173)
            </span>
          </div>
        )}

        <div className={styles.tabs}>
          <button
            type="button"
            className={mode === 'tokens' ? styles.tabActive : styles.tab}
            onClick={() => setMode('tokens')}
          >
            Provider tokens
          </button>
          <button
            type="button"
            className={mode === 'email-login' ? styles.tabActive : styles.tab}
            onClick={() => setMode('email-login')}
          >
            Email
          </button>
        </div>

        {mode === 'tokens' ? (
          <form onSubmit={handleTokenLogin} className={styles.form}>
            <p className={styles.tokenHint}>
              Provide at least one token below. Verified tokens are saved to Settings for deploys.
            </p>

            <label>
              GitHub personal access token
              <input
                type="password"
                value={github}
                onChange={(e) => setGithub(e.target.value)}
                placeholder="ghp_… or github_pat_…"
                autoComplete="off"
              />
              <span className={styles.fieldHelp}>
                <a href="https://github.com/settings/tokens" target="_blank" rel="noreferrer">
                  Create token
                </a>
                {' · scope: '}
                <code>read:user</code>
              </span>
            </label>

            <label>
              Railway API token
              <input
                type="password"
                value={railway}
                onChange={(e) => setRailway(e.target.value)}
                placeholder="From railway.app/account/tokens"
                autoComplete="off"
              />
            </label>

            <label>
              Vercel API token
              <input
                type="password"
                value={vercel}
                onChange={(e) => setVercel(e.target.value)}
                placeholder="From vercel.com/account/tokens"
                autoComplete="off"
              />
            </label>

            <details className={styles.optional}>
              <summary>Upstash (optional)</summary>
              <label>
                Upstash email
                <input
                  type="email"
                  value={upstashEmail}
                  onChange={(e) => setUpstashEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </label>
              <label>
                Upstash API key
                <input
                  type="password"
                  value={upstashApiKey}
                  onChange={(e) => setUpstashApiKey(e.target.value)}
                  placeholder="From console.upstash.com"
                />
              </label>
            </details>

            {error && <p className={styles.error}>{error}</p>}

            <button type="submit" className={styles.submit} disabled={pending}>
              {pending ? 'Verifying tokens…' : 'Sign in with tokens'}
            </button>

            {methods?.githubOAuth || methods?.googleOAuth ? (
              <div className={styles.oauthOptional}>
                <span className={styles.oauthLabel}>OAuth (admin-configured only)</span>
                {methods.githubOAuth && (
                  <a href={oauthUrl('github')} className={styles.oauthLink}>
                    GitHub OAuth redirect
                  </a>
                )}
                {methods.googleOAuth && (
                  <a href={oauthUrl('google')} className={styles.oauthLink}>
                    Google OAuth redirect
                  </a>
                )}
              </div>
            ) : (
              <p className={styles.oauthDisabled}>
                Google/GitHub OAuth redirects need server env vars — token sign-in works without
                them.
              </p>
            )}
          </form>
        ) : (
          <form onSubmit={handleEmailSubmit} className={styles.form}>
            {mode === 'email-register' && (
              <label>
                Name
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoComplete="name"
                />
              </label>
            )}
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="demo@heramb.dev"
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete={mode === 'email-login' ? 'current-password' : 'new-password'}
                placeholder="••••••••"
              />
            </label>

            {error && <p className={styles.error}>{error}</p>}

            <button type="submit" className={styles.submit} disabled={pending}>
              {pending
                ? 'Signing in…'
                : mode === 'email-login'
                  ? 'Sign in'
                  : 'Create account'}
            </button>

            <p className={styles.switch}>
              {mode === 'email-login' ? (
                <>
                  No account?{' '}
                  <button type="button" onClick={() => setMode('email-register')}>
                    Register
                  </button>
                  {' · Demo: '}
                  <button
                    type="button"
                    onClick={() => {
                      setEmail('demo@heramb.dev');
                      setPassword('heramb123');
                    }}
                  >
                    Use demo
                  </button>
                </>
              ) : (
                <>
                  Have an account?{' '}
                  <button type="button" onClick={() => setMode('email-login')}>
                    Sign in
                  </button>
                </>
              )}
            </p>
          </form>
        )}

        <Link to="/" className={styles.back}>
          ← Back to home
        </Link>
      </div>

      <aside className={styles.note}>
        <h3>Why tokens, not OAuth?</h3>
        <p>
          OAuth &quot;Sign in with Google/GitHub&quot; buttons need OAuth app credentials on the
          server. Heramb uses <strong>your existing provider tokens</strong> instead — the same
          ones you use for deploys.
        </p>
        <p>
          Tokens are verified live against GitHub, Railway, and Vercel APIs, then stored locally
          for the dashboard and CLI.
        </p>
        <p>
          No OpenAI key required. Optional AI fallback is in Settings after sign-in.
        </p>
      </aside>
    </div>
  );
}
