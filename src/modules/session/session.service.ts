import {
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import type { CookieOptions, Request, Response } from 'express';

import { sessionConfig } from '../../config';
import { extractDeviceData } from '../../common/utils';
import { SessionRepository } from './session.repository';
import { ActiveSession } from './types';

type SessionCallback = (error?: Error | null) => void;

/**
 * Ciclul de viață al sesiunilor de autentificare.
 *
 * Controllerele nu ating niciodată direct `express-session`: aici sunt încapsulate
 * regenerarea (protecție anti session-fixation), indexarea în Redis, revocarea de
 * pe alte dispozitive și opțiunile cookie-ului.
 */
@Injectable()
export class SessionService {
  private static readonly MESSAGES = {
    REGENERATE_FAILED: 'The session could not be renewed',
    SAVE_FAILED: 'The session could not be saved',
    DESTROY_FAILED: 'The session could not be closed',
    SESSION_NOT_FOUND: 'The requested session does not exist or has already expired',
  } as const;

  public constructor(
    private readonly repository: SessionRepository,
    @Inject(sessionConfig.KEY) private readonly config: ConfigType<typeof sessionConfig>,
  ) {}

  /**
   * Pornește o sesiune autenticată: regenerează ID-ul (previne session fixation),
   * atașează userul și metadatele dispozitivului, apoi o indexează pentru listare.
   */
  public async start(request: Request, userId: string): Promise<void> {
    await this.execute(
      (callback) => request.session.regenerate(callback),
      SessionService.MESSAGES.REGENERATE_FAILED,
    );

    request.session.userId = userId;
    request.session.deviceData = extractDeviceData(request);

    await this.execute(
      (callback) => request.session.save(callback),
      SessionService.MESSAGES.SAVE_FAILED,
    );

    await this.repository.index(userId, request.sessionID);
  }

  /** Închide sesiunea curentă și o scoate din indexul utilizatorului. */
  public async destroy(request: Request): Promise<void> {
    const { userId } = request.session;
    const sessionId = request.sessionID;

    if (userId) {
      await this.repository.deindex(userId, sessionId);
    }

    await this.execute(
      (callback) => request.session.destroy(callback),
      SessionService.MESSAGES.DESTROY_FAILED,
    );
  }

  /** Sesiunile active ale utilizatorului, cea curentă fiind marcată cu `isCurrent`. */
  public async listActive(userId: string, currentSessionId: string): Promise<ActiveSession[]> {
    const currentPublicId = this.repository.toPublicId(currentSessionId);
    const sessions = await this.repository.findByUser(userId);

    return sessions
      .map<ActiveSession>((session) => ({
        id: session.publicId,
        deviceData: session.deviceData,
        expiresInSeconds: session.expiresInSeconds,
        isCurrent: session.publicId === currentPublicId,
      }))
      .sort((first, second) => Number(second.isCurrent) - Number(first.isCurrent));
  }

  /** Revocă o singură sesiune, identificată prin id-ul public din listare. */
  public async revoke(userId: string, publicSessionId: string): Promise<void> {
    const deleted = await this.repository.deleteByPublicId(userId, publicSessionId);

    if (!deleted) {
      throw new NotFoundException(SessionService.MESSAGES.SESSION_NOT_FOUND);
    }
  }

  /** Deconectează celelalte dispozitive, păstrând sesiunea curentă. Întoarce câte au fost închise. */
  public revokeOthers(userId: string, currentSessionId: string): Promise<number> {
    return this.repository.deleteAll(userId, currentSessionId);
  }

  /**
   * Deconectează utilizatorul de pe toate dispozitivele.
   * Folosit după schimbarea parolei, ca o parolă compromisă să nu lase sesiuni deschise.
   */
  public revokeAll(userId: string): Promise<number> {
    return this.repository.deleteAll(userId);
  }

  /** Opțiunile cookie-ului de sesiune — aceleași la scriere și la ștergere. */
  public getCookieOptions(): CookieOptions {
    return {
      path: '/',
      domain: this.config.cookieDomain,
      httpOnly: true,
      secure: this.config.secure,
      sameSite: this.config.sameSite,
    };
  }

  public clearCookie(response: Response): void {
    response.clearCookie(this.config.cookieName, this.getCookieOptions());
  }

  /** Transformă API-ul pe callback-uri al `express-session` în promisiuni. */
  private execute(
    operation: (callback: SessionCallback) => void,
    failureMessage: string,
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      operation((error) => {
        if (error) {
          reject(new InternalServerErrorException(failureMessage));
          return;
        }

        resolve();
      });
    });
  }
}
