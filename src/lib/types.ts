import type { NextApiRequest, NextApiResponse, NextApiHandler } from 'next';
import type {
  HttpMethod,
  NothingToAny,
  ResError,
  ResSuccess,
} from './constants';
import type { SerializedError, WrappedConstructor } from './utils';
import type {
  ConditionalBool,
  Id,
  IfMaybeUndefined,
  IsAny,
  MaybePromise,
  NoInfer,
  Parser,
} from './utils/types';

type ExcludeAny<T> = IsAny<T, never, T>;

export interface CustomizedNextApiRequest<
  Body extends NextApiRequest['body'] = NextApiRequest['body'],
  Query = any
> extends NextApiRequest {
  body: Body;
  query: IsAny<
    Query,
    NextApiRequest['query'],
    Query extends NextApiRequest['query'] ? Query : NextApiRequest['query']
  >;
}

export type CustomizedNextApiHandler<
  ReturnType = any,
  SerializedErrorType = SerializedError,
  DecoratorReturn = any
> = NextApiHandler<
  NothingToAny<ReturnType> | SerializedErrorType | ExcludeAny<DecoratorReturn> // do we definitely want this? it stops an untyped decorator polluting the final union, but might be confusing (do we want to allow the pollution? how do we handle when there are no decorators?)
>;

export type Decorator<ReturnType = any> = (
  handler: NextApiHandler<ReturnType>
) => NextApiHandler<ReturnType>;

export type GenericsFromDecorator<Deco extends Decorator> =
  Deco extends Decorator<infer Return> ? { return: Return } : never;

export interface MethodHandlerApi<
  ReturnType = any,
  Authentication = any,
  ExtraApi extends CreateExtraApi = CreateExtraApi
> {
  /**
   * Return a successful response with a specified HTTP code
   * ```js
   * return succeedWithCode(
   *   201, // HTTP code
   *   { id: createdPost.id }, // response data
   * );
   * ```
   */
  succeedWithCode: WrappedConstructor<typeof ResSuccess<ReturnType>>;
  /**
   * Throw an error with a specified HTTP code.
   * ```js
   * throw failWithCode(
   *   400, // HTTP error code (defaults to 500)
   *   'Oh no!', // error message
   *   { invalidFile: true } // any other information useful for the UI to use (optional)
   * );
   * ```
   */
  failWithCode: WrappedConstructor<typeof ResError>;
  /**
   * Returned value from authentication function.
   *
   * Undefined if authentication is disabled.
   */
  authentication: Authentication;
  /**
   * Information returned from the `extraApi` function.
   */
  extra: ExtraApiReturn<ExtraApi>;
}

export type MethodDefinition<
  ReturnType = any,
  Body extends NextApiRequest['body'] = NextApiRequest['body'],
  Query = any,
  Authentication = any,
  ExtraApi extends CreateExtraApi = CreateExtraApi
> = {
  /**
   * Receive the body/query/response and return a validated version of it. Expected to throw errors if invalid type.
   * If a standard error is thrown, 500 code will be used.
   * Each parser receives `failWithCode` as its second argument, to allow for throwing errors with other HTTP codes.
   *
   * Original request object is passed as third argument.
   *
   * **Will be run *before* validators**
   */
  parsers?: {
    body?: Parser<
      Body,
      unknown,
      [failWithCode: MethodHandlerApi['failWithCode'], req: NextApiRequest]
    >;
    query?: Parser<
      Query,
      NextApiRequest['query'],
      [failWithCode: MethodHandlerApi['failWithCode'], req: NextApiRequest]
    >;
  };
  /**
   * Handles the request and return the specified data.
   */
  handler: (
    req: CustomizedNextApiRequest<Body, Query>,
    res: NextApiResponse<NothingToAny<ReturnType>>,
    api: MethodHandlerApi<ReturnType, Authentication, ExtraApi>
  ) => MaybePromise<
    NoInfer<ReturnType> | ResSuccess<NoInfer<ReturnType>> | ResError
  >;
} & IfMaybeUndefined<
  ExtraApiOptions<ExtraApi>,
  {
    /** Options to be passed to the `extraApi` function */
    extraOptions?: ExtraApiOptions<ExtraApi>;
  },
  {
    /** Options to be passed to the `extraApi` function */
    extraOptions: ExtraApiOptions<ExtraApi>;
  }
