import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import ms, { StringValue } from 'ms';

/* Modules */
import { PrismaModule } from './modules/prisma';
import { HashModule } from './modules/hash';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { RedisModule } from './modules/redis';
import { SessionModule } from './modules/session';
import { MailerModule } from './modules/mailer';
import { CloudinaryModule } from './modules/cloudinary';
import { FileModule } from './modules/file';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      expandVariables: true,
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          name: 'short',
          ttl: ms(config.getOrThrow<StringValue>('THROTTLE_SHORT_TTL')),
          limit: Number(config.getOrThrow<number>('THROTTLE_SHORT_LIMIT')),
        },
        {
          name: 'medium',
          ttl: ms(config.getOrThrow<StringValue>('THROTTLE_MEDIUM_TTL')),
          limit: Number(config.getOrThrow<number>('THROTTLE_MEDIUM_LIMIT')),
        },
        {
          name: 'long',
          ttl: ms(config.getOrThrow<StringValue>('THROTTLE_LONG_TTL')),
          limit: Number(config.getOrThrow<number>('THROTTLE_LONG_LIMIT')),
        },
      ],
    }),
    PrismaModule,
    HashModule,
    FileModule,
    CloudinaryModule,
    UsersModule,
    AuthModule,
    RedisModule,
    SessionModule,
    MailerModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
  controllers: [AppController],
})
export class AppModule {}
