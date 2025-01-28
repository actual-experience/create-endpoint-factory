import type { Colour } from '@site/src/components/infima/base';
import { makeOverridableComponent } from '@site/src/components/infima/base';
import clsx from 'clsx';
import React from 'react';

export interface BadgeProps {
  color?: Colour;
}

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