>;

export type GenericsFromDefinition<Definition extends MethodDefinition> =
  Definition extends MethodDefinition<
    infer ReturnType,
    infer Body,
    infer Query,
    infer Authentication,
    infer ExtraApi
  >
    ? {
        return: ReturnType;
        body: Body;
        query: Query;
        auth: Authentication;
        extra: ExtraApi;
      }
    : never;

export type GenericsFromHandler<
  Handler extends CustomizedNextApiHandler<any, any, any>
> = Handler extends CustomizedNextApiHandler<
  infer Return,
  infer Error,
  infer DecoratorReturn
>
  ? {
      return: Return;
      error: Error;
      decoratorReturn: DecoratorReturn;
    }
  : never;

export type GenericsFromConfig<Config extends EndpointFactoryConfig> =
  Config extends EndpointFactoryConfig<
    infer Error,
    infer Authentication,
    infer ExtraApi
  >
    ? { error: Error; authentication: Authentication; extra: ExtraApi }
    : never;

/**
 * Define a method handler and associated configuration.
 */
export type MethodBuilder<
  Authentication = any,
  ExtraApi extends CreateExtraApi = CreateExtraApi
> = {
  <ReturnType = unknown>(): <
    Body extends NextApiRequest['body'] = NextApiRequest['body'],
    Query extends NextApiRequest['query'] = NextApiRequest['query']
  >(
    definition: MethodDefinition<
      ReturnType,
      Body,
      Query,
      Authentication,
      ExtraApi
    >
  ) => typeof definition;
  <ReturnType = unknown>(
    definition: MethodDefinition<
      ReturnType,
      unknown,
      NextApiRequest['query'],
      Authentication,
      ExtraApi
    > & { parsers?: never }
  ): typeof definition;
};

export type MethodDefinitionToHandler<
  Definition extends MethodDefinition,
  Config extends EndpointFactoryConfig,
  DecorReturn = never,
  DefGenerics extends GenericsFromDefinition<Definition> = GenericsFromDefinition<Definition>,
  ConfGenerics extends GenericsFromConfig<Config> = GenericsFromConfig<Config>
> = CustomizedNextApiHandler<
  DefGenerics['return'],
  ConfGenerics['error'],
  DecorReturn
>;

export type MethodDefinitions<
  Authentication = any,
  ExtraApi extends CreateExtraApi = CreateExtraApi
> = Partial<
  Record<
    Lowercase<Exclude<HttpMethod, 'OPTIONS'>>,
    MethodDefinition<any, any, any, Authentication, ExtraApi>
  >
>;

export type MethodDefinitionsToHandlers<
  Definitions extends MethodDefinitions,
  Config extends EndpointFactoryConfig,
  DecoReturn = never
> = {
  [Method in keyof Definitions]: Definitions[Method] extends MethodDefinition
    ? MethodDefinitionToHandler<Definitions[Method], Config, DecoReturn>
    : [Definitions[Method]] extends [infer Def | undefined]
    ? Def extends MethodDefinition
      ? MethodDefinitionToHandler<Def, Config, DecoReturn> | undefined
      : never
    : never;
};

export type UnionGenerics<
  Definitions extends MethodDefinitions,
  Default extends MethodDefinition | undefined
> =
  | {
      [Method in keyof Definitions]: Definitions[Method] extends MethodDefinition
        ? GenericsFromDefinition<Definitions[Method]>
        : never;
    }[keyof Definitions]
  | (Default extends MethodDefinition
      ? GenericsFromDefinition<Default>
      : never);

export type EndpointDefinition<
  Definitions extends MethodDefinitions,
  Default extends MethodDefinition | undefined,
  Decorators extends Decorator[],
  Config extends EndpointFactoryConfig,
  UnionedGenerics extends UnionGenerics<Definitions, Default> = UnionGenerics<
    Definitions,
    Default
  >,
  ConfGenerics extends GenericsFromConfig<Config> = GenericsFromConfig<Config>,
  DecoReturn = Decorators['length'] extends 0
    ? any
    : GenericsFromDecorator<Decorators[number]>['return']
