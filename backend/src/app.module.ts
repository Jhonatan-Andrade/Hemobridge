import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module.js';
import { HomeController } from './home/home.controller.js';
import { PacientesModule } from './pacientes/pacientes.module.js';
import { PrismaModule } from './prisma/prisma.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    PacientesModule,
  ],
  controllers: [HomeController],
})
export class AppModule {}
