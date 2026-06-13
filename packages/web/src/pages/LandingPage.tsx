import { Link } from 'react-router-dom';
import { Terminal } from '../components/Terminal';
import { CopyButton } from '../components/CopyButton';
import { FEATURES, INSTALL_CMD } from '../data/demo';
import styles from './LandingPage.module.css';

export function LandingPage() {
  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <p className={styles.eyebrow}>Deployment orchestration CLI + dashboard</p>
          <h1 className={styles.headline}>
            Deploy ke vighna,
            <br />
            <span className={styles.highlight}>Heramb door kare</span>
          </h1>
          <p className={styles.subhead}>
            Scan your stack, pick the right platforms, wire env vars, solve CORS, test WebSockets —
            Railway, Vercel, Upstash and more. Zero copy-paste. Zero AI tokens on a clean deploy.
          </p>
          <div className={styles.heroActions}>
            <Link to="/dashboard" className={styles.primaryBtn}>
              Open dashboard
            </Link>
            <a href="#install" className={styles.secondaryBtn}>
              Install CLI
            </a>
          </div>
          <div className={styles.npmBlock} id="install">
            <div className={styles.npmHeader}>
              <span>npm</span>
              <CopyButton text={INSTALL_CMD} />
            </div>
            <code className={styles.npmCmd}>{INSTALL_CMD}</code>
          </div>
        </div>
        <div className={styles.heroTerminal}>
          <Terminal animate />
        </div>
      </section>

      <section className={styles.providers}>
        <p className={styles.providersLabel}>Works with your stack</p>
        <div className={styles.providerLogos}>
          {['Railway', 'Vercel', 'Upstash', 'Render', 'Netlify', 'Fly.io'].map((p) => (
            <span key={p} className={styles.providerChip}>
              {p}
            </span>
          ))}
        </div>
      </section>

      <section className={styles.features} id="features">
        <h2 className={styles.sectionTitle}>Why Heramb?</h2>
        <p className={styles.sectionDesc}>
          The hard part isn&apos;t deploying — it&apos;s the dependency graph between service URLs.
          Heramb models it, sorts it, and executes it.
        </p>
        <div className={styles.featureGrid}>
          {FEATURES.map((f) => (
            <article key={f.title} className={styles.featureCard}>
              <span className={styles.featureIcon}>{f.icon}</span>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.graph}>
        <h2 className={styles.sectionTitle}>The dependency graph</h2>
        <div className={styles.graphFlow}>
          {[
            ['REDIS_URL', '← Redis provider (first)'],
            ['BACKEND_URL', '← backend deploy'],
            ['WS_URL', '← derived (https → wss)'],
            ['NEXT_PUBLIC_*', '← frontend env aliases'],
            ['CORS_ORIGIN', '← patched after frontend deploy'],
          ].map(([key, desc]) => (
            <div key={key} className={styles.graphNode}>
              <code>{key}</code>
              <span>{desc}</span>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.ctaSection}>
        <div className={styles.ctaCard}>
          <h2>CLI for power. Dashboard for visibility.</h2>
          <p>
            Run <code>heramb deploy</code> in your terminal — watch the same pipeline live in the
            web dashboard. One config file. One mental model.
          </p>
          <div className={styles.ctaActions}>
            <Link to="/dashboard" className={styles.primaryBtn}>
              Try the dashboard
            </Link>
            <code className={styles.ctaCmd}>npm install -g @heramb/cli</code>
          </div>
        </div>
      </section>
    </div>
  );
}
