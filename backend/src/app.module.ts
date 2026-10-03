import { Module } from '@nestjs/common';
import { AuthController } from './auth/auth.controller.js';
import { AuthModule } from './auth/auth.module.js';
import { AuthService } from './auth/auth.service.js';
import { PrismaService } from './prisma/prisma.service.js';
import { HomeController } from './home/home.controller.js';

@Module({
  imports: [AuthModule],
  controllers: [AuthController, HomeController],
  providers: [AuthService, PrismaService],
})
export class AppModule {}
