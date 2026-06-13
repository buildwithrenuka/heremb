import { DEPLOY_STEPS } from '../data/demo';
import styles from './Terminal.module.css';

interface TerminalProps {
  animate?: boolean;
}

export function Terminal({ animate = false }: TerminalProps) {
  return (
    <div className={styles.terminal}>
      <div className={styles.titlebar}>
        <span className={styles.dot} data-color="red" />
        <span className={styles.dot} data-color="yellow" />
        <span className={styles.dot} data-color="green" />
        <span className={styles.title}>heramb deploy</span>
      </div>
      <div className={styles.body}>
        {DEPLOY_STEPS.map((step, i) => (
          <div
            key={step.id}
            className={styles.line}
            style={animate ? { animationDelay: `${i * 0.12}s` } : undefined}
          >
            <span className={styles.index}>[{step.id}/10]</span>
            <span className={styles.label}>{step.label}</span>
            <span className={styles.check}>✓</span>
            <span className={styles.value}>{step.value}</span>
          </div>
        ))}
        <div className={`${styles.line} ${styles.done}`}>
          <span className={styles.unlock}>🔑 Unlocked</span>
        </div>
        <div className={styles.stats}>
          <span>AI calls this deploy : 0</span>
          <span>Tokens used : 0</span>
          <span>Cost : $0.00</span>
        </div>
      </div>
    </div>
  );
}
