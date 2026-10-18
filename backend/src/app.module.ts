import { Module } from '@nestjs/common';
import { ComunidadeModule } from './comunidade/comunidade.module.js';
import { PlataformaModule } from './plataforma/plataforma.controller.js';
import { HealthController } from './common/health.controller.js';
import { validateEnvironment } from './common/environment.js';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { SafeExceptionFilter } from './common/safe-exception.filter.js';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AdminModule } from './admin/admin.module.js';
import { ArmazenamentoModule } from './armazenamento/armazenamento.module.js';
import { AuditoriaModule } from './auditoria/auditoria.module.js';
import { AuthModule } from './auth/auth.module.js';
import { LIMITE_PADRAO } from './common/limite-requisicoes.js';
import { ConsultasModule } from './consultas/consultas.module.js';
import { ContasModule } from './contas/contas.module.js';
import { EmailModule } from './email/email.module.js';
import { ExamesModule } from './exames/exames.module.js';
import { HomeController } from './home/home.controller.js';
import { HospitaisModule } from './hospitais/hospitais.module.js';
import { IndicadoresModule } from './indicadores/indicadores.module.js';
import { NotificacoesModule } from './notificacoes/notificacoes.module.js';
import { PacientesModule } from './pacientes/pacientes.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { RepresentanteModule } from './representante/representante.module.js';
import { TipagemModule } from './tipagem/tipagem.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),
    ThrottlerModule.forRoot({
      throttlers: [LIMITE_PADRAO],
      errorMessage:
        'Muitas solicitações. Aguarde um momento e tente novamente.',
    }),
    PrismaModule,
    ComunidadeModule,
    PlataformaModule,
    AuditoriaModule,
    EmailModule,
    ArmazenamentoModule,
    NotificacoesModule,
    ConsultasModule,
    ExamesModule,
    IndicadoresModule,
    ContasModule,
    AuthModule,
    PacientesModule,
    HospitaisModule,
    TipagemModule,
    AdminModule,
    RepresentanteModule,
  ],
  controllers: [HomeController, HealthController],
  // Registrado antes do AuthGuard: o limite vale também para requisições sem token.
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: SafeExceptionFilter },
  ],
})
export class AppModule {}
