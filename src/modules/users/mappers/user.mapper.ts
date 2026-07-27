import { User } from '@prisma/client';
import { UserResponseDto } from '../dto';

export class UserMapper {
  public static toResponseDto(user: User): UserResponseDto {
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}
