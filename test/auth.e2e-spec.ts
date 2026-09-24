import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { Application } from '../src/bootstrap';
import { PrismaService } from '../src/modules/prisma';

/**
 * Test end-to-end pe aplicația reală (aceeași compunere ca în producție).
 *
 * Necesită PostgreSQL și Redis pornite și migrările aplicate:
 *   docker compose up -d postgres redis && npm run prisma:deploy && npm run test:e2e
 */
describe('Autentificare (e2e)', () => {
  const credentials = {
    email: `e2e-${Date.now()}@example.com`,
    password: 'Parola123!',
  };

  const route = (path: string) => `/api/v1${path}`;

  let app: NestExpressApplication;
  let prisma: PrismaService;
  let sessionCookie: string[];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();

    app = moduleRef.createNestApplication<NestExpressApplication>();
    Application.configure(app);
    await app.init();

    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: credentials.email } });
    await app.close();
  });

  it('raportează dependențele ca disponibile', async () => {
    const response = await request(app.getHttpServer()).get(route('/health')).expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        status: 'ok',
        details: expect.objectContaining({
          database: expect.objectContaining({ status: 'up' }),
          redis: expect.objectContaining({ status: 'up' }),
        }),
      }),
    );
  });

  it('creează contul și pornește o sesiune', async () => {
    const response = await request(app.getHttpServer())
      .post(route('/auth/register'))
      .send(credentials)
      .expect(201);

    expect(response.body).toEqual(
      expect.objectContaining({
        success: true,
        statusCode: 201,
        data: { user: expect.objectContaining({ email: credentials.email }) },
      }),
    );
    expect(response.body.data.user).not.toHaveProperty('password');

    sessionCookie = response.get('Set-Cookie') ?? [];
    expect(sessionCookie.join(';')).toContain('HttpOnly');
  });

  it('respinge un al doilea cont cu același email', async () => {
    await request(app.getHttpServer()).post(route('/auth/register')).send(credentials).expect(409);
  });

  it('respinge o parolă slabă cu erori pe câmp', async () => {
    const response = await request(app.getHttpServer())
      .post(route('/auth/register'))
      .send({ email: 'alt@example.com', password: 'slab' })
      .expect(422);

    expect(response.body.details).toHaveProperty('password');
  });

  it('întoarce contul curent împreună cu profilul', async () => {
    const response = await request(app.getHttpServer())
      .get(route('/auth/me'))
      .set('Cookie', sessionCookie)
      .expect(200);

    expect(response.body.data.user).toEqual(
      expect.objectContaining({ email: credentials.email, profile: expect.any(Object) }),
    );
  });

  it('blochează accesul fără cookie de sesiune', async () => {
    await request(app.getHttpServer()).get(route('/auth/me')).expect(401);
  });

  it('listează sesiunea curentă fără a expune session ID-ul', async () => {
    const response = await request(app.getHttpServer())
      .get(route('/sessions'))
      .set('Cookie', sessionCookie)
      .expect(200);

    const [session] = response.body.data.sessions;

    expect(session).toEqual(expect.objectContaining({ isCurrent: true, id: expect.any(String) }));
    expect(sessionCookie.join(';')).not.toContain(session.id);
  });

  it('invalidează sesiunea la deconectare', async () => {
    await request(app.getHttpServer())
      .post(route('/auth/logout'))
      .set('Cookie', sessionCookie)
      .expect(200);

    await request(app.getHttpServer())
      .get(route('/auth/me'))
      .set('Cookie', sessionCookie)
      .expect(401);
  });

  it('permite autentificarea cu credențialele create', async () => {
    await request(app.getHttpServer()).post(route('/auth/login')).send(credentials).expect(200);
  });

  it('respinge credențialele greșite', async () => {
    await request(app.getHttpServer())
      .post(route('/auth/login'))
      .send({ ...credentials, password: 'ParolaGresita1!' })
      .expect(401);
  });
});
