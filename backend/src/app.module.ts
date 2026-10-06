import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AdminModule } from './admin/admin.module.js';
import { AuthModule } from './auth/auth.module.js';
import { LIMITE_PADRAO } from './common/limite-requisicoes.js';
import { ContasModule } from './contas/contas.module.js';
import { EmailModule } from './email/email.module.js';
import { HomeController } from './home/home.controller.js';
import { HospitaisModule } from './hospitais/hospitais.module.js';
import { PacientesModule } from './pacientes/pacientes.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { RepresentanteModule } from './representante/representante.module.js';
import { TipagemModule } from './tipagem/tipagem.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot({
      throttlers: [LIMITE_PADRAO],
      errorMessage: 'Parabéns! Você ganhou um tempo de castigo grátis. Aproveite para tocar grama. 🌱',
    }),
    PrismaModule,
    EmailModule,
    ContasModule,
    AuthModule,
    PacientesModule,
    HospitaisModule,
    TipagemModule,
    AdminModule,
    RepresentanteModule,
  ],
  controllers: [HomeController],
  // Registrado antes do AuthGuard: o limite vale também para requisições sem token.
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
