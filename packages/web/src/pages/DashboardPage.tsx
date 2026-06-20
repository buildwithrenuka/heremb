import { useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { DEPLOY_STEPS, SERVICES } from '../data/demo';
import { buildHerambConfig } from '../setup/build-config';
import { checklistProgress } from '../setup/checklists';
import { isSetupComplete, loadSetup } from '../setup/storage';
import styles from './DashboardPage.module.css';

type StepStatus = 'pending' | 'running' | 'done' | 'error';

interface LiveStep {
  id: number;
  label: string;
  value?: string;
  status: StepStatus;
}

function initialSteps(): LiveStep[] {
  return DEPLOY_STEPS.map((s) => ({
    id: s.id,
    label: s.label,
    status: 'pending' as StepStatus,
  }));
}

function setupServices(state: ReturnType<typeof loadSetup>) {
  const items: Array<{ name: string; provider: string; path: string; url: string; status: string }> =
    [];
  if (state.hasBackend) {
    items.push({
      name: 'backend',
      provider: state.backendProvider,
      path: state.backendPath,
      url: state.repoUrl || '—',
      status: 'configured',
    });
  }
  if (state.hasFrontend) {
    items.push({
      name: 'frontend',
      provider: state.frontendProvider,
      path: state.frontendPath,
      url: state.vercelProjectName ? `vercel:${state.vercelProjectName}` : '—',
      status: 'configured',
    });
  }
  if (state.hasRedis) {
    items.push({
      name: 'redis',
      provider: state.cacheProvider,
      path: '—',
      url: '—',
      status: 'configured',
    });
  }
  return items.length > 0 ? items : SERVICES;
}

export function DashboardPage() {
  const setup = useMemo(() => loadSetup(), []);
  const setupDone = isSetupComplete(setup);
  const { done, total } = checklistProgress(setup);
  const configPreview = useMemo(() => JSON.stringify(buildHerambConfig(setup), null, 2), [setup]);

  const [project] = useState(setup.projectName || 'my-chat-app');
  const [deploying, setDeploying] = useState(false);
  const [steps, setSteps] = useState<LiveStep[]>(initialSteps);
  const [unlocked, setUnlocked] = useState(false);
  const [aiCalls] = useState(0);

  const services = useMemo(() => setupServices(setup), [setup]);

  const runDeploy = useCallback(async () => {
    if (deploying) return;
    setDeploying(true);
    setUnlocked(false);
    setSteps(initialSteps());

    for (let i = 0; i < DEPLOY_STEPS.length; i++) {
      const step = DEPLOY_STEPS[i]!;

      setSteps((prev) =>
        prev.map((s) => (s.id === step.id ? { ...s, status: 'running' } : s))
      );

      await new Promise((r) => setTimeout(r, 400 + Math.random() * 300));

      setSteps((prev) =>
        prev.map((s) =>
          s.id === step.id ? { ...s, status: 'done', value: step.value } : s
        )
      );
    }

    setUnlocked(true);
    setDeploying(false);
  }, [deploying]);

  return (
    <div className={styles.page}>
      {!setupDone && (
        <div className={styles.setupBanner}>
          <div>
            <strong>Start with Setup</strong>
            <p>
              Add your GitHub repo URL, pick where backend and frontend deploy, and get a
              checklist before your first deploy.
            </p>
          </div>
          <Link to="/setup" className={styles.setupBannerBtn}>
            Open setup wizard →
          </Link>
        </div>
      )}

      {setupDone && done < total && (
        <div className={styles.setupBanner} data-variant="progress">
          <div>
            <strong>Setup in progress</strong>
            <p>
              Checklist {done}/{total} complete · repo{' '}
              <a href={setup.repoUrl} target="_blank" rel="noreferrer">
                {setup.repoUrl.replace(/^https:\/\/github.com\//, '')}
              </a>
            </p>
          </div>
          <Link to="/setup" className={styles.setupBannerBtn}>
            Continue checklist →
          </Link>
        </div>
      )}

      <header className={styles.topbar}>
        <div>
          <h1 className={styles.title}>Dashboard</h1>
          <p className={styles.subtitle}>
            Project <strong>{project}</strong>
            {setupDone ? ' · configured in Setup' : ' · demo mode'}
          </p>
        </div>
        <button
          type="button"
          className={styles.deployBtn}
          onClick={runDeploy}
          disabled={deploying}
        >
          {deploying ? 'Deploying…' : 'Run demo deploy'}
        </button>
      </header>

      <div className={styles.grid}>
        <section className={styles.pipeline}>
          <h2 className={styles.cardTitle}>Deploy pipeline</h2>
          <ul className={styles.stepList}>
            {steps.map((step) => (
              <li key={step.id} className={styles.stepItem} data-status={step.status}>
                <span className={styles.stepIndex}>
                  [{step.id}/{steps.length}]
                </span>
                <span className={styles.stepLabel}>{step.label}</span>
                <span className={styles.stepStatus}>
                  {step.status === 'done' && '✓'}
                  {step.status === 'running' && '…'}
                  {step.status === 'pending' && '○'}
                </span>
                {step.value && <span className={styles.stepValue}>{step.value}</span>}
              </li>
            ))}
          </ul>
          {unlocked && (
            <div className={styles.unlocked}>
              <span>🔑 Unlocked</span>
              <div className={styles.stats}>
                <span>AI calls: {aiCalls}</span>
                <span>Tokens: 0</span>
                <span>Cost: $0.00</span>
              </div>
            </div>
          )}
        </section>

        <aside className={styles.sidebar}>
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Services</h2>
            <ul className={styles.serviceList}>
              {services.map((svc) => (
                <li key={svc.name} className={styles.serviceItem}>
                  <div className={styles.serviceHead}>
                    <span className={styles.serviceName}>{svc.name}</span>
                    <span className={styles.serviceStatus} data-status={svc.status}>
                      {svc.status}
                    </span>
                  </div>
                  <span className={styles.serviceProvider}>
                    {svc.provider}
                    {'path' in svc && svc.path !== '—' ? ` · ${svc.path}` : ''}
                  </span>
                  {'url' in svc && svc.url.startsWith('http') ? (
                    <a href={svc.url} className={styles.serviceUrl} target="_blank" rel="noreferrer">
                      {svc.url}
                    </a>
                  ) : (
                    <span className={styles.serviceUrl}>{svc.url}</span>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Quick commands</h2>
            <div className={styles.cmdList}>
              {[
                'npx @heramb1/cli init',
                'npx @heramb1/cli deploy',
                'npx @heramb1/cli deploy --backend-only',
                'npx @heramb1/cli status',
              ].map((cmd) => (
                <code key={cmd} className={styles.cmd}>
                  {cmd}
                </code>
              ))}
            </div>
          </section>

          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Config</h2>
            <pre className={styles.configSnippet}>
              {setupDone ? configPreview : `{\n  "project": "${project}",\n  "services": { ... }\n}`}
            </pre>
            {setupDone && (
              <Link to="/setup" className={styles.editSetup}>
                Edit in Setup →
              </Link>
            )}
          </section>
        </aside>
      </div>

      <p className={styles.demoNote}>
        Pipeline animation is a demo. Real deploy: complete{' '}
        <Link to="/setup">Setup</Link>, save <code>heramb.config.json</code>, then run{' '}
        <code>npx @heramb1/cli deploy</code> from your repo.
      </p>
    </div>
  );
}
