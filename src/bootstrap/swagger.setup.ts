import { ConfigType } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { SWAGGER_SESSION_AUTH } from '../common/swagger';
import { appConfig, sessionConfig } from '../config';

/** Montează documentația OpenAPI, inclusiv schema de autentificare pe cookie de sesiune. */
export class SwaggerSetup {
  public static readonly DOCS_PATH = 'docs';
  public static readonly JSON_PATH = 'swagger/json';

  public constructor(
    private readonly app: NestExpressApplication,
    private readonly config: ConfigType<typeof appConfig>,
    private readonly sessions: ConfigType<typeof sessionConfig>,
  ) {}

  public apply(): void {
    SwaggerModule.setup(SwaggerSetup.DOCS_PATH, this.app, () => this.buildDocument(), {
      jsonDocumentUrl: SwaggerSetup.JSON_PATH,
      swaggerOptions: { persistAuthorization: true },
    });
  }

  private buildDocument() {
    return SwaggerModule.createDocument(this.app, this.buildOptions());
  }

  private buildOptions() {
    const { name, port, apiVersion } = this.config;

    return new DocumentBuilder()
      .setTitle(name)
      .setDescription(
        `Documentația API pentru ${name}.\n\n` +
          `Autentificarea se face pe cookie de sesiune: apelează \`POST /auth/login\`, ` +
          `iar cookie-ul \`${this.sessions.cookieName}\` este trimis automat de browser.\n\n` +
          `📄 [Descarcă schema OpenAPI](/${SwaggerSetup.JSON_PATH})`,
      )
      .setVersion(apiVersion)
      .addCookieAuth(SWAGGER_SESSION_AUTH, {
        type: 'apiKey',
        in: 'cookie',
        name: this.sessions.cookieName,
        description: 'Cookie-ul de sesiune setat de express-session după autentificare',
      })
      .addServer(`http://localhost:${port}`, 'Local development')
      .setLicense('MIT', 'https://opensource.org/licenses/MIT')
      .build();
  }
}
