/**
 * @public
 */
export interface SerializedError {
  name?: string;
  message?: string;
  stack?: string;
  code?: string;
}

const commonProperties: Array<keyof SerializedError> = [
  'name',
  'message',
  'stack',
  'code',
];

/**
 * Serializes an error into a plain object.
 * Taken from https://github.com/reduxjs/redux-toolkit/, which is reworked from https://github.com/sindresorhus/serialize-error
 *
 * @public
 */
export const miniSerializeError = (value: any): SerializedError => {
  if (typeof value === 'object' && value !== null) {
    const simpleError: SerializedError = {};
    for (const property of commonProperties) {
      if (typeof value[property] === 'string') {
        simpleError[property] = value[property];
      }
    }

    return simpleError;
  }

  return { message: String(value) };
};

/**
 * Creates a type guard that always returns true, essentially asserting that the value is the given type.
 * Useful for method definition validators, for example allowing body and query to be inferred from the type guard, while asserting that response should be a given type (since this will be checked from `handler`'s return type)
 * This is necessary as generics cannot be partially inferred (so you couldn't provide the ReturnType as a generic while allowing body to be inferred)
 * @returns Type guard that always returns true, essentially asserting that the value is the given type
 * ```ts
 * build.method({
 *   validators: {
 *     body: (body): body is 'foo' => body === 'foo',
 *     response: alwaysMatch<'bar'>(),
 *   },
 *   handler: () => 'bar' as const,
 * });
 * ```
 */
export const alwaysMatch =
  <T>() =>
  (val: any): val is T =>
    true;
