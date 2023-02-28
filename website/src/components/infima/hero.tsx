import React, { ReactNode } from 'react';
import { makeOverridableComponent } from '@site/src/components/infima/base';
import clsx from 'clsx';

export type HeroProps = {
  title?: ReactNode;
  subtitle?: ReactNode;
  color?: 'dark' | 'primary';
};

export const Hero = makeOverridableComponent<'div', HeroProps>(
  'Hero',
  (
    { tag: Tag = 'div', title, subtitle, color, className, children, ...props },
    ref
  ) => (
    <Tag
      {...props}
      ref={ref}
      className={clsx('hero', color && `hero--${color}`, className)}
    >
      <div className="container">
        {title && <h1 className="hero__subtitle">{title}</h1>}
        {subtitle && <p className="hero__subtitle">{subtitle}</p>}
        {children}
      </div>
    </Tag>
  )
);
