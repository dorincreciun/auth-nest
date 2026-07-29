import { User } from '@prisma/client';
import { UserDto } from '../dto';

/**
 * Mapează entitatea Prisma `User` în DTO-ul public expus clientului.
 */
export class UserMapper {
  /** Elimină câmpurile sensibile (parola) și întoarce forma publică a userului. */
  public static toDto(user: User): UserDto {
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}
