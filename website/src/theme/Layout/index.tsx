import React from 'react';
import Layout from '@theme-original/Layout';
import type LayoutType from '@theme/Layout';
import type { WrapperProps } from '@docusaurus/types';
import { LigatureProvider } from '@site/src/hooks/useCodeLigatures';

type Props = WrapperProps<typeof LayoutType>;

export default function LayoutWrapper(props: Props): JSX.Element {
  return (
    <LigatureProvider>
      <Layout {...props} />
    </LigatureProvider>
  );
}
