import { User, UserProfile } from '@prisma/client';
import { UserDto, UserProfileDto } from '../dto';
import { UserWithProfile } from '../types/user-with-profile';

/**
 * Mapează entitatea Prisma `User` / `UserProfile` în DTO-urile publice.
 */
export class UserMapper {
  /** User fără relația profile încărcată → `profile: null`. */
  public static toDto(user: User): UserDto {
    return {
      id: user.id,
      email: user.email,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      profile: null,
    };
  }

  /** User cu `include: { profile: true }` → mapează și profilul public. */
  public static toDtoWithProfile(user: UserWithProfile): UserDto {
    return {
      ...this.toDto(user),
      profile: user.profile ? this.toProfileDto(user.profile) : null,
    };
  }

  /** Profil public (fără id / userId / timestamps interne). */
  public static toProfileDto(profile: UserProfile): UserProfileDto {
    return {
      firstName: profile.firstName,
      lastName: profile.lastName,
      avatarUrl: profile.avatarUrl,
      location: profile.location,
      jobTitle: profile.jobTitle,
      bio: profile.bio,
    };
  }
}
