import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import { RedisStore } from 'connect-redis';
import ms, { type StringValue } from 'ms';

import { AppModule } from './app.module';

/* Common */
import { EnvironmentInterface } from './common/interfaces';
import { TransformInterceptor } from './common/interceptors';
import { HttpExceptionFilter, PrismaExceptionFilter } from './common/exceptions';
import { isDevelopment, isProduction } from './common/utils';

/* Modules */
import { RedisService } from './modules/redis';

/* Bootstrap setup files */
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { SWAGGER_SESSION_AUTH } from './common/swagger';
import { validationExceptionFactory } from './common/factories';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const config = app.get(ConfigService<EnvironmentInterface>);
  const redisService = app.get(RedisService);

  const port = config.getOrThrow<number>('APP_PORT');
  const url = config.getOrThrow<string>('APP_URL');

  // Global request/response pipeline
  app.enableCors({
    origin: config.getOrThrow<string>('CORS_ORIGIN'),
    credentials: true,
  });
  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter(), new PrismaExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      exceptionFactory: validationExceptionFactory,
    }),
  );

  // Cookies + session (Redis-backed store)
  app.use(cookieParser(config.getOrThrow<string>('COOKIE_SECRET')));
  app.use(
    session({
      store: new RedisStore({
        client: redisService.getClient(),
        prefix: config.getOrThrow<string>('SESSION_FOLDER'),
      }),
      name: config.getOrThrow<string>('SESSION_NAME'),
      secret: config.getOrThrow<string>('SESSION_SECRET'),
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: ms(config.getOrThrow<StringValue>('SESSION_MAX_AGE')),
        domain: config.getOrThrow<string>('SESSION_DOMAIN'),
        httpOnly: true,
        secure: isProduction(),
        sameSite: 'lax',
      },
    }),
  );

  // API documentation (dev only)
  if (isDevelopment()) {
    const appName = config.getOrThrow<string>('APP_NAME');
    const sessionName = config.getOrThrow<string>('SESSION_NAME');
    const jsonSchemaUrl = `http://localhost:${port}/swagger/json`;

    const openApiConfig = new DocumentBuilder()
      .setTitle(appName)
      .setDescription(
        `API documentation for ${appName}.\n\n` +
          `📄 [Download OpenAPI JSON schema](${jsonSchemaUrl})`,
      )
      .setVersion('1.0.0')
      .addCookieAuth(SWAGGER_SESSION_AUTH, {
        type: 'apiKey',
        in: 'cookie',
        name: sessionName,
        description: 'Session cookie set by express-session after login',
      })
      .addServer(`http://localhost:${port}`, 'Local development')
      .setContact('Dorin', 'https://github.com/your-username', 'your@email.com')
      .setLicense('MIT', 'https://opensource.org/licenses/MIT')
      .build();

    const documentFactory = () => SwaggerModule.createDocument(app, openApiConfig);

    SwaggerModule.setup('docs', app, documentFactory, {
      jsonDocumentUrl: 'swagger/json',
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
  }

  app.enableShutdownHooks();

  await app.listen(port, url);
}

void bootstrap();
