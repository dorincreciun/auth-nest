import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from '../prisma';
import { CreateUserRequestDto } from './dto';
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

  public async create(dto: CreateUserRequestDto): Promise<User> {
    return this.prismaService.user.create({
      data: {
        email: dto.email,
        password: dto.password,
        firstName: null,
        lastName: null,
      },
    });
  }

  public async update(id: string, data: UpdateUser): Promise<User> {
    return this.prismaService.user.update({
      where: { id },
      data,
    });
  }
}
