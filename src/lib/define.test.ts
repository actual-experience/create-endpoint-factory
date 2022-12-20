import stream from 'stream';
import { promisify } from 'util';
import type { NextApiResponse } from 'next';
import { testApiHandler } from 'next-test-api-route-handler';
import { nothing, ResError, createEndpointFactory } from '..';
import type { GenericsFromHandler } from './types';
import { id, satisfies } from './utils/types';

const pipeline = promisify(stream.pipeline);

describe('createEndpointFactory', () => {
  it('should correctly handle each method', async () => {
    const createEndpoint = createEndpointFactory();

    const endpoint = createEndpoint({
      methods: (build) => ({
        get: build.method<'foo', any, { foo: 'bar' }>({
          handler: () => Promise.resolve('foo'),
        }),
        post: build.method<'bar', 'baz', { foo: 'bar' }>({
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
      params: satisfies<
        GenericsFromHandler<typeof endpoint.handler>['query']
      >()({
        foo: 'bar',
      }),
      test: async ({ fetch }) => {
        const getRes = await fetch();
        expect(getRes.status).toBe(200);
        expect(await getRes.json()).toBe<
          GenericsFromHandler<typeof endpoint.methods.get>['return']
        >('foo');

        const postRes = await fetch({
          method: 'POST',
          body: id<GenericsFromHandler<typeof endpoint.methods.post>['body']>(
            'baz'
          ),
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

  it('should return correct Allow header for unsupported methods', async () => {
    const createEndpoint = createEndpointFactory();

    const endpoint = createEndpoint({
      methods: (build) => ({
        get: build.method({
          // eslint-disable-next-line @typescript-eslint/no-empty-function
          handler: () => {},
        }),
        put: build.method({
          // eslint-disable-next-line @typescript-eslint/no-empty-function
          handler: () => {},
        }),
      }),
    });

    await testApiHandler({
      handler: endpoint.handler,
      test: async ({ fetch }) => {
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
      methods: (build) => ({
        get: build.method<AuthStatus.Authorized>({
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
      methods: (build) => ({
        get: build.method<AuthStatus.Unauthenticated>({
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

  it('should allow for validation of query/body/response using type guards or invariants', async () => {
    const createEndpoint = createEndpointFactory();

    const endpoint = createEndpoint({
      methods: (build) => ({
        post: build.method({
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
      methods: (build) => ({
        post: build.method<'hi'>({
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
      methods: (build) => ({
        get: build.method<{ hasFoo: boolean }>({
          handler: (req, res, { extra }) => ({ hasFoo: !!extra.foo }),
          extraOptions: { includeFoo: true },
        }),
        post: build.method<{ hasFoo: boolean }>({
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
        methods: (build) => ({
          get: build.method<typeof nothing>({
            handler: (req, res: NextApiResponse<'foo'>) => {
              res.status(205);
              res.json('foo');
              return nothing;
            },
          }),
          post: build.method<typeof nothing>({
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
        methods: (build) => ({
          get: build.method<'foo'>({
            handler: () => 'foo',
          }),
          patch: includePatch
            ? build.method<'bar'>({
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
});
