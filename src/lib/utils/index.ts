import type { NextApiHandler } from 'next';
import type { Decorator, GenericsFromDecorator } from '../types';

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

export type WrappedConstructor<
  Constructor extends new (...args: Array<any>) => any,
> = (...args: ConstructorParameters<Constructor>) => InstanceType<Constructor>;

/**
 * Make a wrapper function that can create an instance without needing to use `new`
 */
export const wrapConstructor =
  <Constructor extends new (...args: Array<any>) => any>(
    constructor: Constructor
  ): WrappedConstructor<Constructor> =>
  (...args) =>
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    new constructor(...args);

export const decorateHandler = <Return, Decorators extends Array<Decorator>>(
  handler: NextApiHandler<Return>,
  ...decorators: Decorators
): NextApiHandler<
  Return | GenericsFromDecorator<Decorators[number]>['return']
> =>
  decorators.reduceRight((handler, decorator) => decorator(handler), handler);

// eslint-disable-next-line @typescript-eslint/ban-types
export const safeAssign = <T extends {}>(
  target: T,
  ...sources: Array<Partial<T>>
): // eslint-disable-next-line @typescript-eslint/no-unsafe-return
T => Object.assign(target, ...sources);
