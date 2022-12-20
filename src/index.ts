// TODO: move a lot of these types etc. elsewhere
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NextApiRequest, NextApiResponse, NextApiHandler } from 'next';
import type {
  ConditionalBool,
  Id,
  IfMaybeUndefined,
  IsAny,
  MaybePromise,
  NoInfer,
} from './ts-utils';
import type { SerializedError } from './utils';
import { miniSerializeError } from './utils';

export type TypeGuard<T, Input = any, ExtraParams extends [...any[]] = []> = {
  (input: Input, ...params: ExtraParams): input is T extends Input ? T : never;
};

export type TypeInvariant<
  T,
  Input = any,
  ExtraParams extends [...any[]] = []
> = {
  (input: Input, ...params: ExtraParams): asserts input is T extends Input
    ? T
    : never;
};

export type Validator<T, Input = any, ExtraParams extends [...any[]] = []> =
  | TypeGuard<T, Input, ExtraParams>
  | TypeInvariant<T, Input, ExtraParams>;

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
// shamelessly stolen from immer
export const nothing: Nothing = hasSymbol
  ? Symbol.for('create-endpoint-factory-nothing')
  : ({ ['create-endpoint-factory-nothing']: true } as any);

/** Use a class type for `nothing` so its type is unique */
export class Nothing {
  // This lets us do `Exclude<T, Nothing>`
  // @ts-expect-error yes this is gross
  private _!: unique symbol;
}

type NothingToAny<T> = T extends Nothing ? any : T;

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

const failWithCode: MethodHandlerApi['failWithCode'] = (...args) =>
  new ResError(...args);

/**
 * Used to return a success response with a given code.
 *
 * Use `succeedWithCode` instead of this directly.
 */
class ResSuccess<ReturnType = any> {
  constructor(public statusCode: number, public response: ReturnType) {}
}

type MethodHandlerApi<
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

type GenericsFromDefinition<Definition extends MethodDefinition> =
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

type GenericsFromConfig<Config extends EndpointFactoryConfig> =
  Config extends EndpointFactoryConfig<
    infer Error,
    infer Authentication,
    infer ExtraApi
  >
    ? { error: Error; authentication: Authentication; extra: ExtraApi }
    : never;

interface MethodBuilder<
  Authentication = any,
  ExtraApi extends CreateExtraApi = CreateExtraApi
> {
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
}

type MethodDefinitionToHandler<
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

type MethodDefinitions<
  Authentication = any,
  ExtraApi extends CreateExtraApi = CreateExtraApi
> = Partial<
  Record<
    Lowercase<HttpMethod>,
    MethodDefinition<any, any, any, Authentication, ExtraApi>
  >
>;

type MethodDefinitionsToHandlers<
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

type UnionGenerics<
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

type EndpointDefinition<
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

type CreateExtraApi<Options = any, Return = any> = (
  req: NextApiRequest,
  ...args: IfMaybeUndefined<Options, [options?: Options], [options: Options]>
) => Return;

type ExtraApiOptions<
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

type ExtraApiReturn<EA extends CreateExtraApi> = ReturnType<EA>;

type EndpointFactoryConfig<
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

type EndpointConfig<
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

const validate = <T, Input = any>(
  validator:
    | Validator<T, Input, [failWithCode: MethodHandlerApi['failWithCode']]>
    | undefined,
  input: Input,
  defaultErrorArgs: Parameters<typeof failWithCode>
) => {
  const possiblyBool = validator?.(input, failWithCode);
  if (typeof possiblyBool === 'boolean' && !possiblyBool) {
    throw failWithCode(...defaultErrorArgs);
  }
};

const authenticate = <Authentication = undefined>(
  authenticationFn: EndpointFactoryConfig<any, Authentication>['authenticate'],
  req: NextApiRequest
) => {
  try {
    return authenticationFn?.(req, failWithCode);
  } catch (err) {
    if (err instanceof ResError) {
      throw err;
    }
    console.log(err);
    throw new ResError(
      401,
      err instanceof Error ? err.message : 'Authentication failed'
    );
  }
};

const executeDefinition = async <
  ReturnType = any,
  SerializedErrorType = SerializedError,
  Authentication = undefined,
  DisableAuthentication extends boolean = false,
  ExtraApi extends CreateExtraApi = CreateExtraApi
>(
  {
    serializeError = miniSerializeError as (
      err: unknown
    ) => SerializedErrorType,
    authenticate: globalAuthenticate,
    extraApi,
  }: EndpointFactoryConfig<SerializedErrorType, Authentication, ExtraApi>,
  {
    validators,
    handler,
    extraOptions,
  }: MethodDefinition<
    ReturnType,
    any,
    NextApiRequest['query'],
    ConditionalBool<DisableAuthentication, undefined, Authentication>,
    ExtraApi
  >,
  disableAuthentication: DisableAuthentication,
  req: NextApiRequest,
  res: NextApiResponse<ReturnType | SerializedErrorType>
) => {
  try {
    const authentication = disableAuthentication
      ? undefined
      : await authenticate(globalAuthenticate, req);
    const api: MethodHandlerApi<
      ReturnType,
      ConditionalBool<DisableAuthentication, undefined, Authentication>
    > = {
      succeedWithCode: (...args) => new ResSuccess(...args),
      failWithCode,
      authentication: authentication as ConditionalBool<
        DisableAuthentication,
        undefined,
        Authentication
      >,
      extra: extraApi?.(req, extraOptions),
    };
    validate(validators?.body, req.body, [400, 'Invalid body']);
    validate(validators?.query, req.query, [400, 'Invalid query']);
    const response = await handler(req, res, api);
    if (response === nothing || res.writableEnded) {
      return;
    }
    if (response instanceof ResError) {
      throw response;
    } else if (response instanceof ResSuccess) {
      validate(validators?.response, response.response, [
        500,
        'Invalid response',
      ]);
      return res.status(response.statusCode).json(response.response);
    } else {
      validate(validators?.response, response, [500, 'Invalid response']);
      if (typeof response === 'undefined') {
        return res.status(204).end();
      } else {
        return res.status(200).json(response);
      }
    }
  } catch (error) {
    if (error instanceof ResError) {
      return res.status(error.statusCode).json(serializeError(error));
    } else {
      return res.status(500).json(serializeError(error));
    }
  }
};

