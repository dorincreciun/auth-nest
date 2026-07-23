import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import { RedisStore } from 'connect-redis';
import ms, { type StringValue } from 'ms';

/* Common */
import { EnvironmentInterface } from './common/interfaces';
import { TransformInterceptor } from './common/interceptors';
import { HttpExceptionFilter, PrismaExceptionFilter } from './common/exceptions';

/* Modules */
import { RedisService } from './modules/redis';
import { isProduction, parseBoolean } from './common/utils';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const config = app.get(ConfigService<EnvironmentInterface>);
  const redisService = app.get(RedisService);

  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new PrismaExceptionFilter(), new HttpExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.use(cookieParser(config.getOrThrow<string>('COOKIE_SECRET')));
  app.use(
    session({
      store: new RedisStore({
        client: redisService.getClient(),
        prefix: config.getOrThrow<string>('SESSION_FOLDER'),
      }),
      secret: config.getOrThrow<string>('SESSION_SECRET'),
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: ms(config.getOrThrow<StringValue>('SESSION_MAX_AGE')),
        domain: config.getOrThrow<string>('SESSION_DOMAIN'),
        httpOnly: parseBoolean(config.getOrThrow<string>('SESSION_HTTP_ONLY')),
        secure: isProduction(),
        sameSite: 'lax',
      },
    }),
  );

  app.enableShutdownHooks();

  const port = config.getOrThrow<number>('APP_PORT');
  const url = config.getOrThrow<string>('APP_URL');
  await app.listen(port, url);
}

void bootstrap();
