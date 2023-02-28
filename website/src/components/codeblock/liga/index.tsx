import React from 'react';
import clsx from 'clsx';
import useIsBrowser from '@docusaurus/useIsBrowser';
import { useLigature } from '@site/src/hooks/useCodeLigatures';

import styles from './styles.module.scss';

export default function LigatureButton({
  className,
}: {
  className?: string;
}): JSX.Element {
  const isBrowser = useIsBrowser();
  const { ligature, setLigature } = useLigature();
  return (
    <button
      type="button"
      aria-label="Toggle ligatures"
      title="Toggle ligatures"
      className={clsx(
        className,
        styles.ligatureBtn,
        ligature !== 'none' && styles.ligatureBtnSelected
      )}
      disabled={!isBrowser}
      onClick={() =>
        setLigature((liga) => (liga === 'none' ? 'normal' : 'none'))
      }
    >
      <code aria-hidden className={styles.ligatureIcon}>
        =&gt;
      </code>
    </button>
  );
}
