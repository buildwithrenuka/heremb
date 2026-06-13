import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import styles from './AuthCallbackPage.module.css';

export function AuthCallbackPage() {
  const [params] = useSearchParams();
  const { completeOAuth } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    const token = params.get('token');
    if (!token) {
      setError('Missing token from OAuth provider');
      return;
    }

    completeOAuth(token)
      .then(() => navigate('/dashboard', { replace: true }))
      .catch((err) => setError(err instanceof Error ? err.message : 'OAuth failed'));
  }, [params, completeOAuth, navigate]);

  if (error) {
    return (
      <div className={styles.page}>
        <p className={styles.error}>{error}</p>
        <a href="/login">Back to login</a>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <span className={styles.key}>🔑</span>
      <p>Completing sign in…</p>
    </div>
  );
}
