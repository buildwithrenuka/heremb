import { CopyButton } from '../components/CopyButton';
import { INSTALL_CMD, NPM_PACKAGE_URL } from '../data/demo';
import styles from './LandingPage.module.css';

const PROBLEMS = [
  'Copy-pasting backend URLs into Vercel env vars after every deploy',
  'CORS errors that send you back to Railway to patch and redeploy',
  'Redis and WebSocket config wired wrong — Socket.io stuck on polling',
  'Same manual setup repeated for every preview branch and PR',
];

const SOLVES = [
  {
    title: 'Dependency graph engine',
    desc: 'Deploys Redis, backend, and frontend in the correct order — URLs flow automatically.',
  },
  {
    title: 'CORS handled for you',
    desc: 'Patches CORS_ORIGIN on the backend, redeploys, and verifies the preflight.',
  },
  {
    title: 'WebSocket smoke tests',
    desc: 'Detects Socket.io at init and tests the handshake before marking deploy complete.',
  },
  {
    title: 'One command previews',
    desc: 'Isolated preview environments per branch with fresh Redis and wired env vars.',
  },
];

const STEPS = [
  {
    num: '01',
    title: 'Install the npm package',
    desc: 'Add Heramb via npx for a quick start, or install globally if you deploy often.',
    code: 'npx @heramb1/cli --help',
  },
  {
    num: '02',
    title: 'Initialize your project',
    desc: 'Run init from your app repo root. Heramb scans your stack, detects frontend and backend paths, and creates heramb.config.json.',
    code: 'heramb init',
  },
  {
    num: '03',
    title: 'Connect your providers',
    desc: 'During init, paste API tokens for Railway, Vercel, and Upstash. Tokens are stored in ~/.heramb/keys.json — never commit this file.',
    code: '# prompted interactively during heramb init',
  },
  {
    num: '04',
    title: 'Deploy with one command',
    desc: 'Heramb provisions Redis, deploys backend and frontend, wires env vars, patches CORS, and smoke-tests WebSockets.',
    code: 'heramb deploy',
  },
  {
    num: '05',
    title: 'Check status anytime',
    desc: 'See live status across all providers, tail logs, or spin up a preview environment for your branch.',
    code: 'heramb status\nheramb deploy --env preview --branch feat/my-feature',
  },
];

const USE_CASES = [
  {
    title: 'First production deploy',
    who: 'Solo founder shipping a real-time SaaS before a demo',
    situation:
      'Next.js on Vercel, Express + Socket.io on Railway, Redis on Upstash — never deployed this stack before.',
    why: 'Heramb catches hardcoded ports, wires Redis for Socket.io, solves CORS, and smoke-tests WebSockets before you call it done.',
    command: 'heramb init && heramb deploy',
  },
  {
    title: 'Preview environments per PR',
    who: 'Startup team merging 10+ feature branches a day',
    situation:
      'Every PR needs its own frontend URL, backend URL, and fresh Redis — with CORS that changes every time.',
    why: 'One command provisions an isolated preview, wires all env vars, and patches CORS for the unique preview URL.',
    command: 'heramb deploy --env preview --branch feat/my-feature',
  },
  {
    title: 'Provider migration',
    who: 'Team moving off Heroku or another dying platform',
    situation:
      'Live users, zero downtime tolerance, and dozens of env vars spread across dashboards.',
    why: 'Heramb reads env vars from the source, deploys to the new provider, updates frontend config, and validates before switchover.',
    command: 'heramb migrate backend --from heroku --to render',
  },
  {
    title: 'Agency with many client stacks',
    who: 'Dev shop deploying 5 different projects a week',
    situation:
      'Each client uses a different provider combo — Vercel + Railway, Netlify + Render, and so on.',
    why: 'Same workflow everywhere: one config file per project, same `heramb deploy` command, unified `heramb status`.',
    command: 'heramb deploy',
  },
  {
    title: 'Recurring CORS failures',
    who: 'Developer who breaks production every time a preview URL changes',
    situation:
      'Backend CORS_ORIGIN falls out of sync with the frontend URL after every deploy.',
    why: 'CORS patching is a pipeline step — Heramb will not mark deploy complete until CORS is set and verified.',
    command: 'heramb deploy',
  },
  {
    title: 'CI/CD without config drift',
    who: 'Team with a 300-line GitHub Actions deploy workflow',
    situation:
      'Env vars duplicated across GitHub Actions, Railway dashboard, and Vercel dashboard — always out of sync.',
    why: 'heramb.config.json is the single source of truth. Your workflow becomes a few lines, not hundreds.',
    command: 'npx heramb deploy',
  },
];

