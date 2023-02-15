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
  MethodDefinition,
  MethodHandlerApi,
} from './types';
import type { SerializedError } from './utils';
import { safeAssign, miniSerializeError } from './utils';
import type { ConditionalBool, Validator } from './utils/types';

const validate = <T, Input = any>(
  validator:
    | Validator<T, Input, [failWithCode: MethodHandlerApi['failWithCode']]>
    | undefined,
  input: Input,
  defaultErrorArgs: Parameters<MethodHandlerApi['failWithCode']>
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
  res: NextApiResponse
) => {
  try {
    const authentication = disableAuthentication
      ? undefined
      : await authenticate(globalAuthenticate, req);
    const api: MethodHandlerApi<
      ReturnType,
      ConditionalBool<DisableAuthentication, undefined, Authentication>
    > = {
      succeedWithCode,
      failWithCode,
      authentication: authentication as ConditionalBool<
        DisableAuthentication,
        undefined,
        Authentication
      >,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      extra: extraApi?.(req, extraOptions),
    };
    safeAssign(req, {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      body: parsers?.body?.(req.body, failWithCode, req) ?? req.body,
      query: parsers?.query?.(req.query, failWithCode, req) ?? req.query,
    });
    validate(validators?.body, req.body, [400, 'Invalid body']);
    validate(validators?.query, req.query, [400, 'Invalid query']);
    const response = await handler(req, res, api);
    if (isNothing(response) || res.writableEnded) {
      return;
    }
    if (response instanceof ResError) {
      throw response;
    } else if (response instanceof ResSuccess) {
      const { response: resp } = response;
      const parsedResponse =
        parsers?.response?.(resp, failWithCode, req, res) ?? resp;
      validate(validators?.response, parsedResponse, [500, 'Invalid response']);
      return res.status(response.statusCode).json(parsedResponse);
    } else {
      const parsedResponse =
        parsers?.response?.(response, failWithCode, req, res) ?? response;
      validate(validators?.response, parsedResponse, [500, 'Invalid response']);
      if (typeof parsedResponse === 'undefined') {
        return res.status(204).end();
      } else {
        return res.status(200).json(parsedResponse);
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
