import { Module } from '@nestjs/common';

/* Modules */
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './modules/prisma';
import { HashModule } from './modules/hash';
import { UsersModule } from './modules/users';
import { AuthModule } from './modules/auth';
import { RedisModule } from './modules/redis';
import { SessionModule } from './modules/session';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      expandVariables: true,
    }),
    PrismaModule,
    HashModule,
    UsersModule,
    AuthModule,
    RedisModule,
    SessionModule,
  ],
})
export class AppModule {}
