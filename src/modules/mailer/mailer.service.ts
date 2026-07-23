import { Injectable, Logger } from '@nestjs/common';
import { MailerService as NestMailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);

  constructor(private readonly nestMailer: NestMailerService) {}

  async sendVerificationEmail(to: string, token: string, expiresAt: Date): Promise<void> {
    try {
      const expiresInMinutes = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60));

      await this.nestMailer.sendMail({
        to,
        subject: 'Confirmă contul',
        template: 'verification',
        context: {
          token,
          expiresInMinutes,
        },
      });
    } catch (error) {
      this.logger.error(`Eșec trimitere email către ${to}`, error);
      throw error;
    }
  }

  async sendPasswordResetEmail(to: string, token: string): Promise<void> {
    await this.nestMailer.sendMail({
      to,
      subject: 'Resetare parolă',
      template: 'password-reset',
      context: { token },
    });
  }
}
