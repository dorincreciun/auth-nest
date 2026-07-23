import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    const userId = request.session?.userId;

    if (!userId) {
      throw new UnauthorizedException('Sesiune invalidă sau expirată');
    }

    return true;
  }
}
