/* eslint-disable @typescript-eslint/no-unused-vars */
import { pipeline } from 'stream/promises';
import type { NextApiHandler, NextApiRequest } from 'next';
import z from 'zod';
import { createEndpointFactory, nothing } from '..';
import type { SerializedError } from './utils';
import { expectExactType, expectType } from './utils/typetests';

const createEndpoint = createEndpointFactory();

const endpoint = createEndpoint({
  methods: (method) => ({
    get: method({
      parsers: {
        query: (query) =>
          z
            .record(z.coerce.string().transform(() => 'foo' as const))
            .parse(query),
      },
      validators: {
        body: (body): body is 'body1' => body === 'body1',
        response: function (response, failWithCode): asserts response is 'foo' {
          if (response !== 'foo') {
            throw failWithCode(500, 'invalid response');
          }
        },
      },
      handler: (req) => {
        expectExactType('body1' as const)(req.body);
        expectExactType<Record<string, 'foo'>>({})(req.query);
        return 'foo' as const;
      },
    }),
    put: method<'bar', 'body2'>({
      handler: (req, res, { authentication }) => {
        expectExactType('body2' as const)(req.body);
        expectExactType<NextApiRequest['query']>({})(req.query);
        expectType<undefined>(authentication);
        return 'bar' as const;
      },
    }),
    patch:
      Math.random() > 0.5
        ? undefined
        : method<'baz'>({
            handler: () => 'baz',
          }),
  }),
  default: (method) => method<'baz', 'body3'>({ handler: () => 'baz' }),
});

const defaultHandler: NextApiHandler<'foo' | 'bar' | 'baz' | SerializedError> =
  endpoint.handler;

// @ts-expect-error Incompatible return types
const badDefaultHandler: NextApiHandler<'foo'> = endpoint.handler;

const wrappedHandler: NextApiHandler<
  'foo' | 'bar' | 'baz' | 'qux' | SerializedError
> = (req, res) => {
  switch (req.method) {
    case 'GET':
      return endpoint.methods.get(req, res);
    case 'PUT':
      return endpoint.methods.put(req, res);
    case 'DELETE':
      return res.status(200).json('qux');
    case 'PATCH': {
      if (endpoint.methods.patch) {
        return endpoint.methods.patch(req, res);
      } else {
        return endpoint.default(req, res);
      }
    }
    default:
      return endpoint.default(req, res);
  }
};

const endpointNoDefault = createEndpoint({
  methods: (method) => ({
    get: method<'foo'>({
      handler: () => 'foo',
    }),
    put: method<'bar'>({
      handler: () => 'bar',
    }),
  }),
});

const badWrappedHandler: NextApiHandler<'foo' | 'qux' | SerializedError> = (
  req,
  res
) => {
  switch (req.method) {
    case 'GET':
      return endpointNoDefault.methods.get(req, res);
    case 'PUT':
      // @ts-expect-error incompatible return type
      return endpointNoDefault.methods.put(req, res);
    case 'DELETE':
      // @ts-expect-error unsupported method
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      return endpointNoDefault.methods.delete(req, res);
    default:
      // @ts-expect-error no default given
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      return endpointNoDefault.default(req, res);
  }
};

const endpointWithNothing = createEndpoint({
  methods: (method) => ({
    get: method<typeof nothing>({
      handler: async (req, res) => {
        res.send(true); // this shouldn't error because T should be any
        await pipeline('', res);
        return nothing;
      },
    }),
  }),
});

const createEndpointWithAuth = createEndpointFactory({
  authenticate: (req, failWithCode) => ({ auth: true }),
});

const endpointWithAuth = createEndpointWithAuth({
  methods: (method) => ({
    get: method({
      handler: (req, res, { authentication }) => {
        expectType<{ auth: boolean }>(authentication);
      },
    }),
  }),
});

const endpointWithAuthDisabled = createEndpointWithAuth({
  methods: (method) => ({
    get: method({
      handler: (req, res, { authentication }) => {
        expectType<undefined>(authentication);
      },
    }),
  }),
  disableAuthentication: true,
});

const createEndpointWithExtra = createEndpointFactory({
  extraApi: (req, str: string) => ({ str }),
});

const endpointWithExtra = createEndpointWithExtra({
  methods: (method) => ({
    get: method({
      handler: (req, res, { extra }) => {
        expectExactType({ str: '' })(extra);
      },
      extraOptions: 'foo',
    }),
  }),
  disableAuthentication: true,
});

const createEndpointWithExtraOptional = createEndpointFactory({
  extraApi: (req, str?: string) => ({ str }),
});

const endpointWithExtraOptional = createEndpointWithExtraOptional({
  methods: (method) => ({
    get: method({
      handler: (req, res, { extra }) => {
        expectExactType<{ str: string | undefined }>({ str: '' })(extra);
      },
    }),
  }),
  disableAuthentication: true,
});
