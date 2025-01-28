import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { NextApiRequest, NextApiResponse } from 'next';
import {
  failWithCode,
  succeedWithCode,
  ResError,
  ResSuccess,
  isNothing,
} from './constants';
import type {
  CreateExtraApi,
  EndpointFactoryConfig,
  HandlerData,
  MethodDefinition,
  HandlerApi,
} from './types';
import type { SerializedError } from './utils';
import { miniSerializeError } from './utils';
import type { ConditionalBool, MaybePromise, Parser } from './utils/types';

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
    throw failWithCode(
      401,
      err instanceof Error ? err.message : 'Authentication failed'
    );
  }
};

const parse = async <Input, Output, Args extends Array<any>>(
  data: Input,
  parser:
    | Parser<MaybePromise<Output>, Input, Args>
    | StandardSchemaV1<Input, Output>
    | undefined,
  failMessage: string,
  ...args: Args
) => {
  if (!parser) return data as never;
  if (typeof parser === 'function') {
    return parser(data, ...args);
  }
  const result = await parser['~standard'].validate(data);
  if (result.issues) {
    throw failWithCode(
      400,
      failMessage + '\n\n' + JSON.stringify(result.issues, null, 2)
    );
  }
  return result.value;
};

export const executeDefinition = async <
  ReturnType = any,
  SerializedErrorType = SerializedError,
  Authentication = undefined,
  DisableAuthentication extends boolean = false,
  ExtraApi extends CreateExtraApi = CreateExtraApi,
>(
  {
    serializeError = miniSerializeError as (
      err: unknown
    ) => SerializedErrorType,
    authenticate: globalAuthenticate,
    extraApi,
  }: EndpointFactoryConfig<SerializedErrorType, Authentication, ExtraApi>,
  {
    parsers,
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
  res: NextApiResponse
): Promise<void> => {
  try {
    const authentication = disableAuthentication
      ? undefined
      : await authenticate(globalAuthenticate, req);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const [body, query] = await Promise.all([
      parse(req.body, parsers?.body, 'Invalid body', failWithCode, req),
      parse(req.query, parsers?.query, 'Invalid query', failWithCode, req),
    ]);

    const data: HandlerData<
      any,
      any,
      ConditionalBool<DisableAuthentication, undefined, Authentication>,
      ExtraApi
    > = {
      req,

      body,
      query,
      authentication: authentication as never,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      extra: extraApi?.(req, extraOptions),
    };
    const api: HandlerApi<ReturnType> = {
      res,
      succeedWithCode,
      failWithCode,
    };
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const response = await handler(data, api);
    if (isNothing(response) || res.writableEnded) {
      return;
    }
    if (response instanceof ResError) {
      throw response;
    } else if (response instanceof ResSuccess) {
      res.status(response.statusCode).json(response.response);
      return;
    } else {
      if (typeof response === 'undefined') {
        res.status(204).end();
        return;
      }
      res.status(200).json(response);
      return;
    }
  } catch (error) {
    if (error instanceof ResError) {
      res.status(error.statusCode).json(serializeError(error));
      return;
    } else {
      res.status(500).json(serializeError(error));
      return;
    }
  }
};
