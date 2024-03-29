import React from 'react';
import {
  Colour,
  makeOverridableComponent,
} from '@site/src/components/infima/base';
import clsx from 'clsx';

export type ButtonProps = {
  color?: Colour;
  outline?: boolean;
  active?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'lg';
  block?: boolean;
};

export const Button = makeOverridableComponent<'button', ButtonProps>(
  'Button',
  (
    {
      tag: Tag = 'button',
      color,
      outline,
      active,
      size,
      block,
      className,
      ...props
    },
    ref
  ) => (
    <Tag
      {...props}
      ref={ref}
      className={clsx(
        'button',
        {
          [`button--${color}`]: color,
          ['button--outline']: outline,
          ['button--active']: active,
          [`button--${size}`]: size,
          ['button--block']: block,
        },
        className
      )}
    />
  )
);
