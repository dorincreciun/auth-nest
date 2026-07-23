import { Module } from '@nestjs/common';
import { MailerService } from './mailer.service';
import { MailerModule as NestMailerModule } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { EnvironmentInterface } from '../../common/interfaces';
import { parseBoolean } from '../../common/utils';
import { join } from 'path';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/adapters/handlebars.adapter';

@Module({
  imports: [
    NestMailerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvironmentInterface>) => ({
        transport: {
          host: config.getOrThrow<string>('MAIL_HOST'),
          port: config.getOrThrow<number>('MAIL_PORT'),
          secure: parseBoolean(config.getOrThrow<string>('MAIL_SECURE')),
          auth: {
            user: config.getOrThrow<string>('MAIL_USER'),
            pass: config.getOrThrow<string>('MAIL_PASSWORD'),
          },
        },
        defaults: {
          from: config.getOrThrow<string>('MAIL_FROM'),
        },
        template: {
          dir: join(__dirname, 'templates'),
          adapter: new HandlebarsAdapter(),
          options: { strict: true },
        },
      }),
    }),
  ],
  providers: [MailerService],
  exports: [MailerService],
})
export class MailerModule {}
