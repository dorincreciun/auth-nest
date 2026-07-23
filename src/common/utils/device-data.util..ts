import { Request } from 'express';
import useragent from 'express-useragent';
import { DeviceData } from '../types/express-session';

export function extractDeviceData(req: Request): DeviceData {
  const source = req.headers['user-agent'] || '';
  const ua = useragent.parse(source);
  const ip = extractClientIp(req);
  const now = new Date().toISOString();

  return {
    ip,
    browser: ua.browser || 'Unknown',
    browserVersion: ua.version ? String(ua.version) : 'Unknown',
    os: ua.os || 'Unknown',
    platform: ua.platform || 'Unknown',
    isMobile: ua.isMobile || false,
    isDesktop: ua.isDesktop || false,
    loggedAt: now,
    lastActiveAt: now,
  };
}

function extractClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const rawIp = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0];
    const firstIp = rawIp?.trim();
    if (firstIp && firstIp !== '::1') {
      return firstIp;
    }
  }

  const realIp = req.headers['x-real-ip'];
  if (realIp) {
    const singleIp = Array.isArray(realIp) ? realIp[0] : realIp;
    const trimmedIp = singleIp.trim();
    if (trimmedIp && trimmedIp !== '::1') {
      return trimmedIp;
    }
  }

  const socketIp = req.socket?.remoteAddress || '';
  if (!socketIp || socketIp === '::1') {
    return '127.0.0.1';
  }

  return socketIp;
}
