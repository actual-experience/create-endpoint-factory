import type { NextApiRequest, NextApiResponse } from 'next';
import {
  failWithCode,
  succeedWithCode,
  nothing,
  ResError,
  ResSuccess,
} from './constants';
import type {
  CreateExtraApi,
  EndpointFactoryConfig,
  MethodDefinition,
  MethodHandlerApi,
} from './types';
import type { SerializedError } from './utils';
import { miniSerializeError } from './utils';
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
