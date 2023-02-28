import { arrayIncludes, Id } from '@site/src/util/types';
import clsx, { ClassArray, ClassValue } from 'clsx';
import React, {
  ComponentPropsWithoutRef,
  ComponentType,
  ForwardedRef,
  forwardRef,
  HTMLAttributes,
  memo,
  useMemo,
} from 'react';
import capitalise from 'lodash/capitalize';
import omit from 'lodash/omit';

const colours = [
  'primary',
  'secondary',
  'success',
  'info',
  'warning',
  'danger',
] as const;

export type Colour = typeof colours[number];

const shadows = ['lw', 'md', 'tl'] as const;

export type Shadow = typeof shadows[number];

const spacingSides = [
  'top',
  'left',
  'bottom',
  'right',
  'vert',
  'horiz',
] as const;

type Side = typeof spacingSides[number];

const spacingSizes = ['none', 'xs', 'sm', 'md', 'lg', 'xl'] as const;

type Size = typeof spacingSizes[number];

const spacingProps = (['margin', 'padding'] as const).flatMap((spacing) => [
  spacing,
  ...spacingSides.map(
    (side) => `${spacing}${capitalise(side) as Capitalize<Side>}` as const
  ),
]);

const spacingRegex = new RegExp(
  `(margin|padding)(${spacingSides.map((side) => capitalise(side)).join('|')})?`
);

export type BaseProps = Id<
  {
    shadow?: Shadow;
  } & { [Spacing in typeof spacingProps[number]]?: Size }
>;

const baseProps = ['shadow', ...spacingProps] as const;

export const basePropsToClasses = ({
  shadow,
  ...rest
}: BaseProps): ClassValue => [
  shadow && `shadow--${shadow}`,
  Object.entries(rest).reduce<ClassArray>((arr, [spacing, size]) => {
    if (arrayIncludes(spacingProps, spacing)) {
      const result = spacingRegex.exec(spacing);
      if (result) {
        const [, property, side] = result;
        arr.push(
          side
            ? `${property}-${side.toLowerCase()}--${size}`
            : `${property}--${size}`
        );
      }
    }
    return arr;
  }, []),
];

export const useBaseProps = <Props extends BaseProps & { className?: string }>(
  props: Props
) =>
  useMemo(
    () => ({
      ...omit(props, ...baseProps),
      className: clsx(props.className, basePropsToClasses(props)),
    }),
    [props]
  );

type RefFromComponent<
  Component extends keyof JSX.IntrinsicElements | ComponentType
> = Component extends ComponentType
  ? HTMLElement
  : Component extends keyof JSX.IntrinsicElements
  ? JSX.IntrinsicElements[Component] extends HTMLAttributes<infer Element>
    ? Element
    : never
  : never;

export const makeOverridableComponent = <
  DefaultTag extends keyof JSX.IntrinsicElements | ComponentType<any>,
  Props = {}
>(
  displayName: string,
  render: React.ForwardRefRenderFunction<
    RefFromComponent<DefaultTag>,
    Omit<ComponentPropsWithoutRef<DefaultTag>, keyof Props> & {
      tag?: DefaultTag;
    } & Props
  >
) =>
  memo(
    forwardRef(
      Object.assign(
        (
          props: Omit<ComponentPropsWithoutRef<DefaultTag>, keyof Props> & {
            tag?: DefaultTag;
            className?: string;
          } & Props &
            BaseProps,
          ref: ForwardedRef<RefFromComponent<DefaultTag>>
        ) => {
          const finalProps = useBaseProps(props);
          return render(
            finalProps as Omit<
              ComponentPropsWithoutRef<DefaultTag>,
              keyof Props
            > & {
              tag?: DefaultTag;
            } & Props,
            ref
          );
        },
        { displayName }
      )
    )
  ) as unknown as <
    Tag extends keyof JSX.IntrinsicElements | ComponentType<any> = DefaultTag
  >(
    props: ComponentPropsWithoutRef<Tag> & {
      tag?: Tag;
    } & Props &
      BaseProps
  ) => JSX.Element;
