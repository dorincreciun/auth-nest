import { Transform } from 'class-transformer';

/**
 * Variabilele de mediu ajung mereu ca `string`. Transformatoarele de mai jos le
 * normalizează *înainte* de validare și lasă valoarea neatinsă când nu poate fi
 * convertită, astfel încât `class-validator` să raporteze un mesaj util.
 */

export function ToNumber(): PropertyDecorator {
  return Transform(({ value }: { value: unknown }) => {
    if (typeof value === 'number') {
      return value;
    }

    if (typeof value === 'string' && value.trim().length > 0) {
      const parsed = Number(value);
      return Number.isNaN(parsed) ? value : parsed;
    }

    return value;
  });
}

export function ToBoolean(): PropertyDecorator {
  return Transform(({ value }: { value: unknown }) => {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();

      if (normalized === 'true' || normalized === '1') {
        return true;
      }

      if (normalized === 'false' || normalized === '0') {
        return false;
      }
    }

    return value;
  });
}

/** `"http://a.com, http://b.com"` → `['http://a.com', 'http://b.com']`. */
export function ToStringArray(): PropertyDecorator {
  return Transform(({ value }: { value: unknown }) => {
    if (Array.isArray(value)) {
      return value as unknown[];
    }

    if (typeof value === 'string') {
      return value
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
    }

    return value;
  });
}
