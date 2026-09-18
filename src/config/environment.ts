import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

import { EnvironmentVariables, NodeEnvironment } from './environment-variables';

let cachedEnvironment: EnvironmentVariables | null = null;

/**
 * Validează variabilele de mediu și le întoarce tipizate.
 * Aruncă un singur `Error` care listează toate problemele găsite, ca dezvoltatorul
 * să nu descopere configurația greșită câmp cu câmp.
 */
export function validateEnvironment(raw: Record<string, unknown>): EnvironmentVariables {
  const environment = plainToInstance(EnvironmentVariables, omitEmptyValues(raw), {
    exposeDefaultValues: true,
    enableImplicitConversion: false,
  });

  const errors = validateSync(environment, {
    skipMissingProperties: false,
    whitelist: false,
    forbidUnknownValues: true,
  });

  if (errors.length > 0) {
    const details = errors
      .map((error) => {
        const messages = Object.values(error.constraints ?? {}).join('; ');
        return `  - ${error.property}: ${messages}`;
      })
      .join('\n');

    throw new Error(`Configurație de mediu invalidă:\n${details}`);
  }

  cachedEnvironment = environment;

  return environment;
}

/**
 * O variabilă declarată dar goală (`VAR=`) e tratată ca nesetată, ca valorile
 * implicite să se aplice în loc să pice validarea pe un string gol.
 */
function omitEmptyValues(raw: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(raw).filter(([, value]) => !(typeof value === 'string' && value.trim() === '')),
  );
}

/**
 * Accesul citit de fabricile de configurare. Validarea rulează o singură dată,
 * indiferent dacă intrarea a fost `ConfigModule` sau un test care importă direct
 * un namespace de configurare.
 */
export function getEnvironment(): EnvironmentVariables {
  return cachedEnvironment ?? validateEnvironment(process.env);
}

/** Golește cache-ul — folosit de teste care schimbă `process.env`. */
export function resetEnvironmentCache(): void {
  cachedEnvironment = null;
}

export function isDevelopment(): boolean {
  return getEnvironment().NODE_ENV === NodeEnvironment.Development;
}

export function isProduction(): boolean {
  return getEnvironment().NODE_ENV === NodeEnvironment.Production;
}

export function isTest(): boolean {
  return getEnvironment().NODE_ENV === NodeEnvironment.Test;
}
