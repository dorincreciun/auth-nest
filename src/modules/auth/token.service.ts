import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma';
import { TokenType, VerificationToken } from '@prisma/client';
import ms, { StringValue } from 'ms';
import { randomInt } from 'node:crypto';

@Injectable()
export class TokenService {
  public constructor(private readonly prismaService: PrismaService) {}

  private generateVerificationCode(): string {
    return randomInt(100000, 1000000).toString();
  }

  public async createToken(
    userId: string,
    type: TokenType,
    expiresIn: StringValue = '5m',
  ): Promise<VerificationToken> {
    const existingToken = await this.prismaService.verificationToken.findUnique({
      where: {
        userId_type: {
          userId,
          type,
        },
      },
    });

    if (existingToken && existingToken.expiresAt > new Date()) {
      throw new BadRequestException(
        'Un cod de verificare a fost deja trimis și este încă valabil. Te rugăm să aștepți înainte de a solicita altul.',
      );
    }

    const token = this.generateVerificationCode();
    const durationMs = ms(expiresIn);
    const expiresAt = new Date(Date.now() + durationMs);

    return await this.prismaService.verificationToken.upsert({
      where: {
        userId_type: {
          userId,
          type,
        },
      },
      update: {
        token,
        expiresAt,
      },
      create: {
        userId,
        token,
        type,
        expiresAt,
      },
    });
  }

  public async verifyToken(userId: string, token: string, type: TokenType): Promise<boolean> {
    const existingToken = await this.prismaService.verificationToken.findUnique({
      where: {
        userId_type: {
          userId,
          type,
        },
      },
    });

    if (!existingToken || existingToken.token !== token) {
      throw new BadRequestException('Codul de verificare este invalid.');
    }

    const isExpired = new Date() > existingToken.expiresAt;
    if (isExpired) {
      await this.deleteToken(userId, type);
      throw new BadRequestException('Codul de verificare a expirat.');
    }

    await this.deleteToken(userId, type);

    return true;
  }

  private async deleteToken(userId: string, type: TokenType) {
    return this.prismaService.verificationToken.delete({
      where: {
        userId_type: {
          userId,
          type,
        },
      },
    });
  }
}
