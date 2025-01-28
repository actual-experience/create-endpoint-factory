import { Details as DetailsGeneric } from '@docusaurus/theme-common/Details';
import type { Colour } from '@site/src/components/infima/base';
import type { Props } from '@theme/Details';
import clsx from 'clsx';

import styles from './styles.module.scss';

/**
  Swizzled (ejected) to:
  - add color prop
 */

declare module '@theme/Details' {
  export interface Props {
    color?: Colour;
  }
}

export default function Details({
  color = 'info',
  ...props
}: Props): React.JSX.Element {
  return (
    <DetailsGeneric
      {...props}
      className={clsx(`alert alert--${color}`, styles.details, props.className)}
    />
  );
}
