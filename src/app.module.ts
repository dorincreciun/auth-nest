import { Module } from '@nestjs/common';

/* Modules */
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './modules/prisma';
import { HashModule } from './modules/hash';
import { UsersModule } from './modules/users';
import { AuthModule } from './modules/auth';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    HashModule,
    UsersModule,
    AuthModule,
  ],
})
export class AppModule {}
