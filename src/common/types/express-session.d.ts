import 'express-session';

export interface DeviceData {
  ip: string;
  browser: string;
  browserVersion: string;
  os: string;
  platform: string;
  isMobile: boolean;
  isDesktop: boolean;
  loggedAt: string;
  lastActiveAt: string;
}

declare module 'express-session' {
  interface SessionData {
    userId?: string;
    deviceData?: DeviceData;
  }
}
