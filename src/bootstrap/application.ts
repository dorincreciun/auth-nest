import { Logger, VersioningType } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { RedisStore } from 'connect-redis';
import session from 'express-session';
import helmet from 'helmet';

import { AppModule } from '../app.module';
import { appConfig, securityConfig, sessionConfig } from '../config';
import { RedisService } from '../modules/redis';
import { SwaggerSetup } from './swagger.setup';

/**
 * Compune aplicația HTTP: middleware-uri, sesiuni, versionare, documentație.
 *
 * Fiecare preocupare stă într-o metodă separată, ca ordinea în care se aplică —
 * relevantă pentru middleware-uri — să fie explicită și ușor de citit.
 */
export class Application {
  private readonly logger = new Logger('Bootstrap');
  private readonly app: NestExpressApplication;

  private constructor(app: NestExpressApplication) {
    this.app = app;
  }

  public static async run(): Promise<void> {
    const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
    const application = new Application(app);

    application.configure();
    await application.listen();
  }

  /**
   * Aplică aceeași compunere și pe o instanță creată în afara `run()`.
   * Testele e2e o folosesc pentru a rula exact aplicația din producție.
   */
  public static configure(app: NestExpressApplication): void {
    new Application(app).configure();
  }

  private configure(): void {
    const config = this.app.get<ConfigType<typeof appConfig>>(appConfig.KEY);

    this.configureRouting(config);
    this.configureSecurity(config);
    this.configureSession();
    this.configureDocumentation(config);

    this.app.enableShutdownHooks();
  }

  private async listen(): Promise<void> {
    const config = this.app.get<ConfigType<typeof appConfig>>(appConfig.KEY);

    await this.app.listen(config.port, config.host);

    this.logger.log(`${config.name} rulează pe http://${config.host}:${config.port}`);
  }

  /** Toate rutele trăiesc sub `/<prefix>/v<versiune>`, ca versiunile viitoare să poată coexista. */
  private configureRouting(config: ConfigType<typeof appConfig>): void {
    if (config.globalPrefix) {
      this.app.setGlobalPrefix(config.globalPrefix);
    }

    this.app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: config.apiVersion,
    });
  }

  private configureSecurity(config: ConfigType<typeof appConfig>): void {
    if (config.trustProxy) {
      // Necesar în spatele unui reverse proxy, ca IP-ul clientului și cookie-urile
      // `secure` să fie determinate din `X-Forwarded-*`.
      this.app.set('trust proxy', 1);
    }

    this.app.use(
      helmet({
        // Swagger UI încarcă scripturi inline, incompatibile cu CSP-ul implicit.
        contentSecurityPolicy: config.swaggerEnabled ? false : undefined,
      }),
    );
    this.app.use(compression());

    this.app.enableCors({
      origin: config.corsOrigins,
      credentials: true,
    });
  }

  /** Sesiuni semnate, stocate în Redis, ca restarturile procesului să nu deconecteze pe nimeni. */
  private configureSession(): void {
    const security = this.app.get<ConfigType<typeof securityConfig>>(securityConfig.KEY);
    const sessions = this.app.get<ConfigType<typeof sessionConfig>>(sessionConfig.KEY);
    const redisService = this.app.get(RedisService);

    this.app.use(cookieParser(security.cookieSecret));
    this.app.use(
      session({
        store: new RedisStore({
          client: redisService.getClient(),
          prefix: sessions.keyPrefix,
        }),
        name: sessions.cookieName,
        secret: sessions.secret,
        resave: false,
        saveUninitialized: false,
        cookie: {
          maxAge: sessions.maxAgeMs,
          domain: sessions.cookieDomain,
          httpOnly: true,
          secure: sessions.secure,
          sameSite: sessions.sameSite,
        },
      }),
    );
  }

  private configureDocumentation(config: ConfigType<typeof appConfig>): void {
    if (!config.swaggerEnabled) {
      return;
    }

    const sessions = this.app.get<ConfigType<typeof sessionConfig>>(sessionConfig.KEY);

    new SwaggerSetup(this.app, config, sessions).apply();

    this.logger.log(`Documentația API: /${SwaggerSetup.DOCS_PATH}`);
  }
}
