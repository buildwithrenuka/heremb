import { Link } from 'react-router-dom';
import { CopyButton } from '../components/CopyButton';
import { DEPLOY_STEPS, INSTALL_CMD } from '../data/demo';
import styles from './GuidePage.module.css';

function CodeBlock({ label, code }: { label: string; code: string }) {
  return (
    <div className={styles.codeBlock}>
      <div className={styles.codeHeader}>
        <span>{label}</span>
        <CopyButton text={code} />
      </div>
      <pre className={styles.code}>{code}</pre>
    </div>
  );
}

function SectionHeader({
  icon,
  title,
  subtitle,
}: {
  icon: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className={styles.sectionHeader}>
      <span className={styles.sectionIcon} aria-hidden>
        {icon}
      </span>
      <div className={styles.sectionHeaderText}>
        <h2>{title}</h2>
        {subtitle && <p className={styles.sectionSubtitle}>{subtitle}</p>}
      </div>
    </div>
  );
}

const TOC = [
  { id: 'problem', label: 'The problem' },
  { id: 'solution', label: 'What Heramb solves' },
  { id: 'install', label: 'Install' },
  { id: 'first-deploy', label: 'First deploy' },
  { id: 'how-it-works', label: 'How it works' },
  { id: 'commands', label: 'Commands' },
  { id: 'tokens', label: 'API tokens' },
  { id: 'config', label: 'Configuration' },
  { id: 'troubleshoot', label: 'Troubleshooting' },
];

const COMMANDS = [
  { cmd: 'heramb init', desc: 'Scan repo, detect stack, store tokens, write heramb.config.json' },
  { cmd: 'heramb deploy', desc: 'Full orchestrated deploy with automatic dependency resolution' },
  { cmd: 'heramb deploy --backend-only', desc: 'Deploy backend and Redis only; skip frontend' },
  { cmd: 'heramb deploy --frontend-only', desc: 'Deploy frontend only; skip backend and Redis' },
  { cmd: 'heramb deploy --env preview --branch feat/x', desc: 'Isolated preview environment per branch' },
  { cmd: 'heramb status', desc: 'Unified live status across all configured providers' },
  { cmd: 'heramb env push', desc: 'Sync local .env values to every connected service' },
  { cmd: 'heramb logs <service>', desc: 'Stream logs from backend, frontend, or redis' },
  { cmd: 'heramb ws test [url]', desc: 'Run a WebSocket handshake smoke test' },
  { cmd: 'heramb migrate [service]', desc: 'Move a service to a different provider with a plan' },
];

const GRAPH = [
  ['REDIS_URL', 'Provisioned first — backend depends on it'],
  ['BACKEND_URL', 'Backend deploy receives REDIS_URL automatically'],
  ['WS_URL', 'Derived from backend URL (https → wss)'],
  ['NEXT_PUBLIC_*', 'Public env aliases injected into frontend'],
  ['CORS_ORIGIN', 'Patched on backend after frontend URL is known'],
];

const SOLUTIONS = [
  {
    title: 'Env var wiring',
    desc: 'URLs flow between services in the correct order. No copy-pasting between Railway, Vercel, and Upstash dashboards.',
  },
  {
    title: 'CORS solved',
    desc: 'The chicken-and-egg between backend and frontend is handled automatically — patch, redeploy, verify.',
  },
  {
    title: 'WebSocket ready',
    desc: 'Socket.io and Redis adapter detected at init. Handshake tested before deploy is marked complete.',
  },
  {
    title: 'Preview environments',
    desc: 'One command per branch — fresh Redis, wired CORS, unique preview URLs for every PR.',
  },
];

