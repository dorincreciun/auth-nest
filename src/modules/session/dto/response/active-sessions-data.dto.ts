import { ApiExtraModels, ApiProperty } from '@nestjs/swagger';

import { ActiveSessionDto } from './active-session.dto';
import { DeviceDataDto } from './device-data.dto';

/** Conținutul `data` pentru `GET /sessions`. */
@ApiExtraModels(ActiveSessionDto, DeviceDataDto)
export class ActiveSessionsDataDto {
  @ApiProperty({
    type: [ActiveSessionDto],
    description: 'Sesiunile active, cea curentă fiind prima în listă',
  })
  sessions: ActiveSessionDto[];
}
