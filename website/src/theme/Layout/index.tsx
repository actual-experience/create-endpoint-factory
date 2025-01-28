import type { WrapperProps } from '@docusaurus/types';
import { LigatureProvider } from '@site/src/hooks/useCodeLigatures';
import type LayoutType from '@theme/Layout';
import Layout from '@theme-original/Layout';

type Props = WrapperProps<typeof LayoutType>;

/*
  Swizzled (wrapped) to:
  - add LigatureProvider
*/

export default function LayoutWrapper(props: Props): React.JSX.Element {
  return (
    <LigatureProvider>
      <Layout {...props} />
    </LigatureProvider>
  );
}
