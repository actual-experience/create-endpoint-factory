import type { BaseProps } from '@site/src/components/infima/base';
import {
  basePropsToClasses,
  makeOverridableComponent,
} from '@site/src/components/infima/base';
import clsx from 'clsx';
import React from 'react';

export const Card = makeOverridableComponent<'div', BaseProps>(
  'Card',
  ({ tag: Tag = 'div', className, ...props }, ref) => (
    <Tag {...props} ref={ref} className={clsx('card', className)} />
  )
);

export const CardHeader = makeOverridableComponent<'div'>(
  'CardHeader',
  ({ tag: Tag = 'div', className, ...props }, ref) => (
    <Tag {...props} ref={ref} className={clsx('card__header', className)} />
  )
);

export const CardBody = makeOverridableComponent<'div'>(
  'CardBody',
  ({ tag: Tag = 'div', className, ...props }, ref) => (
    <Tag {...props} ref={ref} className={clsx('card__body', className)} />
  )
);

export const CardFooter = makeOverridableComponent<'div'>(
  'CardFooter',
  ({ tag: Tag = 'div', className, ...props }, ref) => (
    <Tag {...props} ref={ref} className={clsx('card__footer', className)} />
  )
);

export const CardImage = makeOverridableComponent<'div'>(
  'CardImage',
  ({ tag: Tag = 'div', className, ...props }, ref) => (
    <Tag {...props} ref={ref} className={clsx('card__footer', className)} />
  )
);
