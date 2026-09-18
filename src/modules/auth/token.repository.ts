import { Injectable } from '@nestjs/common';
import { TokenType, VerificationToken } from '@prisma/client';

import { PrismaService } from '../prisma';

/** Persistența codurilor de verificare. Un utilizator are cel mult un token activ per tip. */
@Injectable()
export class TokenRepository {
  public constructor(private readonly prisma: PrismaService) {}

  public findActive(userId: string, type: TokenType): Promise<VerificationToken | null> {
    return this.prisma.verificationToken.findUnique({
      where: { userId_type: { userId, type } },
    });
  }

  /** Suprascrie tokenul existent, resetând contorul de încercări. */
  public save(
    userId: string,
    type: TokenType,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<VerificationToken> {
    return this.prisma.verificationToken.upsert({
      where: { userId_type: { userId, type } },
      create: { userId, type, token: tokenHash, expiresAt },
      update: { token: tokenHash, expiresAt, attempts: 0 },
    });
  }

  public incrementAttempts(userId: string, type: TokenType): Promise<VerificationToken> {
    return this.prisma.verificationToken.update({
      where: { userId_type: { userId, type } },
      data: { attempts: { increment: 1 } },
    });
  }

  public async delete(userId: string, type: TokenType): Promise<void> {
    await this.prisma.verificationToken.delete({
      where: { userId_type: { userId, type } },
    });
  }
}
