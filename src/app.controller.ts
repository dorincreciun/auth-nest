import { Controller, Get, InternalServerErrorException } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';

/** Endpoint de test — exclus din documentația OpenAPI. */
@ApiExcludeController()
@Controller('test')
export class AppController {
  @Get('res')
  getTest() {
    throw new InternalServerErrorException({
      message: 'test',
      details: {
        email: ['Adresa de email nu este validă'],
        password: ['Parola trebuie să aibă minim 8 caractere', 'Parola trebuie să conțină o cifră'],
      },
    });
  }
}
