import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { User } from '@prisma/client';
import type { Request } from 'express';

import { UsersService } from '../../modules/users/users.service';
import { DeviceData } from '../types/express-session';
import { AuthGuard } from './auth.guard';

const SIX_MINUTES_MS = 6 * 60 * 1000;

function buildUser(): User {
  return {
    id: 'user-1',
    email: 'test@example.com',
    password: '$2b$10$hash',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function buildDeviceData(lastActiveAt: string): DeviceData {
  return {
    ip: '10.0.0.5',
    browser: 'Chrome',
    browserVersion: '141',
    os: 'Linux',
    platform: 'Desktop',
    isMobile: false,
    isDesktop: true,
    loggedAt: lastActiveAt,
    lastActiveAt,
  };
}

function buildContext(request: Partial<Request>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('AuthGuard', () => {
  let usersService: jest.Mocked<Pick<UsersService, 'findById'>>;
  let guard: AuthGuard;

  beforeEach(() => {
    usersService = { findById: jest.fn().mockResolvedValue(buildUser()) };
    guard = new AuthGuard(usersService as unknown as UsersService);
  });

  it('respinge cererile fără sesiune', async () => {
    const context = buildContext({ session: {} as Request['session'] });

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    expect(usersService.findById).not.toHaveBeenCalled();
  });

  it('respinge sesiunile ale căror utilizatori nu mai există', async () => {
    usersService.findById.mockResolvedValue(null);
    const context = buildContext({ session: { userId: 'user-1' } as Request['session'] });

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('atașează utilizatorul încărcat din baza de date', async () => {
    const request = { session: { userId: 'user-1' } } as unknown as Request;

    await expect(guard.canActivate(buildContext(request))).resolves.toBe(true);
    expect(request.user).toEqual(expect.objectContaining({ id: 'user-1' }));
  });

  it('reîmprospătează ultima activitate când e învechită', async () => {
    const stale = new Date(Date.now() - SIX_MINUTES_MS).toISOString();
    const request = {
      session: { userId: 'user-1', deviceData: buildDeviceData(stale) },
    } as unknown as Request;

    await guard.canActivate(buildContext(request));

    expect(request.session.deviceData?.lastActiveAt).not.toBe(stale);
  });

  it('nu rescrie ultima activitate la fiecare cerere', async () => {
    const recent = new Date().toISOString();
    const request = {
      session: { userId: 'user-1', deviceData: buildDeviceData(recent) },
    } as unknown as Request;

    await guard.canActivate(buildContext(request));

    expect(request.session.deviceData?.lastActiveAt).toBe(recent);
  });
});
