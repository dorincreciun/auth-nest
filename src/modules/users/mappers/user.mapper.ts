import { User } from '@prisma/client';
import { ResponseUserDto } from '../dto';

export class UserMapper {
  public static toResponseDto(user: User): ResponseUserDto {
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}