> = Id<
  {
    /** Individual handlers for each method. */
    methods: MethodDefinitionsToHandlers<Definitions, Config, DecoReturn>;
    /** Combined handler, which will automatically choose the respective handler (or return 405 if none found) based on the method requested */
    handler: CustomizedNextApiHandler<
      UnionedGenerics['return'],
      ConfGenerics['error'],
      DecoReturn
    >;
  } & (Default extends MethodDefinition
    ? {
        /** Catchall handler which will be used if the method doesn't have a specific handler */
        default: MethodDefinitionToHandler<Default, Config, DecoReturn>;
      }
    : // {} disappears in intersections, which we want here
      // eslint-disable-next-line @typescript-eslint/ban-types
      {})
>;

export type CreateExtraApi<Options = any, Return = any> = (
  req: NextApiRequest,
  ...args: IfMaybeUndefined<Options, [options?: Options], [options: Options]>
) => Return;

export type ExtraApiOptions<
  EA extends CreateExtraApi,
  Params extends Parameters<EA> = Parameters<EA>
> = [Params['length']] extends [2]
  ? Params extends [req: NextApiRequest, option: infer Options]
    ? Options
    : undefined
  : [1 | 2] extends [Params['length']]
  ? Params extends [req: NextApiRequest, option?: infer Options]
    ? Options | undefined
    : undefined
  : undefined;

export type ExtraApiReturn<EA extends CreateExtraApi> = ReturnType<EA>;

export interface EndpointFactoryConfig<
  SerializedErrorType = any,
  Authentication = any,
  ExtraApi extends CreateExtraApi = CreateExtraApi
> {
  /**
   * Receive any thrown errors (or returned `failWithCode`s) and return a serialized format suitable for sending via `json`.
   *
   * Defaults to `miniSerializeError`.
   */
  serializeError?: (err: unknown) => SerializedErrorType;
  /**
   * Perform authentication using information from the request.
   *
   * If this throws, code 401 will be used - throw failWithCode to use a different error code.
   */
  authenticate?: (
    req: NextApiRequest,
    failWithCode: MethodHandlerApi['failWithCode']
  ) => MaybePromise<Authentication>;
  /**
   * Derive extra information about the request, and include it as `extra` in the handlerApi object.
   */
  extraApi?: ExtraApi;
}

export interface EndpointConfig<
  Definitions extends MethodDefinitions<
    ConditionalBool<DisableAuthentication, undefined, Authentication>,
    ExtraApi
  >,
  Default extends
    | MethodDefinition<
        any,
        any,
        any,
        ConditionalBool<DisableAuthentication, undefined, Authentication>,
        ExtraApi
      >
    | undefined = undefined,
  DisableAuthentication extends boolean = false,
  Authentication = any,
  ExtraApi extends CreateExtraApi = CreateExtraApi,
  Decorators extends Decorator[] = []
> {
  /**
   * Callback to define individual method handlers.
   * ```ts
   * methods: (method) =>({ get: method<'foo'>({ handler: () => 'foo' }) })
   * ```
   */
  methods: (
    method: MethodBuilder<
      ConditionalBool<DisableAuthentication, undefined, Authentication>,
      ExtraApi
    >
  ) => Definitions;
  /**
   * Callback to define a catch-all handler, used if there isn't a specific handler provided for the requested method.
   * ```ts
   * default: (method) =>method<'bar'>({ handler: () => 'bar' });
   * ```
   */
  default?: (
    method: MethodBuilder<
      ConditionalBool<DisableAuthentication, undefined, Authentication>,
      ExtraApi
    >
  ) => Default;
  /**
   * Disable authentication for this endpoint.
   *
   * The `authenticate` function from createEndpoint will not be used, and `handlerApi.authentication` will be undefined.
   */
  disableAuthentication?: DisableAuthentication;
  /**
   * Decorators (functions which receive a handler and return a handler) to be applied to all final API handlers.
   *
   * Applied right to left, e.g. `[withFoo, withBar]` is equivalent to `withFoo(withBar(handler))`
   */
  decorators?: Decorators;
}
