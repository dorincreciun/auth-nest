import { DeviceData } from '../../../common/types/express-session';

/** Sesiune activă indexată pentru un utilizator. */
export interface UserActiveSession {
  sessionId: string;
  deviceData: DeviceData | null;
  /** TTL rămas pe cheia de sesiune din Redis (secunde). `-1` = fără expirare, `-2` = cheie inexistentă. */
  ttlSeconds: number;
}