const APPROACHES = [
  {
    approach: 'Manual dashboards',
    scope: 'You open each provider UI separately',
    wiring: 'Copy-paste URLs and env vars by hand',
    cors: 'Fix yourself after something breaks',
    ws: 'Debug yourself when polling fails',
    bestFor: 'One-off deploys when you know the stack well',
  },
  {
    approach: 'Single-platform CLI',
    scope: 'Deploy one service to one host',
    wiring: 'Other services still need manual wiring',
    cors: 'Not part of the deploy flow',
    ws: 'Not verified as part of deploy',
    bestFor: 'When your entire app lives on one platform',
  },
  {
    approach: 'Heramb',
    scope: 'Orchestrate frontend, backend, and Redis together',
    wiring: 'Dependency graph — URLs flow in order',
    cors: 'Patched and verified every deploy',
    ws: 'Smoke-tested before deploy completes',
    bestFor: 'Full-stack apps split across 2+ platforms',
    highlight: true,
  },
];

export function LandingPage() {
  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroGlass}>
        <p className={styles.eyebrow}>Deployment orchestration CLI</p>
        <a
          href={NPM_PACKAGE_URL}
          className={styles.npmBadge}
          target="_blank"
          rel="noreferrer"
        >
          View on npm · <code>@heramb1/cli</code>
        </a>
        <h1 className={styles.headline}>
          Deploy full-stack apps
          <span className={styles.highlight}> without the dashboard tab circus</span>
        </h1>
        <p className={styles.subhead}>
          Heramb is the npm CLI that wires your frontend, backend, Redis, and environment
          variables across Railway, Vercel, and Upstash — in the right order, with zero
          copy-paste.
        </p>
        <div className={styles.heroActions}>
          <a href="#install" className={styles.primaryBtn}>
            Get started
          </a>
          <a href="#usecases" className={styles.secondaryBtn}>
            See use cases
          </a>
          <a
            href={NPM_PACKAGE_URL}
            className={styles.secondaryBtn}
            target="_blank"
            rel="noreferrer"
          >
            npm package
          </a>
        </div>
        <div className={styles.heroStats}>
          <div className={styles.stat}>
            <span className={styles.statNum}>2</span>
            <span className={styles.statLabel}>commands to ship</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statNum}>0</span>
            <span className={styles.statLabel}>AI tokens on clean deploy</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statNum}>4+</span>
            <span className={styles.statLabel}>providers supported</span>
          </div>
        </div>
        </div>
      </section>

      <section id="problem" className={`${styles.section} ${styles.glassSection}`}>
        <p className={styles.sectionEyebrow}>The problem</p>
        <h2 className={styles.sectionTitle}>Deploying is easy. Wiring everything together is not.</h2>
        <p className={styles.sectionLead}>
          Modern apps span multiple platforms. Each service needs URLs from the others before it
          can start — and most teams solve that manually, every single time.
        </p>
        <ul className={styles.problemList}>
          {PROBLEMS.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <div className={styles.solutionGrid}>
          {SOLVES.map((item) => (
            <article key={item.title} className={styles.solutionCard}>
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="compare" className={styles.section}>
        <p className={styles.sectionEyebrow}>Why Heramb</p>
        <h2 className={styles.sectionTitle}>Built for apps that span multiple platforms</h2>
        <p className={styles.sectionLead}>
          Heramb does not replace your hosting providers — it sits above them and handles the
          wiring between services: env vars, deploy order, CORS, and WebSocket checks.
        </p>
        <div className={styles.compareWrap}>
          <table className={styles.compareTable}>
            <thead>
              <tr>
                <th>Approach</th>
                <th>What it covers</th>
                <th>Cross-service wiring</th>
                <th>CORS</th>
                <th>WebSocket check</th>
              </tr>
            </thead>
            <tbody>
              {APPROACHES.map((row) => (
                <tr key={row.approach} className={row.highlight ? styles.compareHighlight : undefined}>
                  <td>
                    <strong>{row.approach}</strong>
                    <span className={styles.compareBestFor}>{row.bestFor}</span>
                  </td>
                  <td>{row.scope}</td>
                  <td>{row.wiring}</td>
                  <td>
                    <span className={row.highlight ? styles.yes : styles.no}>{row.cors}</span>
                  </td>
                  <td>
                    <span className={row.highlight ? styles.yes : styles.no}>{row.ws}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className={styles.compareSummary}>
          <div className={styles.comparePoint}>
            <strong>What Heramb is</strong>
            <p>
              A deployment orchestration CLI. Run <code>heramb init</code> once, then{' '}
              <code>heramb deploy</code> whenever you ship. It provisions Redis, deploys backend
              and frontend, wires env vars in the right order, patches CORS, and smoke-tests
              WebSockets.
            </p>
          </div>
          <div className={styles.comparePoint}>
            <strong>What Heramb is not</strong>
            <p>
              Not a hosting provider, not infrastructure-as-code, and not a replacement for
              platform-specific deploy tools. It orchestrates the gap between services that those
              tools were never designed to connect.
            </p>
          </div>
          <div className={styles.comparePoint}>
            <strong>When to reach for it</strong>
            <p>
              When your frontend, backend, and Redis live on different platforms and you are tired
              of being the glue — copy-pasting URLs, fixing CORS, and re-running the same steps on
              every preview branch.
            </p>
          </div>
        </div>
      </section>

      <section id="usecases" className={`${styles.section} ${styles.glassSection}`}>
        <p className={styles.sectionEyebrow}>Use cases</p>
        <h2 className={styles.sectionTitle}>Where Heramb is the perfect tool</h2>
        <p className={styles.sectionLead}>
          Heramb shines whenever two or more platforms need to know about each other — and that
          information only exists after one of them deploys.
        </p>
        <div className={styles.useCaseGrid}>
          {USE_CASES.map((item) => (
            <article key={item.title} className={styles.useCaseCard}>
              <h3>{item.title}</h3>
              <p className={styles.useCaseWho}>{item.who}</p>
              <p className={styles.useCaseSituation}>{item.situation}</p>
              <p className={styles.useCaseWhy}>
                <strong>Why Heramb:</strong> {item.why}
              </p>
              <code className={styles.useCaseCmd}>{item.command}</code>
            </article>
          ))}
        </div>
        <div className={styles.useCaseSummary}>
          <p>
            <strong>The common thread:</strong> if a human is the glue between platforms —
            copy-pasting URLs, updating dashboards, remembering deploy order — Heramb replaces that
            glue with an orchestrated pipeline. Especially when WebSockets, Redis, or preview
            branches are involved.
          </p>
        </div>
      </section>

      <section id="steps" className={styles.section}>
        <p className={styles.sectionEyebrow}>How to use Heramb</p>
        <h2 className={styles.sectionTitle}>Five steps from install to production</h2>
        <p className={styles.sectionLead}>
          No dashboard juggling. Run these commands from your application repo root.
        </p>
        <ol className={styles.steps}>
          {STEPS.map((step) => (
            <li key={step.num} className={styles.step}>
              <span className={styles.stepNum}>{step.num}</span>
              <div className={styles.stepBody}>
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
                <div className={styles.codeBlock}>
                  <div className={styles.codeHeader}>
                    <span>Terminal</span>
                    <CopyButton text={step.code} />
                  </div>
                  <pre>{step.code}</pre>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section id="install" className={styles.section}>
        <p className={styles.sectionEyebrow}>Quick start</p>
        <h2 className={styles.sectionTitle}>Copy, paste, deploy</h2>
        <p className={styles.sectionLead}>
          Package:{' '}
          <a href={NPM_PACKAGE_URL} className={styles.npmTextLink} target="_blank" rel="noreferrer">
            <code>@heramb1/cli</code>
          </a>{' '}
          · CLI command: <code>heramb</code> · Requires Node.js 18+
        </p>
        <div className={styles.installBlock}>
          <div className={styles.codeHeader}>
            <span>npm</span>
            <CopyButton text={INSTALL_CMD} />
          </div>
          <pre className={styles.installCmd}>{INSTALL_CMD}</pre>
        </div>
        <div className={styles.installOptions}>
          <div className={styles.option}>
            <strong>Global install</strong>
            <code>npm install -g @heramb1/cli</code>
          </div>
          <div className={styles.option}>
            <strong>Dev dependency</strong>
            <code>npm install --save-dev @heramb1/cli</code>
          </div>
        </div>
      </section>

      <section className={styles.finalCta}>
        <h2>Ready to remove the obstacles?</h2>
        <p>Install once. Init once. Deploy whenever you ship.</p>
        <a href="#install" className={styles.primaryBtn}>
          Get started
        </a>
      </section>
    </div>
  );
}
