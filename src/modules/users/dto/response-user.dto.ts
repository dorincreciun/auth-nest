import { OmitType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';

export class ResponseUserDto extends OmitType(CreateUserDto, ['password'] as const) {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}
