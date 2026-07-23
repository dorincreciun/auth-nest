import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { EnvironmentInterface } from '../../common/interfaces';

@Injectable()
export class HashService {
  public constructor(private readonly configService: ConfigService<EnvironmentInterface>) {}

  public async hash(data: string): Promise<string> {
    const saltRounds = Number(this.configService.getOrThrow<number>('SALT_ROUNDS'));
    return await bcrypt.hash(data, saltRounds);
  }

  public async compare(data: string, encrypted: string): Promise<boolean> {
    return await bcrypt.compare(data, encrypted);
  }
}
