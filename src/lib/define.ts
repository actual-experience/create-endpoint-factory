import type { NextApiRequest, NextApiResponse } from 'next';
import type { HttpMethod } from './constants';
import { httpMethods } from './constants';
import { executeDefinition } from './execute';
import type {
  CreateExtraApi,
  Decorator,
  EndpointConfig,
  EndpointDefinition,
  EndpointFactoryConfig,
  MethodBuilder,
  MethodDefinition,
  MethodDefinitions,
} from './types';
import type { SerializedError } from './utils';
import { assert, decorateHandler } from './utils';
import type { ConditionalBool, KeysMatching } from './utils/types';
import { id } from './utils/types';

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
 *   methods: ({ method }) =>({
 *     get: method<{ books: Book[] }>({
 *       handler: async () => ({ books: await Book.findAll() }),
 *     }),
 *     post: method<{ id: EntityId }>({
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
 *   methods: ({ method }) =>({
 *     get: method<Book>({
 *       handler: async (req, res, { failWithCode }) => await getBookFromReq(req),
 *     }),
 *     patch: method<void>({
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
 *     delete: method<void>({
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
 *   methods: ({ method }) =>({
 *    post: method<{ token: string }>({
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
export const createEndpointFactory = <
  SerializedErrorType = SerializedError,
  Authentication = undefined,
  ExtraApi extends CreateExtraApi = CreateExtraApi<void, undefined>
>(
  config: EndpointFactoryConfig<
    SerializedErrorType,
    Authentication,
    ExtraApi
  > = {}
) => {
  assert(
    typeof config === 'object',
    `\`createEndpointFactory\` configuration must be object, received ${typeof config}`
  );
  id<
    Array<
      KeysMatching<
        typeof config,
        ExtraApi | ((...args: any[]) => any) | undefined
      >
    >
  >(['authenticate', 'serializeError', 'extraApi']).map((opt) =>
    assert(
      typeof config[opt] === 'function' || typeof config[opt] === 'undefined',
      `\`${opt}\` callback must be function if provided, received ${typeof config[
        opt
      ]}`
    )
  );

  return <
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
    Decorators extends Decorator[] = []
  >(
    endpointConfig: EndpointConfig<
      Definitions,
      Default,
      DisableAuthentication,
      Authentication,
      ExtraApi,
      Decorators
    >
  ) => {
    assert(
      typeof endpointConfig === 'object',
      `configuration must be object, received ${typeof endpointConfig}`
    );

    const {
      methods: buildMethods,
      default: buildDefault,
      disableAuthentication = false as DisableAuthentication,
      decorators = [],
    } = endpointConfig;

    assert(
      typeof buildMethods === 'function',
      `\`methods\` callback must be function, received ${typeof buildMethods}`
    );
    assert(
      typeof buildDefault === 'function' || typeof buildDefault === 'undefined',
      `\`default\` callback must be function if provided, received ${typeof buildDefault}`
    );
    assert(
      typeof disableAuthentication === 'boolean',
      `\`disableAuthentication\` must be a boolean, received ${typeof disableAuthentication}`
    );

    const builder: MethodBuilder<
      ConditionalBool<DisableAuthentication, undefined, Authentication>,
      ExtraApi
    > = {
      method: (definition) => definition,
    };

    const methodDefinitions = buildMethods(builder);
    assert(
      typeof methodDefinitions === 'object',
      `\`methods\` callback must return an object, received ${typeof methodDefinitions}`
    );
    // TODO: do we want to limit keys in runtime too?
    const invalidDefinitions = Object.values(methodDefinitions).some(
      (definition) =>
        !(typeof definition === 'object' || typeof definition === 'undefined')
    );
    assert(
      !invalidDefinitions,
      invalidDefinitions
        ? // ensure we only actually build a message if we need it
          `returned \`methods\` object must have definitions (or undefined) for each key, received { ${Object.entries(
            methodDefinitions
          )
            .filter(
              ([, definition]) =>
                !(
                  typeof definition === 'object' ||
                  typeof definition === 'undefined'
                )
            )
            .map(([key, definition]) => `${key}: ${typeof definition}`)
            .join(', ')} }`
        : ''
    );

    const supportedMethods = httpMethods.filter(
      (method) =>
        typeof methodDefinitions[
          method.toLowerCase() as Lowercase<Exclude<typeof method, 'OPTIONS'>>
        ] !== 'undefined'
    );

    const defaultDefinition = buildDefault?.(builder);
    assert(
      typeof buildDefault === 'undefined' ||
        typeof defaultDefinition === 'object',
      `\`default\` callback must return an object, received ${typeof defaultDefinition}`
    );

    return {
      methods: Object.fromEntries(
        Object.entries(methodDefinitions).map(([key, definition]) => [
          key,
          definition &&
            decorateHandler(
              (req: NextApiRequest, res: NextApiResponse) =>
                executeDefinition(
                  config,
                  definition,
                  disableAuthentication,
                  req,
                  res
                ),
              ...decorators
            ),
        ])
      ),
      ...(defaultDefinition && {
        default: decorateHandler(
          (req: NextApiRequest, res: NextApiResponse) =>
            executeDefinition(
              config,
              defaultDefinition,
              disableAuthentication,
              req,
              res
            ),
          ...decorators
        ),
      }),
      handler: decorateHandler(async (req, res) => {
        const { method = '' } = req;

        if (method === 'OPTIONS') {
          res.setHeader('Allow', supportedMethods.join(','));
          return res.status(204).end();
        }

        const definition =
          methodDefinitions[
            method.toLowerCase() as Lowercase<Exclude<HttpMethod, 'OPTIONS'>>
          ];
        if (definition) {
          return executeDefinition(
            config,
            definition,
            disableAuthentication,
            req,
            res
          );
        } else if (defaultDefinition) {
          return executeDefinition(
            config,
            defaultDefinition,
            disableAuthentication,
            req,
            res
          );
        } else {
          res.setHeader('Allow', supportedMethods.join(','));
          return res.status(405).end();
        }
      }, ...decorators),
    } as EndpointDefinition<Definitions, Default, Decorators, typeof config>;
  };
};
