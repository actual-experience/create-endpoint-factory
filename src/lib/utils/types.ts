export type UnionToIntersection<U> = (
  U extends any ? (k: U) => void : never
) extends (k: infer I) => void
  ? I
  : never;

export type KeysMatching<T, V> = {
  [K in keyof T]-?: T[K] extends V ? K : never;
}[keyof T];

export type ConditionalBool<
  T extends boolean,
  IfTrue,
  IfFalse,
  IfBoolean = IfTrue | IfFalse,
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

export type IfMaybeUndefined<P, True, False> = [undefined] extends [P]
  ? True
  : False;

/**
 * return True if T is `unknown`, otherwise return False
 * taken from https://github.com/joonhocho/tsdef
 *
 */
export type IsUnknown<T, True, False = never> = unknown extends T
  ? IsAny<T, False, True>
  : False;

/**
 * Helper type. Passes T out again, but boxes it in a way that it cannot
 * "widen" the type by accident if it is a generic that should be inferred
 * from elsewhere.
 *
 */
export type NoInfer<T> = [T][T extends any ? 0 : never];

/** Merge object intersections visually */
export type Id<T> = { [K in keyof T]: T[K] } & unknown;

/** Make specified keys optional */
export type PickPartial<T, K extends keyof T> = Id<
  Omit<T, K> & Partial<Pick<T, K>>
>;

/** Make specified keys required */
export type PickRequired<T, K extends keyof T> = Id<
  Omit<T, K> & Required<Pick<T, K>>
>;

export type MaybePromise<T> = T | Promise<T>;

export type Parser<
  Output,
  Input = unknown,
  ExtraParams extends Array<any> = [],
> = (input: Input, ...params: ExtraParams) => Output;

export const id = <T>(t: T) => t;
