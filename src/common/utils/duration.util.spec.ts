import { toMilliseconds, toSeconds } from './duration.util';

describe('duration.util', () => {
  it('convertește duratele umane în milisecunde', () => {
    expect(toMilliseconds('30s')).toBe(30_000);
    expect(toMilliseconds('15m')).toBe(900_000);
    expect(toMilliseconds('7d')).toBe(604_800_000);
  });

  it('convertește duratele în secunde', () => {
    expect(toSeconds('1h')).toBe(3600);
  });

  it('aruncă în loc să propage NaN pentru durate invalide', () => {
    expect(() => toMilliseconds('nu-e-durată' as never)).toThrow(/nu este validă/);
  });
});
