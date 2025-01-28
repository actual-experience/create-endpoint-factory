import clsx from 'clsx';
import type { ReactElement } from 'react';
import { cloneElement } from 'react';
import type { Shadow } from './base';

export interface ElevationProps {
  children: ReactElement<{ className: string }>;
  shadow: Shadow;
}

export const Elevation = ({ children, shadow }: ElevationProps) =>
  cloneElement(children, {
    className: clsx(children.props.className, `shadow--${shadow}`),
  });
