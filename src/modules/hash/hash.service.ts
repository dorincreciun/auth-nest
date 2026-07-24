import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { EnvironmentInterface } from '../../common/interfaces';

@Injectable()
export class HashService implements OnModuleInit {
  private dummyHash!: string;

  public constructor(private readonly configService: ConfigService<EnvironmentInterface>) {}

  public async onModuleInit(): Promise<void> {
    this.dummyHash = await this.hash('__timing_dummy__');
  }

  public async hash(data: string): Promise<string> {
    const saltRounds = Number(this.configService.getOrThrow<number>('BCRYPT_SALT'));
    return await bcrypt.hash(data, saltRounds);
  }

  public async compare(data: string, encrypted: string): Promise<boolean> {
    return await bcrypt.compare(data, encrypted);
  }

  public getDummyHash(): string {
    return this.dummyHash;
  }
}
