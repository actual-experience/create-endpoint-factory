import React from 'react';
import {
  Colour,
  makeOverridableComponent,
} from '@site/src/components/infima/base';
import { MouseEventHandler } from 'react';
import clsx from 'clsx';

export type AlertProps = {
  color?: Colour;
  onClose?: MouseEventHandler<HTMLButtonElement>;
};

export const Alert = makeOverridableComponent<'div', AlertProps>(
  'Alert',
  (
    {
      tag: Tag = 'div',
      color = 'primary',
      className,
      onClose,
      children,
      ...props
    },
    ref
  ) => (
    <Tag
      {...props}
      ref={ref}
      className={clsx('alert', color && `alert--${color}`, className)}
      role="alert"
    >
      {onClose && (
        <button
          aria-label="Close"
          className="clean-btn close"
          type="button"
          onClick={onClose}
        >
          <span aria-hidden="true">&times;</span>
        </button>
      )}
      {children}
    </Tag>
  )
);
