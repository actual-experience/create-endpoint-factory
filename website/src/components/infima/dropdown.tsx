import React from 'react';
import { makeOverridableComponent } from '@site/src/components/infima/base';
import clsx from 'clsx';
import styles from './dropdown.module.scss';

export type DropdownProps = {
  hoverable?: boolean;
  show?: boolean;
  right?: boolean;
  noCaret?: boolean;
};

export const Dropdown = makeOverridableComponent<'div', DropdownProps>(
  'Dropdown',
  (
    { tag: Tag = 'div', className, hoverable, show, right, noCaret, ...props },
    ref
  ) => (
    <Tag
      {...props}
      ref={ref}
      className={clsx(
        'dropdown',
        {
          'dropdown--hoverable': hoverable,
          'dropdown--show': show,
          'dropdown--right': right,
          'dropdown--nocaret': noCaret,
        },
        className
      )}
    />
  )
);

export type DropdownMenuProps = {};

export const DropdownMenu = makeOverridableComponent<'ul', DropdownMenuProps>(
  'DropdownMenu',
  ({ tag: Tag = 'ul', className, ...props }, ref) => (
    <Tag {...props} ref={ref} className={clsx('dropdown__menu', className)} />
  )
);

export type DropdownLinkProps = {
  active?: boolean;
};

export const DropdownLink = makeOverridableComponent<
  'button',
  DropdownLinkProps
>(
  'DropdownLink',
  ({ tag: Tag = 'button', className, active, ...props }, ref) => (
    <Tag
      {...props}
      ref={ref}
      className={clsx(
        'dropdown__link',
        active && 'dropdown__link--active',
        'clean-btn',
        styles.dropdownButton,
        className
      )}
    />
  )
);
