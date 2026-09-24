import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { User, UserProfile } from '@prisma/client';

import { uploadConfig } from '../../config';
import { FileService, MFile } from '../file';
import { UpdateUserProfilePayloadDto } from './dto';
import { UserWithProfile } from './types';
import { UsersRepository } from './users.repository';

/**
 * Regulile de business din jurul contului și profilului de utilizator.
 * Persistența e delegată către `UsersRepository`, iar stocarea imaginilor către `FileService`.
 */
@Injectable()
export class UsersService {
  private static readonly MESSAGES = {
    NO_AVATAR_TO_DELETE: 'There is no avatar to delete',
  } as const;

  public constructor(
    private readonly repository: UsersRepository,
    private readonly fileService: FileService,
    @Inject(uploadConfig.KEY) private readonly uploads: ConfigType<typeof uploadConfig>,
  ) {}

  public existsByEmail(email: string): Promise<boolean> {
    return this.repository.existsByEmail(email);
  }

  public findById(id: string): Promise<User | null> {
    return this.repository.findById(id);
  }

  public findByIdWithProfile(id: string): Promise<UserWithProfile | null> {
    return this.repository.findByIdWithProfile(id);
  }

  public findByEmail(email: string): Promise<User | null> {
    return this.repository.findByEmail(email);
  }

  /** Așteaptă parola deja hash-uită — hashing-ul rămâne responsabilitatea `HashService`. */
  public create(email: string, passwordHash: string): Promise<User> {
    return this.repository.create(email, passwordHash);
  }

  public changePassword(userId: string, passwordHash: string): Promise<User> {
    return this.repository.setPassword(userId, passwordHash);
  }

  public getProfile(userId: string): Promise<UserProfile | null> {
    return this.repository.findProfile(userId);
  }

  public updateProfile(userId: string, payload: UpdateUserProfilePayloadDto): Promise<UserProfile> {
    return this.repository.upsertProfile(userId, payload);
  }

  /**
   * Înlocuiește avatarul: urcă imaginea nouă, salvează URL-ul și abia apoi șterge
   * fișierul vechi, ca o eroare de upload să nu lase profilul fără avatar.
   */
  public async replaceAvatar(userId: string, file: MFile): Promise<UserProfile> {
    const previousAvatarUrl = (await this.repository.findProfile(userId))?.avatarUrl ?? null;

    const [avatarUrl] = await this.fileService.saveFiles([file], this.uploads.avatarFolder);
    const profile = await this.repository.setAvatarUrl(userId, avatarUrl);

    if (previousAvatarUrl) {
      await this.fileService.deleteFile(previousAvatarUrl);
    }

    return profile;
  }

  public async removeAvatar(userId: string): Promise<UserProfile> {
    const profile = await this.repository.findProfile(userId);

    if (!profile?.avatarUrl) {
      throw new BadRequestException(UsersService.MESSAGES.NO_AVATAR_TO_DELETE);
    }

    await this.fileService.deleteFile(profile.avatarUrl);

    return this.repository.setAvatarUrl(userId, null);
  }
}
