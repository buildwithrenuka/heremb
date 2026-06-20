import { Link, Outlet } from 'react-router-dom';
import { NPM_PACKAGE_URL } from '../data/demo';
import { ThemeToggle } from './ThemeToggle';
import styles from './Layout.module.css';

const NAV = [
  { href: '#problem', label: 'Problem' },
  { href: '#compare', label: 'Why Heramb' },
  { href: '#usecases', label: 'Use cases' },
  { href: '#steps', label: 'How to use' },
  { href: '#install', label: 'Install' },
];

export function Layout() {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link to="/" className={styles.logo}>
          <span className={styles.logoMark}>🐘</span>
          <span>Heramb</span>
        </Link>
        <nav className={styles.nav} aria-label="Page sections">
          {NAV.map((item) => (
            <a key={item.href} href={item.href} className={styles.navLink}>
              {item.label}
            </a>
          ))}
        </nav>
        <div className={styles.headerActions}>
          <a
            href={NPM_PACKAGE_URL}
            className={styles.npmLink}
            target="_blank"
            rel="noreferrer"
          >
            npm
          </a>
          <ThemeToggle />
          <a href="#install" className={styles.cta}>
            Get started
          </a>
        </div>
      </header>
      <main className={styles.main}>
        <Outlet />
      </main>
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <span className={styles.footerBrand}>Heramb</span>
          <span className={styles.footerCopy}>
            <a href={NPM_PACKAGE_URL} className={styles.footerNpmLink} target="_blank" rel="noreferrer">
              npm package <code>@heramb1/cli</code>
            </a>
            {' · '}
            MIT · Not affiliated with any cloud provider
          </span>
        </div>
      </footer>
    </div>
  );
}
