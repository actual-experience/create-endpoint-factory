/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NextApiRequest, NextApiResponse } from 'next';
import type { ConditionalBool } from './utils/types';
import type { SerializedError } from './utils';
import { HttpMethod } from './constants';
import {
  CreateExtraApi,
  EndpointConfig,
  EndpointDefinition,
  EndpointFactoryConfig,
  MethodBuilder,
  MethodDefinition,
  MethodDefinitions,
} from './types';
import { executeDefinition } from './execute';

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
