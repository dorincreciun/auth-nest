import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';

import { UsersService } from '../../modules/users/users.service';

/**
 * Lasă request-ul să treacă doar dacă există o sesiune validă, apoi atașează
 * utilizatorul încărcat din baza de date pe `request.user`.
 *
 * Citirea userului la fiecare request e intenționată: astfel schimbările de cont
 * (email confirmat, cont șters) au efect imediat, fără a aștepta expirarea sesiunii.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  /** Cât de rar rescriem `lastActiveAt`, ca să nu generăm un write Redis per request. */
  private static readonly ACTIVITY_REFRESH_MS = 5 * 60 * 1000;

  private static readonly MESSAGES = {
    INVALID_SESSION: 'Invalid or expired session',
    USER_NOT_FOUND: 'User was not found',
  } as const;

  public constructor(private readonly usersService: UsersService) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const { userId } = request.session;

    if (!userId) {
      throw new UnauthorizedException(AuthGuard.MESSAGES.INVALID_SESSION);
    }

    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new UnauthorizedException(AuthGuard.MESSAGES.USER_NOT_FOUND);
    }

    request.user = user;
    this.refreshActivity(request);

    return true;
  }

  /**
   * Actualizează ultima activitate a sesiunii.
   * `express-session` persistă modificarea la finalul request-ului, așa că
   * scrierea e limitată la un interval, nu la fiecare cerere.
   */
  private refreshActivity(request: Request): void {
    const { deviceData } = request.session;

    if (!deviceData) {
      return;
    }

    const lastActiveAt = new Date(deviceData.lastActiveAt).getTime();
    const isStale =
      Number.isNaN(lastActiveAt) || Date.now() - lastActiveAt >= AuthGuard.ACTIVITY_REFRESH_MS;

    if (isStale) {
      deviceData.lastActiveAt = new Date().toISOString();
    }
  }
}
