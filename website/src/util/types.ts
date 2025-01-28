/** Merges object intersections visually */
export type Id<T> = { [K in keyof T]: T[K] } & {};

export const arrayIncludes = <T>(arr: ReadonlyArray<T>, item: any): item is T =>
  arr.includes(item);