/**
 * Build an API handler factory with properly typed handlers per method.
 *
 * If a method handler doesn't return anything, the response will automatically use 204 No Content.
 * If a method handler returns data, then the response will use 200 OK.
 * To return a custom response code, return `succeedWithCode(code, data)`.
 *
 * If an uncaught error occurs, the response will automatically use 500 Internal Server Error.
 * To use a custom error code, throw `failWithCode(code, error)`.
 *
 * ```ts
 *
 * export const createEndpoint = createEndpointFactory({ authenticate: (req) => getAuthTokens(req.headers) });
 *
 * // api/books/
 * export default createEndpoint({
 *   methods: (build) => ({
 *     get: build.method<{ books: Book[] }>({
 *       handler: async () => ({ books: await Book.findAll() }),
 *     }),
 *     post: build.method<{ id: EntityId }>({
 *       handler: async (req, res, { failWithCode, succeedWithCode }) => {
 *         const parseResult = BookSchema.safeParse(req.body);
 *         if (!parseResult.success) {
 *           throw failWithCode(400, parseResult.error.message, parseResult.error);
 *         }
 *         const { id } = await Book.create(parseResult.data);
 *         res.setHeader('Location', `api/books/${id}`);
 *         return succeedWithCode(201, { id });
 *       },
 *     }),
 *   }),
 * }).handler;
 *
 * // api/books/:id
 * export default createEndpoint({
 *   methods: (build) => ({
 *     get: build.method<Book>({
 *       handler: async (req, res, { failWithCode }) => await getBookFromReq(req),
 *     }),
 *     patch: build.method<void>({
 *       handler: async (req, res, { failWithCode }) => {
 *         const book = await getBookFromReq(req);
 *         const parseResult = BookSchema.partial().safeParse(req.body);
 *         if (!parseResult.success) {
 *           throw failWithCode(400, parseResult.error.message, parseResult.error);
 *         }
 *         await book.update(parseResult.data);
 *         // we don't return anything, so code is automatically 204
 *       },
 *     }),
 *     delete: build.method<void>({
 *       handler: async (req) => {
 *         const book = await getBookFromReq(req);
 *         await book.delete();
 *       },
 *     }),
 *   }),
 * }).handler;
 *
 * // api/auth/token
 * export default createEndpoint({
 *   methods: (build) => ({
 *    post: build.method<{ token: string }>({
 *      handler: async (req, res, { failWithCode }) => {
 *        const parseResult = BodySchema.safeParse(req.body);
 *        if (!parseResult.success) {
 *          throw failWithCode(400, parseResult.error.message, parseResult.error);
 *        }
 *        const token = await getTokenForBody(parseResult.data);
 *        return { token };
 *      },
 *    }),
 *   }),
 *   disableAuthentication: true,
 * }).handler;
 * ```
 */
export const createEndpointFactory =
  <
    SerializedErrorType = SerializedError,
    Authentication = undefined,
    ExtraApi extends CreateExtraApi = CreateExtraApi<void, undefined>
  >(
    config: EndpointFactoryConfig<
      SerializedErrorType,
      Authentication,
      ExtraApi
    > = {}
  ) =>
  <
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
    DisableAuthentication extends boolean = false
  >(
    endpointConfig: EndpointConfig<
      Definitions,
      Default,
      DisableAuthentication,
      Authentication,
      ExtraApi
    >
  ) => {
    const {
      methods: buildMethods,
      default: buildDefault,
      disableAuthentication = false as DisableAuthentication,
    } = endpointConfig;
    const builder: MethodBuilder<
      ConditionalBool<DisableAuthentication, undefined, Authentication>,
      ExtraApi
    > = {
      method: (definition) => definition,
    };
    const methodDefinitions = buildMethods(builder);
    const defaultDefinition = buildDefault?.(builder);
    return {
      methods: Object.fromEntries(
        Object.entries(methodDefinitions).map(([key, definition]) => [
          key,
          definition &&
            ((req: NextApiRequest, res: NextApiResponse) =>
              executeDefinition(
                config,
                definition,
                disableAuthentication,
                req,
                res
              )),
        ])
      ),
      ...(defaultDefinition && {
        default: (req: NextApiRequest, res: NextApiResponse) =>
          executeDefinition(
            config,
            defaultDefinition!,
            disableAuthentication,
            req,
            res
          ),
      }),
      handler: async (req, res) => {
        const { method = '' } = req;
        const definition =
          methodDefinitions[method.toLowerCase() as Lowercase<HttpMethod>];
        if (definition) {
          return await executeDefinition(
            config,
            definition,
            disableAuthentication,
            req,
            res
          );
        } else if (defaultDefinition) {
          return await executeDefinition(
            config,
            defaultDefinition!,
            disableAuthentication,
            req,
            res
          );
        } else {
          res.setHeader(
            'Allow',
            Object.keys(methodDefinitions)
              .map((method) => method.toUpperCase())
              .join(',')
          );
          return res.status(405).end();
        }
      },
    } as EndpointDefinition<Definitions, Default, typeof config>;
  };
