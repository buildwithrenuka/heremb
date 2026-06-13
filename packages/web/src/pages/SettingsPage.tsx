import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { loadAiKey, loadProviderKeys, saveAiKey, saveProviderKeys } from '../auth/session';
import styles from './SettingsPage.module.css';

function SettingsContent() {
  const [keys, setKeys] = useState(loadProviderKeys);
  const [aiKey, setAiKey] = useState(loadAiKey);
  const [saved, setSaved] = useState(false);

  function handleSave(e: FormEvent) {
    e.preventDefault();
    saveProviderKeys(keys);
    saveAiKey(aiKey);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function updateProvider(provider: string, field: string, value: string) {
    setKeys((prev) => ({
      ...prev,
      [provider]: { ...prev[provider], [field]: value },
    }));
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>Settings</h1>
        <p>Provider locks and optional AI fallback — stored in your browser for the web UI.</p>
        <p className={styles.hint}>
          CLI users: same keys live in <code>~/.heramb/keys.json</code> via <code>heramb init</code>.
        </p>
      </header>

      <form onSubmit={handleSave} className={styles.form}>
        <section className={styles.section}>
          <h2>Provider locks</h2>
          <p className={styles.sectionDesc}>Required for real deploys — not AI keys.</p>

          <label>
            Railway token
            <input
              type="password"
              value={keys.railway?.token ?? ''}
              onChange={(e) => updateProvider('railway', 'token', e.target.value)}
              placeholder="From railway.app/account/tokens"
            />
          </label>

          <label>
            Vercel token
            <input
              type="password"
              value={keys.vercel?.token ?? ''}
              onChange={(e) => updateProvider('vercel', 'token', e.target.value)}
              placeholder="From vercel.com/account/tokens"
            />
          </label>

          <label>
            Upstash email
            <input
              type="email"
              value={keys.upstash?.email ?? ''}
              onChange={(e) => updateProvider('upstash', 'email', e.target.value)}
            />
          </label>

          <label>
            Upstash API key
            <input
              type="password"
              value={keys.upstash?.apiKey ?? ''}
              onChange={(e) => updateProvider('upstash', 'apiKey', e.target.value)}
            />
          </label>
        </section>

        <section className={styles.section}>
          <h2>Optional AI key</h2>
          <p className={styles.sectionDesc}>
            Only used when a deploy error doesn&apos;t match the known-error table (~300 tokens).
            Leave blank for zero-AI deploys.
          </p>
          <label>
            OpenAI API key
            <input
              type="password"
              value={aiKey}
              onChange={(e) => setAiKey(e.target.value)}
              placeholder="sk-… (optional)"
            />
          </label>
        </section>

        <button type="submit" className={styles.save}>
          {saved ? 'Saved ✓' : 'Save keys'}
        </button>
      </form>

      <Link to="/dashboard" className={styles.back}>
        ← Back to dashboard
      </Link>
    </div>
  );
}

export function SettingsPage() {
  return (
    <ProtectedRoute>
      <SettingsContent />
    </ProtectedRoute>
  );
}
