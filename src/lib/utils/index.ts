import { NextApiHandler } from 'next';
import { Decorator, GenericsFromDecorator } from '../types';

export function assert(condition: boolean, error?: string | Error) {
  if (!condition) {
    throw error instanceof Error ? error : new Error(error);
  }
}

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
 */
export const miniSerializeError = (value: unknown): SerializedError => {
  if (typeof value === 'object' && value !== null) {
    const simpleError: SerializedError = {};
    for (const property of commonProperties) {
      if (typeof (value as Record<string, string>)[property] === 'string') {
        simpleError[property] = (value as Record<string, string>)[property];
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
 * method({
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

export type WrappedConstructor<
  Constructor extends new (...args: any[]) => any
> = (...args: ConstructorParameters<Constructor>) => InstanceType<Constructor>;

/**
 * Make a wrapper function that can create an instance without needing to use `new`
 */
export const wrapConstructor =
  <Constructor extends new (...args: any[]) => any>(
    constructor: Constructor
  ): WrappedConstructor<Constructor> =>
  (...args) =>
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    new constructor(...args);

export const decorateHandler = <Return, Decorators extends Decorator[]>(
  handler: NextApiHandler<Return>,
  decorators: Decorators
): NextApiHandler<
  Return | GenericsFromDecorator<Decorators[number]>['return']
> =>
  decorators.reduceRight((handler, decorator) => decorator(handler), handler);
