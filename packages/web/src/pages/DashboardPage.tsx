import { useState, useCallback } from 'react';
import { DEPLOY_STEPS, SERVICES } from '../data/demo';
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

export function DashboardPage() {
  const [project] = useState('my-chat-app');
  const [deploying, setDeploying] = useState(false);
  const [steps, setSteps] = useState<LiveStep[]>(initialSteps);
  const [unlocked, setUnlocked] = useState(false);
  const [aiCalls] = useState(0);

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
      <header className={styles.topbar}>
        <div>
          <h1 className={styles.title}>Dashboard</h1>
          <p className={styles.subtitle}>
            Project <strong>{project}</strong> · demo mode
          </p>
        </div>
        <button
          type="button"
          className={styles.deployBtn}
          onClick={runDeploy}
          disabled={deploying}
        >
          {deploying ? 'Deploying…' : 'Run deploy'}
        </button>
      </header>

      <div className={styles.grid}>
        <section className={styles.pipeline}>
          <h2 className={styles.cardTitle}>Deploy pipeline</h2>
          <ul className={styles.stepList}>
            {steps.map((step) => (
              <li key={step.id} className={styles.stepItem} data-status={step.status}>
                <span className={styles.stepIndex}>[{step.id}/{steps.length}]</span>
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
              {SERVICES.map((svc) => (
                <li key={svc.name} className={styles.serviceItem}>
                  <div className={styles.serviceHead}>
                    <span className={styles.serviceName}>{svc.name}</span>
                    <span className={styles.serviceStatus} data-status={svc.status}>
                      {svc.status}
                    </span>
                  </div>
                  <span className={styles.serviceProvider}>{svc.provider}</span>
                  <a href={svc.url} className={styles.serviceUrl} target="_blank" rel="noreferrer">
                    {svc.url}
                  </a>
                </li>
              ))}
            </ul>
          </section>

          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Quick commands</h2>
            <div className={styles.cmdList}>
              {[
                'heramb init',
                'heramb deploy',
                'heramb deploy --env preview --branch feat/x',
                'heramb status',
                'heramb ws test',
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
{`{
  "project": "${project}",
  "services": {
    "redis": { "provider": "upstash" },
    "backend": { "provider": "railway" },
    "frontend": { "provider": "vercel" }
  }
}`}
            </pre>
          </section>
        </aside>
      </div>

      <p className={styles.demoNote}>
        Demo dashboard — connect your repo with <code>heramb init</code> to see live status from
        Railway, Vercel, and Upstash.
      </p>
    </div>
  );
}
