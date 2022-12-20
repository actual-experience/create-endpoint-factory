import type { NextApiRequest, NextApiResponse, NextApiHandler } from 'next';
import { HttpMethod, NothingToAny, ResError, ResSuccess } from './constants';
import { SerializedError } from './utils';
import {
  ConditionalBool,
  Id,
  IfMaybeUndefined,
  IsAny,
  MaybePromise,
  NoInfer,
  Validator,
} from './utils/types';

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

export interface CustomizedNextApiHandler<
  ReturnType = any,
  Body extends NextApiRequest['body'] = NextApiRequest['body'],
  Query extends NextApiRequest['query'] = NextApiRequest['query'],
  SerializedErrorType = SerializedError
> extends NextApiHandler<NothingToAny<ReturnType> | SerializedErrorType> {
  /**
   * "Fake" property to help with extracting types
   * @internal
   */
  _body: Body;
  /**
   * "Fake" property to help with extracting types
   * @internal
   */
  _query: Query;
}

export type MethodHandlerApi<
  ReturnType = any,
  Authentication = any,
  ExtraApi extends CreateExtraApi = CreateExtraApi
> = {
  /**
   * Return a successful response with a specified HTTP code
   * ```js
   * return succeedWithCode(
   *   201, // HTTP code
   *   { id: createdPost.id }, // response data
   * );
   * ```
   */
  succeedWithCode: (
    ...args: ConstructorParameters<typeof ResSuccess<ReturnType>>
  ) => ResSuccess<ReturnType>;
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
  failWithCode: (...args: ConstructorParameters<typeof ResError>) => ResError;
  /**
   * Returned value from authentication function.
   * Undefined if authentication is disabled.
   */
  authentication: Authentication;
  /**
   * Information returned from the `extraApi` function.
   */
  extra: ExtraApiReturn<ExtraApi>;
};

export type MethodDefinition<
  ReturnType = any,
  Body extends NextApiRequest['body'] = NextApiRequest['body'],
  Query = any,
  Authentication = any,
  ExtraApi extends CreateExtraApi = CreateExtraApi
> = {
  /**
   * Validate the body/query/response is the correct type, either with a type guard (return true if match, false if not) or an invariant (throw if not match).
   * If a validator returns false, an error will be thrown (code 400 for body/query, 500 for response).
   * If a standard error is thrown by a validator, 500 code will be used.
   * Each validator receives `failWithCode` as its second argument, to allow for throwing errors with other HTTP codes.
   */
  validators?: {
    body?: Validator<
      Body,
      NextApiRequest['body'],
      [failWithCode: MethodHandlerApi['failWithCode']]
    >;
    query?: Validator<
      Query,
      NextApiRequest['query'],
      [failWithCode: MethodHandlerApi['failWithCode']]
    >;
    response?: Validator<
      ReturnType,
      any,
      [failWithCode: MethodHandlerApi['failWithCode']]
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

export type GenericsFromHandler<Handler extends CustomizedNextApiHandler> =
  Handler extends CustomizedNextApiHandler<
    infer Return,
    infer Body,
    infer Query,
    infer Error
  >
    ? { return: Return; body: Body; query: Query; error: Error }
    : never;

export type GenericsFromConfig<Config extends EndpointFactoryConfig> =
  Config extends EndpointFactoryConfig<
    infer Error,
    infer Authentication,
    infer ExtraApi
  >
    ? { error: Error; authentication: Authentication; extra: ExtraApi }
    : never;

export type MethodBuilder<
  Authentication = any,
  ExtraApi extends CreateExtraApi = CreateExtraApi
> = {
  /**
   * Define a method handler and associated configuration.
   */
  method: <
    ReturnType = any,
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
};

export type MethodDefinitionToHandler<
  Definition extends MethodDefinition,
  Config extends EndpointFactoryConfig,
  DefGenerics extends GenericsFromDefinition<Definition> = GenericsFromDefinition<Definition>,
  ConfGenerics extends GenericsFromConfig<Config> = GenericsFromConfig<Config>
> = CustomizedNextApiHandler<
  DefGenerics['return'],
  DefGenerics['body'],
  DefGenerics['query'],
  ConfGenerics['error']
>;

export type MethodDefinitions<
  Authentication = any,
  ExtraApi extends CreateExtraApi = CreateExtraApi
> = Partial<
  Record<
    Lowercase<HttpMethod>,
    MethodDefinition<any, any, any, Authentication, ExtraApi>
  >
>;

export type MethodDefinitionsToHandlers<
  Definitions extends MethodDefinitions,
  Config extends EndpointFactoryConfig
> = {
  [Method in keyof Definitions]: Definitions[Method] extends MethodDefinition
    ? MethodDefinitionToHandler<Definitions[Method], Config>
    : [Definitions[Method]] extends [infer Def | undefined]
    ? Def extends MethodDefinition
      ? MethodDefinitionToHandler<Def, Config> | undefined
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
  Config extends EndpointFactoryConfig,
  UnionedGenerics extends UnionGenerics<Definitions, Default> = UnionGenerics<
    Definitions,
    Default
  >,
  ConfGenerics extends GenericsFromConfig<Config> = GenericsFromConfig<Config>
> = Id<
  {
    /** Individual handlers for each method. */
    methods: MethodDefinitionsToHandlers<Definitions, Config>;
    /** Combined handler, which will automatically choose the respective handler (or return 405 if none found) based on the method requested */
    handler: CustomizedNextApiHandler<
      UnionedGenerics['return'],
      UnionedGenerics['body'],
      UnionedGenerics['query'],
      ConfGenerics['error']
    >;
  } & (Default extends MethodDefinition
    ? {
        /** Catchall handler which will be used if the method doesn't have a specific handler */
        default: MethodDefinitionToHandler<Default, Config>;
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

export type EndpointFactoryConfig<
  SerializedErrorType = any,
  Authentication = any,
  ExtraApi extends CreateExtraApi = CreateExtraApi
> = {
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
};

export type EndpointConfig<
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
  ExtraApi extends CreateExtraApi = CreateExtraApi
> = {
  /**
   * Callback to define individual method handlers.
   * ```ts
   * methods: (build) => ({ get: build.method<'foo'>({ handler: () => 'foo' }) })
   * ```
   */
  methods: (
    build: MethodBuilder<
      ConditionalBool<DisableAuthentication, undefined, Authentication>,
      ExtraApi
    >
  ) => Definitions;
  /**
   * Callback to define a catch-all handler, used if there isn't a specific handler provided for the requested method.
   * ```ts
   * default: (build) => build.method<'bar'>({ handler: () => 'bar' });
   * ```
   */
  default?: (
    build: MethodBuilder<
      ConditionalBool<DisableAuthentication, undefined, Authentication>,
      ExtraApi
    >
  ) => Default;
  /**
   * Disable authentication for this endpoint.
   * The `authenticate` function from createEndpoint will not be used, and `handlerApi.authentication` will be undefined.
   */
  disableAuthentication?: DisableAuthentication;
};
