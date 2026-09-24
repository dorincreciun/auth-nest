import { Controller, Delete, Get, HttpCode, HttpStatus, Param, Req } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import type { Request } from 'express';

import { Auth, CurrentUser } from '../../common/decorators';
import { ApiSuccessResponse, ErrorResponseDto } from '../../common/swagger';
import { ActiveSessionsDataDto, RevokedSessionsDataDto } from './dto';
import { SessionService } from './session.service';

@ApiTags('sessions')
@Auth()
@SkipThrottle({ medium: true, long: true })
@Controller('sessions')
export class SessionController {
  private static readonly MESSAGES = {
    OTHERS_REVOKED: 'The other devices have been signed out.',
    SESSION_REVOKED: 'The session was closed.',
  } as const;

  public constructor(private readonly sessionService: SessionService) {}

  /**
   * Listează dispozitivele de pe care utilizatorul este autentificat.
   * Sesiunea din care vine request-ul apare prima și e marcată cu `isCurrent`.
   */
  @Throttle({ short: { limit: 30, ttl: 60 * 1000 } })
  @HttpCode(HttpStatus.OK)
  @Get()
  @ApiOperation({ summary: 'Sesiunile active ale utilizatorului autentificat' })
  @ApiSuccessResponse(ActiveSessionsDataDto, {
    status: 200,
    description: 'Lista sesiunilor active',
  })
  public async list(
    @CurrentUser('id') userId: string,
    @Req() request: Request,
  ): Promise<ActiveSessionsDataDto> {
    const sessions = await this.sessionService.listActive(userId, request.sessionID);

    return { sessions };
  }

  /**
   * Deconectează toate celelalte dispozitive, păstrând sesiunea curentă.
   * Util când utilizatorul suspectează un acces neautorizat.
   */
  @Throttle({ short: { limit: 5, ttl: 60 * 1000 } })
  @HttpCode(HttpStatus.OK)
  @Delete('others')
  @ApiOperation({ summary: 'Deconectează celelalte dispozitive' })
  @ApiSuccessResponse(RevokedSessionsDataDto, {
    status: 200,
    description: 'Sesiunile celorlalte dispozitive au fost închise',
  })
  public async revokeOthers(
    @CurrentUser('id') userId: string,
    @Req() request: Request,
  ): Promise<RevokedSessionsDataDto> {
    const revoked = await this.sessionService.revokeOthers(userId, request.sessionID);

    return { message: SessionController.MESSAGES.OTHERS_REVOKED, revoked };
  }

  /**
   * Revocă o singură sesiune, identificată prin `id`-ul public din listare.
   * Revocarea sesiunii curente este permisă și echivalează cu un logout.
   */
  @Throttle({ short: { limit: 10, ttl: 60 * 1000 } })
  @HttpCode(HttpStatus.OK)
  @Delete(':id')
  @ApiOperation({ summary: 'Revocă o sesiune anume' })
  @ApiParam({ name: 'id', description: 'Identificatorul public al sesiunii (din GET /sessions)' })
  @ApiSuccessResponse(RevokedSessionsDataDto, {
    status: 200,
    description: 'Sesiunea a fost închisă',
  })
  @ApiResponse({ status: 404, description: 'Sesiune inexistentă', type: ErrorResponseDto })
  public async revoke(
    @CurrentUser('id') userId: string,
    @Param('id') sessionId: string,
  ): Promise<RevokedSessionsDataDto> {
    await this.sessionService.revoke(userId, sessionId);

    return { message: SessionController.MESSAGES.SESSION_REVOKED, revoked: 1 };
  }
}
