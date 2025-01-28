import { makeOverridableComponent } from '@site/src/components/infima/base';
import clsx from 'clsx';
import React from 'react';

export interface AvatarProps {
  vertical?: boolean;
}

export const Avatar = makeOverridableComponent<'div', AvatarProps>(
  'Avatar',
  ({ tag: Tag = 'div', className, vertical, ...props }, ref) => (
    <Tag
      {...props}
      ref={ref}
      className={clsx('avatar', vertical && 'avatar--vertical', className)}
    />
  )
);

export interface AvatarPhotoProps {
  size?: 'sm' | 'lg' | 'xl';
  link?: boolean;
}

export const AvatarPhoto = makeOverridableComponent<'div', AvatarPhotoProps>(
  'AvatarPhoto',
  ({ tag: Tag = 'div', className, size, link, ...props }, ref) => (
    <Tag
      {...props}
      ref={ref}
      className={clsx(
        'avatar__photo',
        size && `avatar__photo--${size}`,
        link && 'avatar__photo-link',
        className
      )}
    />
  )
);

export const AvatarIntro = makeOverridableComponent<'div'>(
  'AvatarIntro',
  ({ tag: Tag = 'div', className, ...props }, ref) => (
    <Tag {...props} ref={ref} className={clsx('avatar__intro', className)} />
  )
);

export const AvatarName = makeOverridableComponent<'div'>(
  'AvatarName',
  ({ tag: Tag = 'div', className, ...props }, ref) => (
    <Tag {...props} ref={ref} className={clsx('avatar__name', className)} />
  )
);

export const AvatarSubtitle = makeOverridableComponent<'small'>(
  'AvatarSubtitle',
  ({ tag: Tag = 'small', className, ...props }, ref) => (
    <Tag {...props} ref={ref} className={clsx('avatar__subtitle', className)} />
  )
);
