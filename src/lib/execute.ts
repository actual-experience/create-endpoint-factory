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
import type { ConditionalBool } from './utils/types';

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

export const executeDefinition = async <
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
) => {
  try {
    const authentication = disableAuthentication
      ? undefined
      : await authenticate(globalAuthenticate, req);
    const data: HandlerData<
      any,
      any,
      ConditionalBool<DisableAuthentication, undefined, Authentication>,
      ExtraApi
    > = {
      req,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      body: (await parsers?.body?.(req.body, failWithCode, req)) ?? req.body,
      query:
        (await parsers?.query?.(req.query, failWithCode, req)) ?? req.query,
      authentication: authentication as ConditionalBool<
        DisableAuthentication,
        undefined,
        Authentication
      >,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      extra: extraApi?.(req, extraOptions),
    };
    const api: HandlerApi<ReturnType> = {
      res,
      succeedWithCode,
      failWithCode,
    };
    const response = await handler(data, api);
    if (isNothing(response) || res.writableEnded) {
      return;
    }
    if (response instanceof ResError) {
      throw response;
    } else if (response instanceof ResSuccess) {
      return res.status(response.statusCode).json(response.response);
    } else {
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
