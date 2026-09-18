import { Injectable } from '@nestjs/common';
import { User, UserProfile } from '@prisma/client';

import { PrismaService } from '../prisma';
import { UpdateUserProfilePayloadDto } from './dto';
import { UserWithProfile } from './types';

/**
 * Singurul loc care vorbește cu Prisma pentru agregatul `User`.
 *
 * Izolarea persistenței aici ține `UsersService` axat pe reguli de business și
 * face testele unitare posibile fără o bază de date reală.
 */
@Injectable()
export class UsersRepository {
  public constructor(private readonly prisma: PrismaService) {}

  public async existsByEmail(email: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    return user !== null;
  }

  public findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  public findByIdWithProfile(id: string): Promise<UserWithProfile | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: { profile: true },
    });
  }

  public findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  /** Creează contul împreună cu profilul gol asociat, într-o singură tranzacție Prisma. */
  public create(email: string, passwordHash: string): Promise<User> {
    return this.prisma.user.create({
      data: {
        email,
        password: passwordHash,
        profile: { create: {} },
      },
    });
  }

  public setVerified(id: string, isVerified: boolean): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: { isVerified },
    });
  }

  public setPassword(id: string, passwordHash: string): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: { password: passwordHash },
    });
  }

  public findProfile(userId: string): Promise<UserProfile | null> {
    return this.prisma.userProfile.findUnique({ where: { userId } });
  }

  /** `upsert` acoperă conturile mai vechi, create înainte de tabelul de profiluri. */
  public upsertProfile(userId: string, data: UpdateUserProfilePayloadDto): Promise<UserProfile> {
    return this.prisma.userProfile.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
  }

  public setAvatarUrl(userId: string, avatarUrl: string | null): Promise<UserProfile> {
    return this.prisma.userProfile.upsert({
      where: { userId },
      create: { userId, avatarUrl },
      update: { avatarUrl },
    });
  }
}
