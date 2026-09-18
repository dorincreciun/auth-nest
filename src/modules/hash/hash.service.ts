import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

import { securityConfig } from '../../config';

/**
 * Hashing de parole cu bcrypt.
 *
 * Expune și un „hash-fantomă”, folosit la login când emailul nu există: comparăm
 * parola cu el ca durata răspunsului să nu dezvăluie dacă adresa e înregistrată.
 */
@Injectable()
export class HashService implements OnModuleInit {
  private static readonly DUMMY_PLAINTEXT = '__timing_dummy__';

  private dummyHash = '';

  public constructor(
    @Inject(securityConfig.KEY) private readonly config: ConfigType<typeof securityConfig>,
  ) {}

  public async onModuleInit(): Promise<void> {
    this.dummyHash = await this.hash(HashService.DUMMY_PLAINTEXT);
  }

  public hash(plaintext: string): Promise<string> {
    return bcrypt.hash(plaintext, this.config.bcryptSaltRounds);
  }

  public compare(plaintext: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plaintext, hash);
  }

  public getDummyHash(): string {
    return this.dummyHash;
  }
}
