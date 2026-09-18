import { Module, ValidationPipe } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ConfigModule, ConfigType } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { HttpExceptionFilter, PrismaExceptionFilter } from './common/exceptions';
import { validationExceptionFactory } from './common/factories';
import { TransformInterceptor } from './common/interceptors';
import { configurations, throttleConfig, validateEnvironment } from './config';
import { AuthModule } from './modules/auth';
import { CloudinaryModule } from './modules/cloudinary';
import { FileModule } from './modules/file';
import { HashModule } from './modules/hash';
import { HealthModule } from './modules/health';
import { MailerModule } from './modules/mailer';
import { PrismaModule } from './modules/prisma';
import { RedisModule } from './modules/redis';
import { SessionModule } from './modules/session';
import { UsersModule } from './modules/users';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      expandVariables: true,
      load: [...configurations],
      validate: validateEnvironment,
    }),
    ThrottlerModule.forRootAsync({
      inject: [throttleConfig.KEY],
      useFactory: (throttle: ConfigType<typeof throttleConfig>) => ({
        throttlers: [
          { name: 'short', ttl: throttle.short.ttlMs, limit: throttle.short.limit },
          { name: 'medium', ttl: throttle.medium.ttlMs, limit: throttle.medium.limit },
          { name: 'long', ttl: throttle.long.ttlMs, limit: throttle.long.limit },
        ],
      }),
    }),
    PrismaModule,
    RedisModule,
    HashModule,
    MailerModule,
    CloudinaryModule,
    FileModule,
    UsersModule,
    SessionModule,
    AuthModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
        exceptionFactory: validationExceptionFactory,
      }),
    },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    /** Ordinea contează: filtrul înregistrat ultimul are prioritate la potrivire. */
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_FILTER, useClass: PrismaExceptionFilter },
  ],
})
export class AppModule {}
