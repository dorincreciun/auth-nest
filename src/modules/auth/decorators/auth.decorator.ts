import { applyDecorators, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../../common/guards';

export function Auth() {
  return applyDecorators(UseGuards(AuthGuard));
}
