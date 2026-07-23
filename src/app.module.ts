import { Module } from '@nestjs/common';

/* Modules */
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './modules/prisma';
import { HashModule } from './modules/hash';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    HashModule,
    UsersModule,
  ],
})
export class AppModule {}
