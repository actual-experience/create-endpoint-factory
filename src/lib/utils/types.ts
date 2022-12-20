export type ConditionalBool<
  T extends boolean,
  IfTrue,
  IfFalse,
  IfBoolean = IfTrue | IfFalse
> = boolean extends T ? IfBoolean : T extends true ? IfTrue : IfFalse;

/**
 * return True if T is `any`, otherwise return False
 * taken from https://github.com/joonhocho/tsdef
 *
 * @internal
 */
export type IsAny<T, True, False = never> =
  // test if we are going the left AND right path in the condition
  true | false extends (T extends never ? true : false) ? True : False;

/**
 * @internal
 */
export type IfMaybeUndefined<P, True, False> = [undefined] extends [P]
  ? True
  : False;

/**
 * return True if T is `unknown`, otherwise return False
 * taken from https://github.com/joonhocho/tsdef
 *
 * @internal
 */
export type IsUnknown<T, True, False = never> = unknown extends T
  ? IsAny<T, False, True>
  : False;

/**
 * Helper type. Passes T out again, but boxes it in a way that it cannot
 * "widen" the type by accident if it is a generic that should be inferred
 * from elsewhere.
 *
 * @internal
 */
export type NoInfer<T> = [T][T extends any ? 0 : never];

/** Merge object intersections visually */
// eslint-disable-next-line @typescript-eslint/ban-types
export type Id<T> = { [K in keyof T]: T[K] } & {};

/** Make specified keys optional */
export type PickPartial<T, K extends keyof T> = Id<
  Omit<T, K> & Partial<Pick<T, K>>
>;

/** Make specified keys required */
export type PickRequired<T, K extends keyof T> = Id<
  Omit<T, K> & Required<Pick<T, K>>
>;

export type MaybePromise<T> = T | Promise<T>;

export type TypeGuard<T, Input = any, ExtraParams extends [...any[]] = []> = (
  input: Input,
  ...params: ExtraParams
) => input is T extends Input ? T : never;

export type TypeInvariant<
  T,
  Input = any,
  ExtraParams extends [...any[]] = []
> = (
  input: Input,
  ...params: ExtraParams
) => asserts input is T extends Input ? T : never;

export type Validator<T, Input = any, ExtraParams extends [...any[]] = []> =
  | TypeGuard<T, Input, ExtraParams>
  | TypeInvariant<T, Input, ExtraParams>;
