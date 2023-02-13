import stream from 'stream';
import { promisify } from 'util';
import type { NextApiResponse } from 'next';
import { testApiHandler } from 'next-test-api-route-handler';
import { z } from 'zod';
import { nothing, ResError, createEndpointFactory } from '..';
import type { Decorator, GenericsFromHandler } from './types';
import { id } from './utils/types';

const pipeline = promisify(stream.pipeline);

describe('createEndpointFactory', () => {
  it('should correctly handle each method', async () => {
    const createEndpoint = createEndpointFactory();

    const endpoint = createEndpoint({
      methods: ({ method }) => ({
        get: method<'foo', any, { foo: 'bar' }>({
          handler: () => Promise.resolve('foo'),
        }),
        post: method<'bar', 'baz', { foo: 'bar' }>({
          handler: (req, res, { succeedWithCode, failWithCode }) => {
            if (!req.body) {
              throw new Error('No body provided');
            }
            if (req.body !== 'baz') {
              return failWithCode(400, 'Invalid body');
            }
            return succeedWithCode(201, 'bar');
          },
        }),
      }),
    });

    await testApiHandler({
      handler: endpoint.handler,
      params: {
        foo: 'bar',
      } satisfies GenericsFromHandler<typeof endpoint.handler>['query'],
      test: async ({ fetch }) => {
        const getRes = await fetch();
        expect(getRes.status).toBe(200);
        expect(await getRes.json()).toBe<
          GenericsFromHandler<typeof endpoint.methods.get>['return']
        >('foo');

        const postRes = await fetch({
          method: 'POST',
          body: 'baz' satisfies GenericsFromHandler<
            typeof endpoint.methods.post
          >['body'],
        });
        expect(postRes.status).toBe(201);
        expect(await postRes.json()).toBe<
          GenericsFromHandler<typeof endpoint.methods.post>['return']
        >('bar');

        const badPostRes = await fetch({
          method: 'POST',
        });
        expect(badPostRes.status).toBe(500);
        const postError = await badPostRes.json();
        expect(
          typeof postError === 'object' ? postError.message : postError
        ).toBe('No body provided');

        const badBodyPostRes = await fetch({
          method: 'POST',
          body: 'foo',
        });
        expect(badBodyPostRes.status).toBe(400);
        const badBodyPostError = await badBodyPostRes.json();
        expect(
          typeof badBodyPostError === 'object'
            ? badBodyPostError.message
            : badBodyPostError
        ).toBe('Invalid body');
      },
    });
  });

  it('should return correct Allow header for unsupported methods or an OPTIONS request', async () => {
    const createEndpoint = createEndpointFactory();

    const endpoint = createEndpoint({
      methods: ({ method }) => ({
        get: method({
          // eslint-disable-next-line @typescript-eslint/no-empty-function
          handler: () => {},
        }),
        put: method({
          // eslint-disable-next-line @typescript-eslint/no-empty-function
          handler: () => {},
        }),
      }),
    });

    await testApiHandler({
      handler: endpoint.handler,
      test: async ({ fetch }) => {
        const optionsRes = (await fetch({
          method: 'OPTIONS',
        })) as unknown as Response;
        expect(optionsRes.status).toBe(204);
        expect(optionsRes.headers.get('Allow')).toBe('GET,PUT');

        const deleteRes = (await fetch({
          method: 'DELETE',
        })) as unknown as Response;
        expect(deleteRes.status).toBe(405);
        expect(deleteRes.headers.get('Allow')).toBe('GET,PUT');
      },
    });
  });

  it('should allow for a global authentication function to be set, which can be disabled for a singular endpoint', async () => {
    enum AuthStatus {
      Unauthenticated = 'unauthenticated',
      Unauthorized = 'unauthorized',
      Authorized = 'authorized',
    }

    const createEndpoint = createEndpointFactory({
      authenticate: (req, failWithCode) => {
        const { authorization } = req.headers;
        switch (authorization) {
          case AuthStatus.Unauthorized:
            throw failWithCode(403, authorization);
          case AuthStatus.Authorized:
            return { auth: true };
          default:
            throw new Error(authorization);
        }
      },
    });

    const endpoint = createEndpoint({
      methods: ({ method }) => ({
        get: method<AuthStatus.Authorized>({
          handler: (req, res, { authentication }) => {
            expect(authentication).toEqual({ auth: true });
            return AuthStatus.Authorized;
          },
        }),
      }),
    });

    await testApiHandler({
      handler: endpoint.handler,
      rejectOnHandlerError: true,
      test: async ({ fetch }) => {
        const unauthenticatedRes = await fetch({
          headers: { Authorization: AuthStatus.Unauthenticated },
        });
        expect(unauthenticatedRes.status).toBe(401);
        const unauthenticatedError = await unauthenticatedRes.json();
        expect(
          typeof unauthenticatedError === 'object' &&
            unauthenticatedError.message
        ).toBe(AuthStatus.Unauthenticated);

        const unauthorizedRes = await fetch({
          headers: { Authorization: AuthStatus.Unauthorized },
        });
        expect(unauthorizedRes.status).toBe(403);
        const unauthorizedError = await unauthorizedRes.json();
        expect(
          typeof unauthorizedError === 'object' && unauthorizedError.message
        ).toBe(AuthStatus.Unauthorized);

        const authorizedRes = await fetch({
          headers: { Authorization: AuthStatus.Authorized },
        });
        expect(authorizedRes.status).toBe(200);
        expect(await authorizedRes.json()).toBe(AuthStatus.Authorized);
      },
    });

    const endpointWithoutAuth = createEndpoint({
      methods: ({ method }) => ({
        get: method<AuthStatus.Unauthenticated>({
          handler: (req, res, { authentication }) => {
            expect(authentication).toEqual(authentication);
            return AuthStatus.Unauthenticated;
          },
        }),
      }),
      disableAuthentication: true,
    });

    await testApiHandler({
      handler: endpointWithoutAuth.handler,
      rejectOnHandlerError: true,
      test: async ({ fetch }) => {
        const unauthenticatedRes = await fetch({
          headers: { Authorization: AuthStatus.Unauthenticated },
        });
        expect(unauthenticatedRes.status).toBe(200);
        expect(await unauthenticatedRes.json()).toBe(
          AuthStatus.Unauthenticated
        );
      },
    });
  });

  it('allows custom parsers for query/body', async () => {
    const createEndpoint = createEndpointFactory();

    const endpointWithValidation = createEndpoint({
      methods: ({ method }) => ({
        post: method({
          parsers: {
            body: (body, failWithCode): 'foo' => {
              if (body !== 'foo') {
                throw failWithCode(400, 'Invalid body');
              }
              return body;
            },
            query: (query, failWithCode): { foo: 'bar' } => {
              const { foo } = query;
              if (foo !== 'bar') {
                throw failWithCode(400, 'Invalid query');
              }
              return { foo };
            },
          },
          handler: () => 'hi',
        }),
      }),
    });

    let useCorrectParams = true;
    await testApiHandler({
      handler: endpointWithValidation.handler,
      paramsPatcher: (params) => {
        params.foo = useCorrectParams ? 'bar' : 'foo';
      },
      test: async ({ fetch }) => {
        useCorrectParams = false;
        const invalidQueryRes = await fetch({ method: 'POST', body: 'foo' });
        expect(invalidQueryRes.status).toBe(400);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        expect((await invalidQueryRes.json()).message).toBe('Invalid query');
        useCorrectParams = true;

        const invalidBodyRes = await fetch({ method: 'POST', body: 'bar' });
        expect(invalidBodyRes.status).toBe(400);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        expect((await invalidBodyRes.json()).message).toBe('Invalid body');
      },
    });

    const endpointWithTransforms = createEndpoint({
      methods: ({ method }) => ({
        post: method({
          parsers: {
            body: (body) =>
              z.coerce
                .number()
                .transform((n) => n * 2)
                .parse(body),
            query: (query): { num: `${number}` } => {
              const { num = '' } = query;
              return { num: `${parseInt(num.toString()) * 2}` };
            },
          },
          handler: (req) => ({
            body: req.body,
            query: req.query,
          }),
        }),
      }),
    });

    await testApiHandler({
      handler: endpointWithTransforms.handler,
      params: id<
        GenericsFromHandler<typeof endpointWithTransforms.handler>['query']
      >({
        num: '2',
      }),
      test: async ({ fetch }) => {
        const res = await fetch({ method: 'POST', body: 3 });
        expect(await res.json()).toStrictEqual({
          body: 6,
          query: {
            num: '4',
          },
        });
      },
    });
  });

  it('should allow for validation of query/body/response using type guards or invariants', async () => {
    const createEndpoint = createEndpointFactory();

    const endpoint = createEndpoint({
      methods: ({ method }) => ({
        post: method({
          validators: {
            body: (body): body is 'foo' => body === 'foo',
            query: (query): query is { foo: 'bar' } => query.foo === 'bar',
            response: function (
              response,
              failWithCode
            ): asserts response is 'bye' {
              if (response !== 'bye') {
                throw failWithCode(404, 'Whoopsie');
              }
            },
          },
          // @ts-expect-error wrong response
          handler: () => 'hi',
        }),
      }),
    });

    let useCorrectParams = true;
    await testApiHandler({
      handler: endpoint.handler,
      paramsPatcher: (params) => {
        params.foo = useCorrectParams ? 'bar' : 'foo';
      },
      test: async ({ fetch }) => {
        useCorrectParams = false;
        const invalidQueryRes = await fetch({ method: 'POST', body: 'foo' });
        expect(invalidQueryRes.status).toBe(400);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        expect((await invalidQueryRes.json()).message).toBe('Invalid query');
        useCorrectParams = true;

        const invalidBodyRes = await fetch({ method: 'POST', body: 'bar' });
        expect(invalidBodyRes.status).toBe(400);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        expect((await invalidBodyRes.json()).message).toBe('Invalid body');

        const invalidResponseRes = await fetch({ method: 'POST', body: 'foo' });
        expect(invalidResponseRes.status).toBe(404);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        expect((await invalidResponseRes.json()).message).toBe('Whoopsie');
      },
    });
  });

  it('should allow for custom error serialisation', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const isDoNotRetry = (meta: any): meta is { doNotRetry: boolean } =>
      typeof meta === 'object' &&
      meta !== null &&
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      typeof meta.doNotRetry === 'boolean';

    const createEndpoint = createEndpointFactory({
      serializeError: (err) => {
        if (err instanceof ResError) {
          const { message, meta } = err;
          return {
            message,
            doNotRetry: isDoNotRetry(meta) ? meta.doNotRetry : false,
          };
        } else {
          return { message: String(err), doNotRetry: false };
        }
      },
    });

    const endpoint = createEndpoint({
      methods: ({ method }) => ({
        post: method<'hi'>({
          handler: (req, res, { failWithCode }) => {
            if (req.body === 'can retry') {
              throw new Error('try again');
            }
            return failWithCode(400, "don't try again", { doNotRetry: true });
          },
        }),
      }),
    });

    await testApiHandler({
      handler: endpoint.handler,
      test: async ({ fetch }) => {
        const canRetryRes = await fetch({ method: 'POST', body: 'can retry' });
        expect(canRetryRes.status).toBe(500);
        expect(await canRetryRes.json()).toEqual({
          message: 'Error: try again',
          doNotRetry: false,
        });

        const cantRetryRes = await fetch({
          method: 'POST',
          body: "can't retry",
        });
        expect(cantRetryRes.status).toBe(400);
        expect(await cantRetryRes.json()).toEqual({
          message: "don't try again",
          doNotRetry: true,
        });
      },
    });
  });

  it('should allow passing a function to derive more information about the request, and allow passing options to the function', async () => {
    const createEndpoint = createEndpointFactory({
      extraApi: (req, { includeFoo }: { includeFoo?: boolean } = {}) => ({
        ...(includeFoo && { foo: true }),
        bar: true,
      }),
    });

    const endpoint = createEndpoint({
      methods: ({ method }) => ({
        get: method<{ hasFoo: boolean }>({
          handler: (req, res, { extra }) => ({ hasFoo: !!extra.foo }),
          extraOptions: { includeFoo: true },
        }),
        post: method<{ hasFoo: boolean }>({
          handler: (req, res, { extra }) => ({ hasFoo: !!extra.foo }),
        }),
      }),
    });

    await testApiHandler({
      handler: endpoint.handler,
      test: async ({ fetch }) => {
        const getRes = await (await fetch()).json();
        expect(getRes).toEqual({ hasFoo: true });
        const headRes = await (await fetch({ method: 'POST' })).json();
        expect(headRes).toEqual({ hasFoo: false });
      },
    });
  });

  it('should allow returning a specific symbol to indicate that the response has already been sent', async () => {
    await testApiHandler({
      handler: createEndpointFactory()({
        methods: ({ method }) => ({
          get: method<typeof nothing>({
            handler: (req, res: NextApiResponse<'foo'>) => {
              res.status(205);
              res.json('foo');
              return nothing;
            },
          }),
          post: method<typeof nothing>({
            handler: async (req, res) => {
              res.status(205);
              await pipeline('foo', res);
              return nothing;
            },
          }),
        }),
      }).handler,
      rejectOnHandlerError: true,
      test: async ({ fetch }) => {
        const getRes = await fetch();
        expect(getRes.status).toBe(205);
        expect(await getRes.json()).toBe('foo');

        const postRes = (await fetch({
          method: 'POST',
        })) as unknown as Response;
        expect(postRes.status).toBe(205);
        expect(await postRes.text()).toBe('foo');
      },
    });
  });

  it('should allow conditionally including method definitions', async () => {
    const createEndpoint = createEndpointFactory();
    const makeEndpoint = (includePatch = false) =>
      createEndpoint({
        methods: ({ method }) => ({
          get: method<'foo'>({
            handler: () => 'foo',
          }),
          patch: includePatch
            ? method<'bar'>({
                handler: () => 'bar',
              })
            : undefined,
        }),
      });

    const withoutPatch = makeEndpoint();
    const withPatch = makeEndpoint(true);

    await testApiHandler({
      handler: withoutPatch.handler,
      test: async ({ fetch }) => {
        const getRes = await fetch();
        expect(await getRes.json()).toBe('foo');
        const patchRes = await fetch({ method: 'PATCH' });
        expect(patchRes.status).toBe(405);
      },
    });

    await testApiHandler({
      handler: withPatch.handler,
      test: async ({ fetch }) => {
        const getRes = await fetch();
        expect(await getRes.json()).toBe('foo');
        const patchRes = await fetch({ method: 'PATCH' });
        expect(await patchRes.json()).toBe('bar');
      },
    });

    expect(withoutPatch.methods.patch).toBe(undefined);
    expect(withPatch.methods.patch).toBeInstanceOf(Function);
  });

  type TestCase = [
    func: () => void,
    ...toThrowArgs: Parameters<jest.Matchers<void, () => void>['toThrow']>
  ];
  it.each<TestCase>([
    [
      // @ts-expect-error invalid config
      () => createEndpointFactory(true),
      '`createEndpointFactory` configuration must be object, received boolean',
    ],
    ...(
      ['authenticate', 'extraApi', 'serializeError'] satisfies Array<
        keyof NonNullable<Parameters<typeof createEndpointFactory>[0]>
      >
    ).map<TestCase>((opt) => [
      // little confused why typescript isn't complaining here honestly
      () => createEndpointFactory({ [opt]: false }),
      `\`${opt}\` callback must be function if provided, received boolean`,
    ]),
    [
      // @ts-expect-error endpoint config is required
      () => createEndpointFactory()(),
      'configuration must be object, received undefined',
    ],
    [
      // @ts-expect-error methods needs to be a callback
      () => createEndpointFactory()({ methods: false }),
      '`methods` callback must be function, received boolean',
    ],
    [
      // @ts-expect-error methods needs to return an object
      () => createEndpointFactory()({ methods: () => false }),
      '`methods` callback must return an object, received boolean',
    ],
    [
      () =>
        createEndpointFactory()({
          methods: ({ method }) => ({
            // @ts-expect-error each method needs to be a definition or undefined
            get: false,
            // @ts-expect-error each method needs to be a definition or undefined
            put: true,
            patch: method({ handler: () => '' }),
          }),
        }),
      'returned `methods` object must have definitions (or undefined) for each key, received { get: boolean, put: boolean }',
    ],
    [
      // @ts-expect-error default needs to be a callback
      () => createEndpointFactory()({ methods: () => ({}), default: false }),
      '`default` callback must be function if provided, received boolean',
    ],
    [
      () =>
        // @ts-expect-error methods needs to return an object
        createEndpointFactory()({ methods: () => ({}), default: () => false }),
      '`default` callback must return an object, received boolean',
    ],
  ])(
    'should throw runtime errors for invalid configurations',
    (fn, ...args) => {
      expect(fn).toThrow(...args);
    }
  );

  it('should allow passing decorators, and applies from right to left', async () => {
    const withFoo: Decorator<{ caught: 'foo' }> = (handler) => (req, res) => {
      if (req.body === 'foo' || req.body === 'foobar') {
        return res.json({ caught: 'foo' });
      }
      return handler(req, res);
    };
    const withBar: Decorator<{ caught: 'bar' }> = (handler) => (req, res) => {
      if (req.body === 'bar' || req.body === 'foobar') {
        return res.json({ caught: 'bar' });
      }
      return handler(req, res);
    };

    const createEndpoint = createEndpointFactory();

    const endpoint = createEndpoint({
      methods: ({ method }) => ({
        post: method<{ caught: 'uncaught' }>({
          handler: () => ({
            caught: 'uncaught',
          }),
        }),
      }),
      decorators: [withFoo, withBar],
    });

    await testApiHandler({
      handler: endpoint.handler,
      test: async ({ fetch }) => {
        const fooRes = await fetch({ method: 'POST', body: 'foo' });
        expect(await fooRes.json()).toEqual({ caught: 'foo' });

        const barRes = await fetch({ method: 'POST', body: 'bar' });
        expect(await barRes.json()).toEqual({ caught: 'bar' });

        const foobarRes = await fetch({
          method: 'POST',
          body: 'foobar',
        });
        expect(await foobarRes.json()).toEqual({ caught: 'foo' }); // withFoo is before withBar

        const uncaughtRes = await fetch({ method: 'POST', body: 'baz' });
        expect(await uncaughtRes.json()).toEqual({ caught: 'uncaught' });
      },
    });
  });
});
