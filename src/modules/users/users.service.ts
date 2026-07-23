import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma';
import { User } from '@prisma/client';
import { CreateUserDto } from './dto';
import { HashService } from '../hash';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  public constructor(
    private readonly prismaService: PrismaService,
    private readonly hashService: HashService,
  ) {}

  public async exists(email: string): Promise<boolean> {
    const user = await this.prismaService.user.findUnique({
      where: { email },
      select: { id: true },
    });

    return !!user;
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

  public async create(dto: CreateUserDto): Promise<User> {
    const passwordHash = await this.hashService.hash(dto.password);
    return this.prismaService.user.create({
      data: {
        email: dto.email,
        password: passwordHash,
        firstName: null,
        lastName: null,
      },
    });
  }

  public async update(id: string, dto: UpdateUserDto): Promise<User> {
    const data = { ...dto };

    if (dto.password) {
      data.password = await this.hashService.hash(dto.password);
    }

    return this.prismaService.user.update({
      where: { id },
      data,
    });
  }
}
