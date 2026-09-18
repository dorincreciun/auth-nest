import { resetEnvironmentCache, validateEnvironment } from './environment';
import { NodeEnvironment } from './environment-variables';

const requiredEnvironment = {
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
  COOKIE_SECRET: 'a'.repeat(32),
  SESSION_SECRET: 'b'.repeat(32),
  REDIS_HOST: 'localhost',
};

describe('validateEnvironment', () => {
  afterEach(() => resetEnvironmentCache());

  it('aplică valorile implicite pentru variabilele opționale', () => {
    const environment = validateEnvironment({ ...requiredEnvironment });

    expect(environment.NODE_ENV).toBe(NodeEnvironment.Development);
    expect(environment.APP_PORT).toBe(5000);
    expect(environment.SESSION_MAX_AGE).toBe('30d');
    expect(environment.CORS_ORIGIN).toEqual(['http://localhost:3000']);
  });

  it('convertește numerele și booleenele primite ca text', () => {
    const environment = validateEnvironment({
      ...requiredEnvironment,
      APP_PORT: '8080',
      SESSION_SECURE: 'true',
      TRUST_PROXY: 'false',
    });

    expect(environment.APP_PORT).toBe(8080);
    expect(environment.SESSION_SECURE).toBe(true);
    expect(environment.TRUST_PROXY).toBe(false);
  });

  it('acceptă mai multe origini CORS separate prin virgulă', () => {
    const environment = validateEnvironment({
      ...requiredEnvironment,
      CORS_ORIGIN: 'http://localhost:3000, https://app.example.com',
    });

    expect(environment.CORS_ORIGIN).toEqual(['http://localhost:3000', 'https://app.example.com']);
  });

  it('tratează o variabilă declarată dar goală ca nesetată', () => {
    const environment = validateEnvironment({ ...requiredEnvironment, SESSION_NAME: '' });

    expect(environment.SESSION_NAME).toBe('sessionId');
  });

  it('respinge configurația fără variabilele obligatorii', () => {
    expect(() => validateEnvironment({})).toThrow(/DATABASE_URL/);
  });

  it('respinge secretele prea scurte', () => {
    expect(() =>
      validateEnvironment({ ...requiredEnvironment, SESSION_SECRET: 'prea-scurt' }),
    ).toThrow(/SESSION_SECRET/);
  });

  it('respinge duratele care nu pot fi interpretate', () => {
    expect(() =>
      validateEnvironment({ ...requiredEnvironment, SESSION_MAX_AGE: 'într-o zi' }),
    ).toThrow(/SESSION_MAX_AGE/);
  });

  it('raportează toate problemele într-un singur mesaj', () => {
    expect(() =>
      validateEnvironment({ ...requiredEnvironment, APP_PORT: '0', BCRYPT_SALT: '3' }),
    ).toThrow(/APP_PORT[\s\S]*BCRYPT_SALT|BCRYPT_SALT[\s\S]*APP_PORT/);
  });
});
