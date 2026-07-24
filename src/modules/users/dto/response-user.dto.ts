import { OmitType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';
import { ApiProperty } from '@nestjs/swagger';

export class ResponseUserDto extends OmitType(CreateUserDto, ['password'] as const) {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Identificatorul unic al utilizatorului (UUID)',
    type: String,
  })
  id: string;

  @ApiProperty({
    example: '2026-07-24T12:00:00.000Z',
    description: 'Data și ora la care a fost creat contul',
    type: Date,
  })
  createdAt: Date;

  @ApiProperty({
    example: '2026-07-24T12:30:00.000Z',
    description: 'Data și ora ultimei actualizări a contului',
    type: Date,
  })
  updatedAt: Date;
}
