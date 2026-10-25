import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AgendamentosModule } from './agendamentos/agendamentos.module.js';
import { AuditoriaModule } from './auditoria/auditoria.module.js';
import { AuthModule } from './auth/auth.module.js';
import { LIMITE_PADRAO } from './common/limite-requisicoes.js';
import { ContasModule } from './contas/contas.module.js';
import { DoacoesModule } from './doacoes/doacoes.module.js';
import { EmailModule } from './email/email.module.js';
import { EquipeModule } from './equipe/equipe.module.js';
import { HemocentrosModule } from './hemocentros/hemocentros.module.js';
import { HorariosModule } from './horarios/horarios.module.js';
import { PacientesModule } from './pacientes/pacientes.module.js';
import { PrismaModule } from './prisma/prisma.module.js';

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
    AuditoriaModule,
    AuthModule,
    PacientesModule,
    HemocentrosModule,
    HorariosModule,
    AgendamentosModule,
    DoacoesModule,
    EquipeModule,
  ],
  // Registrado antes do AuthGuard: o limite vale também para requisições sem token.
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
