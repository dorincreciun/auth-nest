import { Request } from 'express';
import useragent from 'express-useragent';

import { DeviceData } from '../types/express-session';

const LOOPBACK_ADDRESSES = new Set(['::1', '127.0.0.1', '::ffff:127.0.0.1']);
const UNKNOWN = 'Unknown';

/**
 * Construiește descrierea dispozitivului care pornește o sesiune, ca utilizatorul
 * să poată recunoaște mai târziu de unde este autentificat.
 */
export function extractDeviceData(request: Request): DeviceData {
  const agent = useragent.parse(request.headers['user-agent'] ?? '');
  const now = new Date().toISOString();

  return {
    ip: extractClientIp(request),
    browser: agent.browser || UNKNOWN,
    browserVersion: agent.version ? String(agent.version) : UNKNOWN,
    os: agent.os || UNKNOWN,
    platform: agent.platform || UNKNOWN,
    isMobile: agent.isMobile || false,
    isDesktop: agent.isDesktop || false,
    loggedAt: now,
    lastActiveAt: now,
  };
}

/**
 * Determină IP-ul clientului.
 *
 * `request.ip` este de încredere doar când `trust proxy` este activat în Express;
 * de aceea se preferă acesta, cu revenire la header-ele de proxy și, în final,
 * la adresa socketului.
 */
function extractClientIp(request: Request): string {
  const candidates = [
    request.ip,
    firstHeaderValue(request.headers['x-forwarded-for']),
    firstHeaderValue(request.headers['x-real-ip']),
    request.socket?.remoteAddress,
  ];

  const publicIp = candidates.find((candidate) => candidate && !LOOPBACK_ADDRESSES.has(candidate));

  return publicIp ?? '127.0.0.1';
}

/** Header-ele de proxy pot conține un lanț de adrese; prima este clientul original. */
function firstHeaderValue(header: string | string[] | undefined): string | undefined {
  if (!header) {
    return undefined;
  }

  const raw = Array.isArray(header) ? header[0] : header.split(',')[0];

  return raw?.trim() || undefined;
}
