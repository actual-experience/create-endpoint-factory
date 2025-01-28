import type { Props } from '@theme/CodeBlock/Line';
import clsx from 'clsx';

import styles from './styles.module.scss';

/*
  Swizzled (ejected) to:
  - add 'code-block-line-number' global class (used in theme mixin)
  - add left border 
*/

export default function CodeBlockLine({
  line,
  classNames,
  showLineNumbers,
  getLineProps,
  getTokenProps,
}: Props): React.JSX.Element {
  if (line.length === 1 && line[0].content === '\n') {
    line[0].content = '';
  }

  const lineProps = getLineProps({
    line,
    className: clsx(classNames, showLineNumbers && styles.codeLine),
  });

  const lineTokens = line.map((token, key) => (
    <span key={key} {...getTokenProps({ token, key })} />
  ));

  return (
    <span {...lineProps}>
      {showLineNumbers ? (
        <>
          <span
            className={clsx(styles.codeLineNumber, 'code-block-line-number')}
          />
          <span className={styles.codeLineContent}>{lineTokens}</span>
        </>
      ) : (
        lineTokens
      )}
      <br />
    </span>
  );
}
