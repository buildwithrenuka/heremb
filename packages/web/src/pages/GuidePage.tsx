import { Link } from 'react-router-dom';
import styles from './GuidePage.module.css';

const SECTIONS = [
  {
    id: 'install',
    title: 'Install',
    content: (
      <>
        <p>Run Heramb without a global install:</p>
        <pre className={styles.code}>npx @heramb/cli init{'\n'}npx @heramb/cli deploy</pre>
        <p>Or install globally:</p>
        <pre className={styles.code}>npm install -g @heramb/cli{'\n'}heramb deploy</pre>
      </>
    ),
  },
  {
    id: 'first-deploy',
    title: 'First deploy',
    content: (
      <>
        <p>In your application repo:</p>
        <pre className={styles.code}>heramb init{'\n'}heramb deploy</pre>
        <p>
          <code>init</code> detects your stack and writes <code>heramb.config.json</code>.{' '}
          <code>deploy</code> runs the full orchestration pipeline — Redis, backend, frontend, CORS,
          and WebSocket smoke test.
        </p>
      </>
    ),
  },
  {
    id: 'commands',
    title: 'CLI commands',
    content: (
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Command</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>heramb init</code>
            </td>
            <td>Scan repo, detect stack, store tokens</td>
          </tr>
          <tr>
            <td>
              <code>heramb deploy</code>
            </td>
            <td>Full orchestrated deploy</td>
          </tr>
          <tr>
            <td>
              <code>heramb deploy --env preview --branch feat/x</code>
            </td>
            <td>Isolated preview environment</td>
          </tr>
          <tr>
            <td>
              <code>heramb status</code>
            </td>
            <td>Unified status across providers</td>
          </tr>
          <tr>
            <td>
              <code>heramb env push</code>
            </td>
            <td>Sync local .env to all services</td>
          </tr>
          <tr>
            <td>
              <code>heramb ws test [url]</code>
            </td>
            <td>WebSocket smoke test</td>
          </tr>
        </tbody>
      </table>
    ),
  },
  {
    id: 'auth',
    title: 'Sign in',
    content: (
      <>
        <p>Multiple sign-in methods are available on the login page:</p>
        <ul>
          <li>Email + password (demo: <code>demo@heramb.dev</code> / <code>heramb123</code>)</li>
          <li>Paste GitHub, Railway, or Vercel tokens — no OAuth setup required</li>
          <li>GitHub and Google OAuth (optional, requires API env vars)</li>
        </ul>
        <p>
          <Link to="/login">Go to sign in →</Link>
        </p>
      </>
    ),
  },
  {
    id: 'config',
    title: 'Configuration',
    content: (
      <>
        <p>
          Provider tokens are stored in <code>~/.heramb/keys.json</code> (CLI) or in the web{' '}
          <Link to="/settings">Settings</Link> page after sign-in.
        </p>
        <p>
          Project config lives in <code>heramb.config.json</code> at your app root. See the example
          in the repo: <code>heramb.config.example.json</code>.
        </p>
      </>
    ),
  },
  {
    id: 'api',
    title: 'API reference',
    content: (
      <>
        <p>
          Interactive API docs (Scalar) are available when the API is running:
        </p>
        <p>
          <a href="/docs" target="_blank" rel="noreferrer">
            Open API docs →
          </a>
        </p>
        <p>
          OpenAPI spec at <code>/openapi.json</code>. Health check at <code>/health</code>.
        </p>
      </>
    ),
  },
];

export function GuidePage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Documentation</p>
        <h1 className={styles.title}>User guide</h1>
        <p className={styles.lead}>
          Everything you need to deploy with Heramb — from first install to provider tokens and API
          reference.
        </p>
      </header>

      <nav className={styles.toc}>
        {SECTIONS.map((s) => (
          <a key={s.id} href={`#${s.id}`} className={styles.tocLink}>
            {s.title}
          </a>
        ))}
      </nav>

      <div className={styles.sections}>
        {SECTIONS.map((s) => (
          <section key={s.id} id={s.id} className={styles.section}>
            <h2>{s.title}</h2>
            <div className={styles.sectionBody}>{s.content}</div>
          </section>
        ))}
      </div>

      <p className={styles.repoNote}>
        Full markdown guides are in the <code>docs/</code> folder in the repository.
      </p>
    </div>
  );
}
