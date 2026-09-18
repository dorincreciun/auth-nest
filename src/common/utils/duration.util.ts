import ms, { type StringValue } from 'ms';

/**
 * Convertește o durată în format uman (`"15m"`, `"7d"`) în milisecunde.
 * Aruncă dacă valoarea nu poate fi interpretată, ca să nu ajungă `NaN` în TTL-uri.
 */
export function toMilliseconds(duration: StringValue): number {
  const milliseconds = ms(duration);

  if (typeof milliseconds !== 'number' || !Number.isFinite(milliseconds) || milliseconds <= 0) {
    throw new Error(`Durata "${duration}" nu este validă (ex. "30s", "15m", "7d")`);
  }

  return milliseconds;
}

/** Aceeași conversie ca `toMilliseconds`, dar în secunde (unitatea folosită de Redis EXPIRE). */
export function toSeconds(duration: StringValue): number {
  return Math.floor(toMilliseconds(duration) / 1000);
}
