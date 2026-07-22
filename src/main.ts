import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';

/* Common */
import { EnvironmentInterface } from './common/interfaces';
import { TransformInterceptor } from './common/interceptors';
import { HttpExceptionFilter, PrismaExceptionFilter } from './common/exceptions';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const config = app.get(ConfigService<EnvironmentInterface>);

  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new PrismaExceptionFilter(), new HttpExceptionFilter());
  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  const port = config.getOrThrow<number>('APP_PORT');
  const url = config.getOrThrow<string>('APP_URL');
  await app.listen(port, url);
}

void bootstrap();
