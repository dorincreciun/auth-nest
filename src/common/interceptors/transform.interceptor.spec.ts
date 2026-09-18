import { CallHandler, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { firstValueFrom, of } from 'rxjs';

import { SuccessResponse } from '../interfaces';
import { TransformInterceptor } from './transform.interceptor';

function buildContext(): ExecutionContext {
  return {
    getHandler: () => () => undefined,
    getClass: () => class {},
    switchToHttp: () => ({
      getRequest: () => ({ url: '/api/v1/auth/login' }),
      getResponse: () => ({ statusCode: 200 }),
    }),
  } as unknown as ExecutionContext;
}

const next: CallHandler = { handle: () => of({ user: { id: 'user-1' } }) };

describe('TransformInterceptor', () => {
  let reflector: jest.Mocked<Pick<Reflector, 'getAllAndOverride'>>;
  let interceptor: TransformInterceptor<unknown>;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn().mockReturnValue(false) };
    interceptor = new TransformInterceptor(reflector as unknown as Reflector);
  });

  it('înfășoară răspunsul în envelope-ul standard', async () => {
    const result = (await firstValueFrom(
      interceptor.intercept(buildContext(), next),
    )) as SuccessResponse<unknown>;

    expect(result).toEqual({
      success: true,
      statusCode: 200,
      meta: { path: '/api/v1/auth/login', timestamp: expect.any(String) },
      data: { user: { id: 'user-1' } },
    });
  });

  it('lasă neatinse handler-ele marcate cu @SkipResponseTransform', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);

    await expect(firstValueFrom(interceptor.intercept(buildContext(), next))).resolves.toEqual({
      user: { id: 'user-1' },
    });
  });
});
