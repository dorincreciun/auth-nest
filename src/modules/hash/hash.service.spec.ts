import { HashService } from './hash.service';

describe('HashService', () => {
  let service: HashService;

  beforeEach(async () => {
    service = new HashService({ bcryptSaltRounds: 10, cookieSecret: 'c'.repeat(32) });
    await service.onModuleInit();
  });

  it('produce hash-uri diferite pentru aceeași parolă', async () => {
    const [first, second] = await Promise.all([
      service.hash('Parola123!'),
      service.hash('Parola123!'),
    ]);

    expect(first).not.toBe(second);
  });

  it('validează parola corectă și respinge una greșită', async () => {
    const hash = await service.hash('Parola123!');

    await expect(service.compare('Parola123!', hash)).resolves.toBe(true);
    await expect(service.compare('AltăParolă1!', hash)).resolves.toBe(false);
  });

  it('pregătește un hash-fantomă utilizabil pentru comparații constant-time', async () => {
    const dummyHash = service.getDummyHash();

    expect(dummyHash).toMatch(/^\$2[aby]\$/);
    await expect(service.compare('orice', dummyHash)).resolves.toBe(false);
  });
});
