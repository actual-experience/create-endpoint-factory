import React, { cloneElement, ReactElement } from 'react';
import clsx from 'clsx';
import { Shadow } from './base';

export type ElevationProps = {
  children: ReactElement<{ className: string }>;
  shadow: Shadow;
};

export const Elevation = ({ children, shadow }: ElevationProps) =>
  cloneElement(children, {
    className: clsx(children.props.className, `shadow--${shadow}`),
  });
