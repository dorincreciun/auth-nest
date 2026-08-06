import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { UsersService } from '../../modules/users/users.service';

@Injectable()
export class AuthGuard implements CanActivate {
  private static readonly MESSAGES = {
    INVALID_SESSION: 'Sesiune invalidă sau expirată',
    USER_NOT_FOUND: 'Utilizatorul nu a fost găsit',
  } as const;

  public constructor(private readonly usersService: UsersService) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    if (typeof request.session.userId === 'undefined') {
      throw new UnauthorizedException(AuthGuard.MESSAGES.INVALID_SESSION);
    }

    const user = await this.usersService.findById(request.session.userId);

    if (!user) {
      throw new UnauthorizedException(AuthGuard.MESSAGES.USER_NOT_FOUND);
    }

    request.user = user;

    return true;
  }
}
