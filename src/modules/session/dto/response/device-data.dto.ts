/** Metadatele dispozitivului de pe care a fost pornită sesiunea. */
export class DeviceDataDto {
  /**
   * Adresa IP de la care s-a autentificat utilizatorul
   * @example 82.76.14.201
   */
  ip: string;

  /**
   * Browserul detectat din User-Agent
   * @example Chrome
   */
  browser: string;

  /**
   * Versiunea browserului
   * @example 141.0.0.0
   */
  browserVersion: string;

  /**
   * Sistemul de operare detectat
   * @example Linux
   */
  os: string;

  /**
   * Platforma detectată
   * @example Desktop
   */
  platform: string;

  /**
   * Dacă sesiunea a fost pornită de pe un dispozitiv mobil
   * @example false
   */
  isMobile: boolean;

  /**
   * Dacă sesiunea a fost pornită de pe un desktop
   * @example true
   */
  isDesktop: boolean;

  /**
   * Momentul autentificării (ISO)
   * @example 2026-09-18T06:00:00.000Z
   */
  loggedAt: string;

  /**
   * Ultima activitate înregistrată pe sesiune (ISO)
   * @example 2026-09-18T06:42:00.000Z
   */
  lastActiveAt: string;
}
