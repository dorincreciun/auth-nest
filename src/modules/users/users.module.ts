import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { AuthGuard } from '../../common/guards';
import { FileModule } from '../file';

@Module({
  imports: [FileModule],
  controllers: [UsersController],
  providers: [UsersService, AuthGuard],
  exports: [UsersService],
})
export class UsersModule {}
