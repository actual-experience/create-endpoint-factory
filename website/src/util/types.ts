/** Merges object intersections visually */
export type Id<T> = { [K in keyof T]: T[K] } & {};

export const arrayIncludes = <T>(arr: readonly T[], item: any): item is T =>
  arr.includes(item);
