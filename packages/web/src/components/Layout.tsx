import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import styles from './Layout.module.css';

export function Layout() {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const isDashboard = pathname.startsWith('/dashboard');
  const isSettings = pathname.startsWith('/settings');

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link to="/" className={styles.logo}>
          <span className={styles.logoKey}>🔑</span>
          <span>Heramb</span>
        </Link>
        <nav className={styles.nav}>
          <Link to="/#features" className={styles.navLink}>
            Features
          </Link>
          <Link to="/#install" className={styles.navLink}>
            Install
          </Link>
          <Link to="/guide" className={styles.navLink}>
            Guide
          </Link>
          <Link to="/docs" className={styles.navLink} target="_blank" rel="noreferrer">
            API
          </Link>
          <Link
            to="/dashboard"
            className={`${styles.navLink} ${isDashboard ? styles.navActive : ''}`}
          >
            Dashboard
          </Link>
          {user && (
            <Link
              to="/settings"
              className={`${styles.navLink} ${isSettings ? styles.navActive : ''}`}
            >
              Settings
            </Link>
          )}
        </nav>

        {user ? (
          <div className={styles.userMenu}>
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className={styles.avatar} />
            ) : (
              <span className={styles.avatarFallback}>{user.name.charAt(0)}</span>
            )}
            <span className={styles.userName}>{user.name}</span>
            <button type="button" className={styles.logoutBtn} onClick={logout}>
              Sign out
            </button>
          </div>
        ) : (
          <Link to="/login" className={styles.cta}>
            Sign in
          </Link>
        )}
      </header>
      <main className={styles.main}>
        <Outlet />
      </main>
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <span className={styles.footerBrand}>Heramb 🔑</span>
          <span className={styles.footerTagline}>One key. Every platform. Go have chai.</span>
          <div className={styles.footerLinks}>
            <Link to="/guide" className={styles.footerLink}>
              User guide
            </Link>
            <a href="/docs" className={styles.footerLink} target="_blank" rel="noreferrer">
              API docs
            </a>
          </div>
          <span className={styles.footerCopy}>MIT · CLI + Web UI</span>
        </div>
      </footer>
    </div>
  );
}
