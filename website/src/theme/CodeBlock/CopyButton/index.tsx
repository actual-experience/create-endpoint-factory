import React from 'react';
import CopyButton from '@theme-original/CodeBlock/CopyButton';
import type CopyButtonType from '@theme/CodeBlock/CopyButton';
import type { WrapperProps } from '@docusaurus/types';
import useIsBrowser from '@docusaurus/useIsBrowser';
import { useLigature } from '@site/src/hooks/useCodeLigatures';

type Props = WrapperProps<typeof CopyButtonType>;

export default function CopyButtonWrapper(props: Props): JSX.Element {
  const isBrowser = useIsBrowser();
  const { ligature, setLigature } = useLigature();
  return (
    <>
      <CopyButton {...props} />
      <button
        className="clean-btn"
        style={{ whiteSpace: 'pre' }}
        disabled={!isBrowser}
        onClick={() => setLigature(ligature === 'none' ? 'normal' : 'none')}
      >
        <code aria-hidden style={{ lineHeight: 'initial' }}>
          =&gt;
        </code>
        {' Ligatures'}
      </button>
    </>
  );
}
