import { Injectable } from '@nestjs/common';
import { User, UserProfile } from '@prisma/client';
import { PrismaService } from '../prisma';
import { CreateUserPayloadDto, UpdateUserProfileDto } from './dto';
import { UpdateUser } from './types';

@Injectable()
export class UsersService {
  public constructor(private readonly prismaService: PrismaService) {}

  public async exists(email: string): Promise<boolean> {
    try {
      const user = await this.prismaService.user.findUnique({
        where: { email },
        select: { id: true },
      });
      return !!user;
    } catch (error) {
      console.error('PRISMA ERROR:', error);
      throw error;
    }
  }

  public async findById(id: string): Promise<User | null> {
    return this.prismaService.user.findUnique({
      where: { id },
    });
  }

  public async findByEmail(email: string): Promise<User | null> {
    return this.prismaService.user.findUnique({
      where: { email },
    });
  }

  public async create(dto: CreateUserPayloadDto): Promise<User> {
    return this.prismaService.user.create({
      data: {
        email: dto.email,
        password: dto.password,
        profile: {
          create: {},
        },
      },
    });
  }

  public async update(id: string, data: UpdateUser): Promise<User> {
    return this.prismaService.user.update({
      where: { id },
      data,
    });
  }

  public async getProfile(userId: string): Promise<UserProfile | null> {
    return this.prismaService.userProfile.findUnique({
      where: { userId },
    });
  }

  public async updateProfile(userId: string, data: UpdateUserProfileDto): Promise<UserProfile> {
    return this.prismaService.userProfile.update({
      where: { userId },
      data,
    });
  }
}
