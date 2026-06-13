import { useState } from 'react';
import styles from './CopyButton.module.css';

interface CopyButtonProps {
  text: string;
  label?: string;
}

export function CopyButton({ text, label = 'Copy' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button type="button" className={styles.btn} onClick={handleCopy} aria-label={`Copy: ${text}`}>
      {copied ? 'Copied!' : label}
    </button>
  );
}
