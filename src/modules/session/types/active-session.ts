import { DeviceData } from '../../../common/types/express-session';

/** O sesiune activă a unui utilizator, așa cum e citită din Redis. */
export interface ActiveSession {
  /**
   * Identificator public, derivat din session ID prin HMAC.
   * Session ID-ul real este o credențială și nu părăsește niciodată serverul.
   */
  id: string;
  deviceData: DeviceData | null;
  /** Secundele rămase până la expirarea sesiunii. */
  expiresInSeconds: number;
  /** `true` pentru sesiunea din care vine request-ul curent. */
  isCurrent: boolean;
}