export function GuidePage() {
  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroPattern} aria-hidden />
        <div className={styles.heroInner}>
          <div className={styles.badgeRow}>
            <span className={styles.omBadge}>🙏 Heramb · Remover of obstacles</span>
            <span className={styles.eyebrow}>Official user guide</span>
          </div>
          <h1 className={styles.title}>
            Deploy full-stack apps with{' '}
            <span className={styles.highlight}>@heramb1/cli</span>
            <span className={styles.tagline}>Deploy ke vighna, Heramb door kare.</span>
          </h1>
          <p className={styles.lead}>
            Heramb is a deployment orchestration CLI that connects your frontend, backend, Redis, and
            environment variables across Railway, Vercel, Upstash, and Netlify — in the right order,
            without dashboard tab juggling.
          </p>
          <div className={styles.heroMeta}>
            <span className={styles.metaChip}>
              npm: <code>@heramb1/cli</code>
            </span>
            <span className={styles.metaChip}>Node.js 18+</span>
            <span className={styles.metaChip}>Zero AI on clean deploy</span>
            <span className={styles.metaChip}>MIT License</span>
          </div>
        </div>
      </header>

      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <span className={styles.statValue}>2</span>
          <span className={styles.statLabel}>Commands to ship</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>10</span>
          <span className={styles.statLabel}>Automated deploy steps</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>0</span>
          <span className={styles.statLabel}>AI tokens (happy path)</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>4+</span>
          <span className={styles.statLabel}>Providers supported</span>
        </div>
      </div>

      <div className={styles.quickStart}>
        <article className={styles.quickCard}>
          <span className={styles.quickNum}>1</span>
          <h3>Install the package</h3>
          <p>
            Run via <code>npx @heramb1/cli</code>, install globally, or add as a dev dependency for
            your team.
          </p>
        </article>
        <article className={styles.quickCard}>
          <span className={styles.quickNum}>2</span>
          <h3>Initialize your project</h3>
          <p>
            <code>heramb init</code> scans your stack, connects providers, and writes{' '}
            <code>heramb.config.json</code>.
          </p>
        </article>
        <article className={styles.quickCard}>
          <span className={styles.quickNum}>3</span>
          <h3>Deploy with one command</h3>
          <p>
            <code>heramb deploy</code> runs the full pipeline — Redis, backend, frontend, CORS, and
            WebSocket verification.
          </p>
        </article>
      </div>

      <nav className={styles.toc} aria-label="Guide sections">
        {TOC.map((item) => (
          <a key={item.id} href={`#${item.id}`} className={styles.tocLink}>
            {item.label}
          </a>
        ))}
      </nav>

      <div className={styles.sections}>
        <section id="problem" className={styles.section}>
          <SectionHeader
            icon="⚠"
            title="The problem every full-stack dev knows"
            subtitle="Deploying is easy. Wiring everything together is not."
          />
          <div className={styles.sectionBody}>
            <p>
              Modern apps rarely live on one platform. Your React frontend goes to Vercel, your API
              to Railway, Redis to Upstash — and each service needs URLs from the others before it can
              start. That creates a dependency maze most teams solve manually.
            </p>
            <div className={styles.problemGrid}>
              <div className={`${styles.problemCard} ${styles.problemCardBad}`}>
                <span className={`${styles.problemLabel} ${styles.problemLabelBad}`}>
                  Without Heramb
                </span>
                <h4>Hours of manual work</h4>
                <ul className={styles.problemList}>
                  <li>Copy backend URL into Vercel env vars by hand</li>
                  <li>Deploy frontend, hit CORS errors, go back to Railway</li>
                  <li>Forget to set REDIS_URL — Socket.io falls back to polling</li>
                  <li>Hardcoded ports crash on Railway (needs process.env.PORT)</li>
                  <li>Repeat the same steps for every preview branch</li>
                  <li>Three dashboards open, none in sync</li>
                </ul>
              </div>
              <div className={`${styles.problemCard} ${styles.problemCardGood}`}>
                <span className={`${styles.problemLabel} ${styles.problemLabelGood}`}>
                  With Heramb
                </span>
                <h4>Two commands, done</h4>
                <ul className={styles.problemList}>
                  <li>Stack detected and warnings shown before deploy starts</li>
                  <li>Env vars wired in topological order automatically</li>
                  <li>CORS patched and backend redeployed — verified</li>
                  <li>WebSocket handshake smoke-tested before success</li>
                  <li>Preview environments: one flag per branch</li>
                  <li>One CLI, one config file, one deploy command</li>
                </ul>
              </div>
            </div>
            <CodeBlock label="The entire workflow" code={'heramb init\nheramb deploy'} />
          </div>
        </section>

        <section id="solution" className={styles.section}>
          <SectionHeader
            icon="🐘"
            title="What Heramb solves"
            subtitle="Named after Heramb — another name for Ganpati Bappa, the remover of obstacles."
          />
          <div className={styles.sectionBody}>
            <p>
              Heramb models your deployment as a <strong>dependency graph</strong>, topologically
              sorts every step, and executes them in order. It removes the obstacles between your
              code and production — env wiring, CORS, WebSockets, and preview environments included.
            </p>
            <div className={styles.solutionCards}>
              {SOLUTIONS.map((s) => (
                <div key={s.title} className={styles.solutionCard}>
                  <h4>{s.title}</h4>
                  <p>{s.desc}</p>
                </div>
              ))}
            </div>
            <div className={styles.tipBox}>
              <strong>Clean deploys use zero AI tokens.</strong> Heramb only calls AI (~300 tokens)
              when something genuinely unexpected breaks — never on the happy path, and never during{' '}
              <code>init</code> or <code>deploy</code>.
            </div>
          </div>
        </section>

        <section id="install" className={styles.section}>
          <SectionHeader
            icon="📦"
            title="Install the npm package"
            subtitle="Package name: @heramb1/cli · CLI command: heramb"
          />
          <div className={styles.sectionBody}>
            <p>
              Heramb is published on npm as <strong>@heramb1/cli</strong>. Choose the install method
              that fits your workflow:
            </p>
            <div className={styles.installGrid}>
              <div className={styles.installCard}>
                <h4>
                  npx
                  <span className={styles.recommended}>Recommended</span>
                </h4>
                <p>No install required. Always runs the latest version. Ideal for first-time setup.</p>
                <pre>{'npx @heramb1/cli init\nnpx @heramb1/cli deploy'}</pre>
              </div>
              <div className={styles.installCard}>
                <h4>Global install</h4>
                <p>Best if you deploy frequently from any directory on your machine.</p>
                <pre>{'npm install -g @heramb1/cli\nheramb init\nheramb deploy'}</pre>
              </div>
              <div className={styles.installCard}>
                <h4>Dev dependency</h4>
                <p>Pin a version for your team and CI pipelines.</p>
                <pre>{'npm install --save-dev @heramb1/cli\nnpx heramb deploy'}</pre>
              </div>
            </div>
            <p>Add to your <code>package.json</code> scripts for repeatable deploys:</p>
            <CodeBlock
              label="package.json scripts"
              code={`{
  "scripts": {
    "deploy": "heramb deploy",
    "deploy:preview": "heramb deploy --env preview --branch $(git branch --show-current)"
  }
}`}
            />
            <CodeBlock label="Quick start — copy and run" code={INSTALL_CMD} />
          </div>
        </section>

        <section id="first-deploy" className={styles.section}>
          <SectionHeader
            icon="🚀"
            title="Your first deployment"
            subtitle="Run these two commands from your application repo root."
          />
          <div className={styles.sectionBody}>
            <CodeBlock label="Terminal" code={'cd my-app\nheramb init\nheramb deploy'} />

            <p>
              <strong>heramb init</strong> — one-time project setup:
            </p>
            <ol>
              <li>Scans your repo (package.json, frameworks, Socket.io, Redis adapter)</li>
              <li>Detects frontend and backend paths; surfaces warnings before deploy</li>
              <li>Lets you choose providers: Railway, Vercel, Upstash, Netlify</li>
              <li>Stores API tokens securely in <code>~/.heramb/keys.json</code> (never commit)</li>
              <li>Generates <code>heramb.config.json</code> in your project root (commit this)</li>
            </ol>

            <p>
              <strong>heramb deploy</strong> — automated pipeline ({DEPLOY_STEPS.length} steps):
            </p>
            <div className={styles.pipeline}>
              {DEPLOY_STEPS.map((step) => (
                <div key={step.id} className={styles.pipelineStep}>
                  <strong>{step.label.replace('...', '')}</strong>
                  <span>{step.value}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className={styles.section}>
          <SectionHeader
            icon="⛓"
            title="How the dependency graph works"
            subtitle="Every env var knows where it comes from and where it goes."
          />
          <div className={styles.sectionBody}>
            <p>
              Heramb resolves environment variables in topological order. Each step produces outputs
              that downstream services consume — no manual URL management required.
            </p>
            <div className={styles.graphFlow}>
              {GRAPH.map(([key, desc]) => (
                <div key={key} className={styles.graphNode}>
                  <code>{key}</code>
                  <span>{desc}</span>
                </div>
              ))}
            </div>
            <p>
              <strong>CORS circular dependency:</strong> Heramb temporarily sets{' '}
              <code>CORS_ORIGIN=*</code>, deploys the frontend, captures its URL, patches the backend,
              redeploys, and verifies the preflight — so you never have to understand the
              chicken-and-egg problem yourself.
            </p>
          </div>
        </section>

        <section id="commands" className={styles.section}>
          <SectionHeader icon="⌨" title="CLI command reference" />
          <div className={styles.sectionBody}>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Command</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {COMMANDS.map((row) => (
                    <tr key={row.cmd}>
                      <td>
                        <code>{row.cmd}</code>
                      </td>
                      <td>{row.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p>Preview environment for a feature branch:</p>
            <CodeBlock
              label="Preview deploy"
              code={'git checkout feat/new-dashboard\nheramb deploy --env preview --branch feat/new-dashboard'}
            />
          </div>
        </section>

        <section id="tokens" className={styles.section}>
          <SectionHeader
            icon="🔑"
            title="Provider API tokens"
            subtitle="Required for real deploys. Stored locally, never in your repo."
          />
          <div className={styles.sectionBody}>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Provider</th>
                    <th>Where to get your token</th>
                    <th>Where to enter it in Heramb</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Railway</td>
                    <td>
                      <a href="https://railway.app/account/tokens" target="_blank" rel="noreferrer">
                        railway.app/account/tokens
                      </a>
                    </td>
                    <td>
                      <code>heramb init</code> or web <Link to="/settings">Settings</Link>
                    </td>
                  </tr>
                  <tr>
                    <td>Vercel</td>
                    <td>
                      <a href="https://vercel.com/account/tokens" target="_blank" rel="noreferrer">
                        vercel.com/account/tokens
                      </a>
                    </td>
                    <td>
                      <code>heramb init</code> or web <Link to="/settings">Settings</Link>
                    </td>
                  </tr>
                  <tr>
                    <td>Upstash</td>
                    <td>
                      <a href="https://console.upstash.com" target="_blank" rel="noreferrer">
                        console.upstash.com
                      </a>
                    </td>
                    <td>
                      <code>heramb init</code> or web <Link to="/settings">Settings</Link>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p>
              Tokens are saved to <code>~/.heramb/keys.json</code>. An OpenAI key is optional and only
              used as a fallback for unknown deploy errors — Heramb never prompts for it during{' '}
              <code>init</code> or <code>deploy</code>.
            </p>
          </div>
        </section>

        <section id="config" className={styles.section}>
          <SectionHeader
            icon="⚙"
            title="Project configuration"
            subtitle="Generated by heramb init — describes your services and env mappings."
          />
          <div className={styles.sectionBody}>
            <CodeBlock
              label="heramb.config.json (simplified)"
              code={`{
  "project": "my-chat-app",
  "services": {
    "redis": { "provider": "upstash", "produces": ["REDIS_URL"] },
    "backend": {
      "provider": "railway",
      "path": "./backend",
      "needs": ["REDIS_URL"],
      "produces": ["BACKEND_URL"]
    },
    "frontend": {
      "provider": "vercel",
      "path": "./frontend",
      "needs": ["NEXT_PUBLIC_API_URL", "NEXT_PUBLIC_WS_URL"]
    }
  }
}`}
            />
            <p>
              Set manual secrets (JWT_SECRET, DATABASE_URL) in your local <code>.env</code>, then run{' '}
              <code>heramb env push</code> to sync them to all services. Prefer a guided walkthrough?{' '}
              <Link to="/setup">Open the setup wizard →</Link>
            </p>
          </div>
        </section>

        <section id="troubleshoot" className={styles.section}>
          <SectionHeader icon="🛠" title="Troubleshooting" />
          <div className={styles.sectionBody}>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Symptom</th>
                    <th>Fix</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>CORS errors after deploy</td>
                    <td>
                      Re-run <code>heramb deploy</code> — CORS is auto-patched and verified
                    </td>
                  </tr>
                  <tr>
                    <td>Backend crashes on Railway</td>
                    <td>
                      Use <code>process.env.PORT</code> — never hardcode port 3000
                    </td>
                  </tr>
                  <tr>
                    <td>Socket.io stuck on polling</td>
                    <td>
                      Add <code>@socket.io/redis-adapter</code>; Heramb injects REDIS_URL
                    </td>
                  </tr>
                  <tr>
                    <td>Invalid or expired token</td>
                    <td>
                      Update <code>~/.heramb/keys.json</code> or re-run <code>heramb init</code>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>

      <div className={styles.cta}>
        <div className={styles.ctaOm} aria-hidden>
          🙏
        </div>
        <h2>Ready to remove the obstacles?</h2>
        <p>
          Install the npm package, run init once, and deploy. Heramb handles the rest — from Redis
          provisioning to WebSocket verification.
        </p>
        <div className={styles.ctaActions}>
          <Link to="/dashboard" className={styles.primaryBtn}>
            Open dashboard
          </Link>
          <Link to="/setup" className={styles.secondaryBtn}>
            Setup wizard
          </Link>
        </div>
      </div>

      <p className={styles.repoNote}>
        Full documentation: <code>docs/user-guide.md</code> · Live at{' '}
        <a href="https://heramb.pages.dev/guide">heramb.pages.dev/guide</a>
      </p>
    </div>
  );
}
