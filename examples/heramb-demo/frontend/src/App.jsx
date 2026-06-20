import { useEffect, useState } from 'react';

const apiBase = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

export default function App() {
  const [health, setHealth] = useState(null);
  const [hello, setHello] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [healthRes, helloRes] = await Promise.all([
          fetch(`${apiBase}/health`),
          fetch(`${apiBase}/api/hello`),
        ]);
        if (!healthRes.ok || !helloRes.ok) {
          throw new Error('API request failed — check CORS and VITE_API_URL');
        }
        setHealth(await healthRes.json());
        setHello(await helloRes.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    }
    load();
  }, []);

  return (
    <main className="page">
      <h1>Heramb Demo</h1>
      <p className="subtitle">Express backend on Railway · Vite frontend on Vercel</p>

      <section className="card">
        <h2>API base</h2>
        <code>{apiBase}</code>
      </section>

      {error ? (
        <section className="card error">
          <h2>Error</h2>
          <p>{error}</p>
        </section>
      ) : (
        <>
          <section className="card">
            <h2>/health</h2>
            <pre>{health ? JSON.stringify(health, null, 2) : 'Loading…'}</pre>
          </section>
          <section className="card">
            <h2>/api/hello</h2>
            <pre>{hello ? JSON.stringify(hello, null, 2) : 'Loading…'}</pre>
          </section>
        </>
      )}
    </main>
  );
}
