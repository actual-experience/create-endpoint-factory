import React from 'react';
import { makeOverridableComponent } from '@site/src/components/infima/base';
import clsx from 'clsx';

const _Grid = makeOverridableComponent<'div'>(
  'Grid',
  ({ tag: Tag = 'div', className, ...props }, ref) => (
    <Tag {...props} ref={ref} className={clsx('container', className)} />
  )
);

export type GridRowProps = {
  noGutters?: boolean;
};

export const GridRow = makeOverridableComponent<'div', GridRowProps>(
  'GridRow',
  ({ tag: Tag = 'div', className, noGutters, ...props }, ref) => (
    <Tag
      {...props}
      ref={ref}
      className={clsx('row', noGutters && 'row--no-gutters', className)}
    />
  )
);

export type GridColumnProps = {
  span?: number;
  offset?: number;
};

export const GridColumn = makeOverridableComponent<'div', GridColumnProps>(
  'GridColumn',
  ({ tag: Tag = 'div', className, span, offset, ...props }, ref) => (
    <Tag
      {...props}
      ref={ref}
      className={clsx(
        'col',
        span && `col--${span}`,
        offset && `col--offset-${offset}`,
        className
      )}
    />
  )
);

export const Grid = Object.assign(_Grid, { Row: GridRow, Column: GridColumn });
