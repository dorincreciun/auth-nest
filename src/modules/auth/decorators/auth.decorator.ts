import { applyDecorators, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../guards';

export function Auth() {
  return applyDecorators(UseGuards(AuthGuard));
}
