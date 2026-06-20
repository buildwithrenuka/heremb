import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CopyButton } from '../components/CopyButton';
import { configJson } from '../setup/build-config';
import { checklistProgress, visibleChecklists } from '../setup/checklists';
import { isSetupComplete, loadSetup, repoSlug, saveSetup } from '../setup/storage';
import type { SetupState } from '../setup/types';
import styles from './SetupPage.module.css';

const STEPS = [
  { title: 'Repo', label: 'GitHub & project' },
  { title: 'Platforms', label: 'Where to deploy' },
  { title: 'Checklist', label: 'Setup & deploy' },
];

const BACKEND_PROVIDERS = [
  { id: 'railway', name: 'Railway', implemented: true },
  { id: 'render', name: 'Render', implemented: false },
  { id: 'fly', name: 'Fly.io', implemented: false },
  { id: 'heroku', name: 'Heroku', implemented: false },
] as const;

const FRONTEND_PROVIDERS = [
  { id: 'vercel', name: 'Vercel', implemented: true },
  { id: 'netlify', name: 'Netlify', implemented: true },
  { id: 'cloudflare-pages', name: 'Cloudflare Pages', implemented: false },
] as const;

function SetupWizard() {
  const [state, setState] = useState<SetupState>(() => loadSetup());
  const step = state.wizardStep;

  useEffect(() => {
    saveSetup(state);
  }, [state]);

  function patch(partial: Partial<SetupState>) {
    setState((prev) => ({ ...prev, ...partial }));
  }

  function goNext() {
    patch({ wizardStep: Math.min(step + 1, STEPS.length - 1) });
  }

  function goBack() {
    patch({ wizardStep: Math.max(step - 1, 0) });
  }

  function handleRepoBlur() {
    const slug = repoSlug(state.repoUrl);
    const updates: Partial<SetupState> = {};
    if (!state.projectName && slug) updates.projectName = slug;
    if (!state.vercelProjectName && (state.projectName || slug)) {
      updates.vercelProjectName = `${state.projectName || slug}-frontend`;
    }
    if (Object.keys(updates).length > 0) patch(updates);
  }

  function toggleCheck(id: string) {
    patch({
      checklistDone: {
        ...state.checklistDone,
        [id]: !state.checklistDone[id],
      },
    });
  }

  const canNextStep0 = Boolean(state.repoUrl.trim() && state.projectName.trim());
  const canNextStep1 = state.hasBackend || state.hasFrontend;
  const json = configJson(state);
  const { done, total } = checklistProgress(state);
  const checklists = visibleChecklists(state);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Deploy setup</p>
        <h1 className={styles.title}>Configure your deploy</h1>
        <p className={styles.lead}>
          Tell Heramb where your code lives and where each part should run. We&apos;ll generate{' '}
          <code>heramb.config.json</code> and a step-by-step checklist — including one-time Railway
          steps.
        </p>
      </header>

      <nav className={styles.steps} aria-label="Setup steps">
        {STEPS.map((s, i) => (
          <button
            key={s.title}
            type="button"
            className={`${styles.stepTab} ${i === step ? styles.stepTabActive : ''} ${
              i < step ? styles.stepTabDone : ''
            }`}
            onClick={() => patch({ wizardStep: i })}
          >
            <span className={styles.stepNum}>Step {i + 1}</span>
            {s.label}
          </button>
        ))}
      </nav>

      {step === 0 && (
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>GitHub repository</h2>
          <p className={styles.cardDesc}>
            Heramb deploys from your repo. Connect the same repo on Railway (backend) — and
            optionally Vercel (frontend).
          </p>
          <div className={styles.fieldGrid}>
            <label>
              GitHub repo URL
              <input
                type="url"
                placeholder="https://github.com/you/your-app"
                value={state.repoUrl}
                onChange={(e) => patch({ repoUrl: e.target.value.trim() })}
                onBlur={handleRepoBlur}
                required
              />
            </label>
            <div className={styles.fieldGrid2}>
              <label>
                Branch
                <input
                  type="text"
                  value={state.branch}
                  onChange={(e) => patch({ branch: e.target.value })}
                />
              </label>
              <label>
                Project name
                <input
                  type="text"
                  placeholder="my-app"
                  value={state.projectName}
                  onChange={(e) => patch({ projectName: e.target.value })}
                  required
                />
              </label>
            </div>
          </div>
        </section>
      )}

      {step === 1 && (
        <>
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>What are you deploying?</h2>
            <p className={styles.cardDesc}>
              Match your monorepo layout. Heramb will wire env vars between services automatically.
            </p>
            <div className={styles.toggleRow}>
              <label className={styles.toggle}>
                <input
                  type="checkbox"
                  checked={state.hasBackend}
                  onChange={(e) => patch({ hasBackend: e.target.checked })}
                />
                Backend (API / server)
              </label>
              <label className={styles.toggle}>
                <input
                  type="checkbox"
                  checked={state.hasFrontend}
                  onChange={(e) => patch({ hasFrontend: e.target.checked })}
                />
                Frontend (web app)
              </label>
              <label className={styles.toggle}>
                <input
                  type="checkbox"
                  checked={state.hasRedis}
                  onChange={(e) => patch({ hasRedis: e.target.checked })}
                />
                Redis (optional)
              </label>
            </div>

            <div className={styles.deployMap}>
              {state.hasBackend && (
                <div className={styles.deployRow}>
                  <span className={styles.deployLabel}>Backend</span>
                  <span className={styles.deployPlatform}>→ Railway (recommended)</span>
                  <input
                    type="text"
                    value={state.backendPath}
                    onChange={(e) => patch({ backendPath: e.target.value })}
                    aria-label="Backend path"
                    className={styles.deployPath}
                  />
                </div>
              )}
              {state.hasFrontend && (
                <div className={styles.deployRow}>
                  <span className={styles.deployLabel}>Frontend</span>
                  <span className={styles.deployPlatform}>→ Vercel (recommended)</span>
                  <input
                    type="text"
                    value={state.frontendPath}
                    onChange={(e) => patch({ frontendPath: e.target.value })}
                    aria-label="Frontend path"
                    className={styles.deployPath}
                  />
                </div>
              )}
              {state.hasRedis && (
                <div className={styles.deployRow}>
                  <span className={styles.deployLabel}>Redis</span>
                  <span className={styles.deployPlatform}>→ Upstash</span>
                  <span className={styles.deployPath}>auto-provisioned</span>
                </div>
              )}
            </div>
          </section>

          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Platform picks</h2>
            <div className={styles.platformGrid}>
              {state.hasBackend && (
                <div className={styles.platformCard}>
                  <div className={styles.platformHead}>
                    <span className={styles.platformRole}>Backend host</span>
                  </div>
                  <select
                    value={state.backendProvider}
                    onChange={(e) =>
                      patch({ backendProvider: e.target.value as SetupState['backendProvider'] })
                    }
                  >
                    {BACKEND_PROVIDERS.map((p) => (
                      <option key={p.id} value={p.id} disabled={!p.implemented}>
                        {p.name}
                        {!p.implemented ? ' (coming soon)' : ''}
                      </option>
                    ))}
                  </select>
                  <p className={styles.hint}>Long-running server — not serverless.</p>
                </div>
              )}
              {state.hasFrontend && (
                <div className={styles.platformCard}>
                  <div className={styles.platformHead}>
                    <span className={styles.platformRole}>Frontend host</span>
                  </div>
                  <select
                    value={state.frontendProvider}
                    onChange={(e) =>
                      patch({
                        frontendProvider: e.target.value as SetupState['frontendProvider'],
                      })
                    }
                  >
                    {FRONTEND_PROVIDERS.map((p) => (
                      <option key={p.id} value={p.id} disabled={!p.implemented}>
                        {p.name}
                        {!p.implemented ? ' (coming soon)' : ''}
                      </option>
                    ))}
                  </select>
                  <label style={{ marginTop: '0.75rem' }}>
                    Frontend framework
                    <select
                      value={state.frontendFramework}
                      onChange={(e) =>
                        patch({
                          frontendFramework: e.target.value as SetupState['frontendFramework'],
                        })
                      }
                    >
                      <option value="vite">Vite / React (VITE_API_URL)</option>
                      <option value="next">Next.js (NEXT_PUBLIC_* )</option>
                      <option value="other">Other</option>
                    </select>
                  </label>
                </div>
              )}
            </div>
          </section>

          {state.hasBackend && state.backendProvider === 'railway' && (
            <section className={styles.card}>
              <h2 className={styles.cardTitle}>Railway IDs (optional)</h2>
              <p className={styles.cardDesc}>
                Paste after creating the project in Railway. Project ID works alone; Service ID is
                more precise if you have multiple services.
              </p>
              <div className={styles.fieldGrid2}>
                <label>
                  Railway Project ID
                  <input
                    type="text"
                    placeholder="uuid from Railway → Project → Settings"
                    value={state.railwayProjectId}
                    onChange={(e) => patch({ railwayProjectId: e.target.value.trim() })}
                  />
                </label>
                <label>
                  Railway Service ID
                  <input
                    type="text"
                    placeholder="uuid from service → Settings"
                    value={state.railwayServiceId}
                    onChange={(e) => patch({ railwayServiceId: e.target.value.trim() })}
                  />
                </label>
              </div>
              {state.hasFrontend && (
                <label style={{ marginTop: '1rem' }}>
                  Vercel project name
                  <input
                    type="text"
                    placeholder="my-app-frontend"
                    value={state.vercelProjectName}
                    onChange={(e) => patch({ vercelProjectName: e.target.value.trim() })}
                  />
                </label>
              )}
            </section>
          )}
        </>
      )}

      {step === 2 && (
        <>
          <div className={styles.alert}>
            <strong>Honest setup:</strong> Railway needs a one-time GitHub connect + first deploy in
            their dashboard. After that, <code>npx @heramb1/cli deploy</code> handles env wiring,
            frontend upload, and CORS.
          </div>

          <p className={styles.progress}>
            Checklist: <strong>{done}</strong> / {total} done
          </p>

          {checklists.map((section) => (
            <section key={section.id} className={`${styles.card} ${styles.checklistSection}`}>
              <h2 className={styles.checklistSectionTitle}>
                {section.platform} — {section.title}
              </h2>
              {section.items.map((item) => (
                <div key={item.id} className={styles.checkItem}>
                  <input
                    type="checkbox"
                    checked={Boolean(state.checklistDone[item.id])}
                    onChange={() => toggleCheck(item.id)}
                    aria-label={item.title}
                  />
                  <div className={styles.checkItemBody}>
                    <p className={styles.checkItemTitle}>{item.title}</p>
                    <p className={styles.checkItemText}>{item.body}</p>
                    {item.code && (
                      <div className={styles.codeBlock}>
                        <div className={styles.codeHeader}>
                          <span className={styles.codeLabel}>Commands / settings</span>
                          <CopyButton text={item.code} label="Copy" />
                        </div>
                        {item.code}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </section>
          ))}

          <section className={styles.card}>
            <div className={styles.codeHeader}>
              <h2 className={styles.cardTitle}>heramb.config.json</h2>
              <CopyButton text={json} label="Copy config" />
            </div>
            <p className={styles.cardDesc}>
              Save this file at your repo root. Adjust paths if your layout differs.
            </p>
            <pre className={styles.configPre}>{json}</pre>
          </section>
        </>
      )}

      <div className={styles.actions}>
        {step > 0 ? (
          <button type="button" className={styles.btnSecondary} onClick={goBack}>
            ← Back
          </button>
        ) : (
          <span />
        )}
        {step < STEPS.length - 1 ? (
          <button
            type="button"
            className={styles.btnPrimary}
            onClick={goNext}
            disabled={(step === 0 && !canNextStep0) || (step === 1 && !canNextStep1)}
          >
            Continue →
          </button>
        ) : (
          <Link to="/dashboard" className={styles.btnPrimary}>
            Open dashboard →
          </Link>
        )}
      </div>

      <div className={styles.footerLinks}>
        <Link to="/settings">Provider tokens → Settings</Link>
        <Link to="/guide">CLI reference</Link>
        {isSetupComplete(state) && (
          <button
            type="button"
            className={styles.btnSecondary}
            onClick={() => {
              if (confirm('Clear saved setup?')) {
                patch({ checklistDone: {}, wizardStep: 0 });
              }
            }}
          >
            Reset wizard
          </button>
        )}
      </div>
    </div>
  );
}

export function SetupPage() {
  return <SetupWizard />;
}
