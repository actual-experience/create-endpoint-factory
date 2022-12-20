/* eslint-disable @typescript-eslint/no-unused-vars */
import { pipeline } from 'stream/promises';
import type { NextApiHandler, NextApiRequest } from 'next';
import { alwaysMatch, createEndpointFactory, nothing } from '..';
import type { SerializedError } from './utils';
import { expectExactType, expectNotAny, expectType } from './utils/typetests';

const createEndpoint = createEndpointFactory();

const endpoint = createEndpoint({
  methods: (build) => ({
    get: build.method({
      validators: {
        body: (body): body is 'body1' => body === 'body1',
        response: function validateResponse(
          response,
          failWithCode
        ): asserts response is 'foo' {
          if (!response) {
            throw new Error('No response');
          } else if (response !== 'foo') {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            throw failWithCode(500, 'Invalid response', { response });
          }
        },
        query: (query): query is { foo: 'bar' } => query.foo === 'bar',
      },
      handler: (req) => {
        expectType<'body1'>(req.body);
        expectNotAny(req.body);
        expectExactType({ foo: 'bar' as const })(req.query);
        return 'foo' as const;
      },
    }),
    put: build.method({
      validators: {
        body: alwaysMatch<'body2'>(),
        response: alwaysMatch<'bar'>(),
      },
      handler: (req, res, { authentication }) => {
        expectType<'body2'>(req.body);
        expectNotAny(req.body);
        expectExactType<NextApiRequest['query']>({})(req.query);
        expectType<undefined>(authentication);
        return 'bar' as const;
      },
    }),
    patch:
      Math.random() > 0.5
        ? undefined
        : build.method<'baz'>({
            handler: () => 'baz',
          }),
  }),
  default: (build) => build.method<'baz', 'body3'>({ handler: () => 'baz' }),
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
  methods: (build) => ({
    get: build.method<'foo'>({
      handler: () => 'foo',
    }),
    put: build.method<'bar'>({
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
  methods: (build) => ({
    get: build.method<typeof nothing>({
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
  methods: (build) => ({
    get: build.method({
      handler: (req, res, { authentication }) => {
        expectType<{ auth: boolean }>(authentication);
      },
    }),
  }),
});

const endpointWithAuthDisabled = createEndpointWithAuth({
  methods: (build) => ({
    get: build.method({
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
  methods: (build) => ({
    get: build.method({
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
  methods: (build) => ({
    get: build.method({
      handler: (req, res, { extra }) => {
        expectExactType<{ str: string | undefined }>({ str: '' })(extra);
      },
    }),
  }),
  disableAuthentication: true,
});