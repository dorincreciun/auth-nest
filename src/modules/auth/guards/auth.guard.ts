import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { UsersService } from '../../users';

@Injectable()
export class AuthGuard implements CanActivate {
  public constructor(private readonly usersService: UsersService) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    if (typeof request.session.userId === 'undefined') {
      throw new UnauthorizedException('Sesiune invalidă sau expirată');
    }

    const user = await this.usersService.findById(request.session.userId);

    if (!user) {
      throw new UnauthorizedException('Utilizatorul nu a fost găsit');
    }

    request.user = user;

    return true;
  }
}
