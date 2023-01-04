import React from 'react';
import {
  Colour,
  makeOverridableComponent,
} from '@site/src/components/infima/base';
import clsx from 'clsx';

export type BadgeProps = {
  color?: Colour;
};

export const Badge = makeOverridableComponent<'span', BadgeProps>(
  'Badge',
  ({ tag: Tag = 'span', color = 'primary', className, ...props }, ref) => (
    <Tag
      {...props}
      ref={ref}
      className={clsx('badge', color && `badge--${color}`, className)}
    />
  )
);
