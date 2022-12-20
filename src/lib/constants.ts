import { wrapConstructor } from './utils';

// Do we have non-polyfilled symbols?
const hasSymbol =
  typeof Symbol !== 'undefined' && typeof Symbol('x') === 'symbol';

/**
 * Return this from your handler to indicate that the status and response have already been sent.
 *
 * By default the final handler will call .status (with 200 by default, unless `succeedWithCode` is used) and .json with whatever was returned.
 *
 * If undefined is returned (or there are no return statements), the status will be set to 204 and .end() will be called.
 */
// inspired by Immer https://github.com/immerjs/immer/
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
export const nothing: Nothing = hasSymbol
  ? Symbol.for('create-endpoint-factory-nothing')
  : ({ ['create-endpoint-factory-nothing']: true } as any);

/** Use a class type for `nothing` so its type is unique */
class Nothing {
  // This lets us do `Exclude<T, Nothing>`
  // @ts-expect-error yes this is gross
  private _!: unique symbol;
}

export type NothingToAny<T> = T extends Nothing ? any : T;

const httpMethods = [
  'GET',
  'HEAD',
  'POST',
  'PUT',
  'DELETE',
  'CONNECT',
  'OPTIONS',
  'TRACE',
  'PATCH',
] as const;

export type HttpMethod = typeof httpMethods[number];

/**
 * Use to throw an API error from a logic function with a specified error code, optional readable message and meta (any other information)
 *
 * Prefer `failWithCode` instead, if you're somewhere you have access to it.
 *
 * You can also extend this to create your own error types with included HTTP code.
 * ```ts
 * export class CustomResError extends ResError {
 *   constructor(
 *   // HTTP status code to use
 *   statusCode: number,
 *   // Message to provide to Error object
 *   message: string,
 *   // example extra property to then use in serializeError
 *   public avoidRetry?: boolean;
 *   ) {
 *     super(statusCode, message);
 *   }
 * }
 *
 * const serializeError = (e: unknown) => {
 *   if (e instanceof CustomResError) {
 *     return { ...miniSerializeError(e), avoidRetry: e.avoidRetry };
 *   }
 *   return miniSerializeError(e);
 * }
 *
 * ```
 */
export class ResError extends Error {
  constructor(
    /** HTTP status code to use */
    public statusCode: number,
    /** Message to provide to Error object */
    message: string,
    /** Any additional information - useful for a custom serializeError */
    public meta?: unknown
  ) {
    super(message);
  }
}

export const failWithCode = wrapConstructor(ResError);

/**
 * Used to return a success response with a given code.
 *
 * Use `succeedWithCode` instead of this directly.
 */
export class ResSuccess<ReturnType = any> {
  constructor(public statusCode: number, public response: ReturnType) {}
}

export const succeedWithCode = wrapConstructor(ResSuccess);
