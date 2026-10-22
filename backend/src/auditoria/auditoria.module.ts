import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditoriaInterceptor } from './auditoria.interceptor.js';
import { AuditoriaService } from './auditoria.service.js';

// RNF05. Global: qualquer módulo injeta AuditoriaService ou usa @Auditar().
@Global()
@Module({
  providers: [AuditoriaService, { provide: APP_INTERCEPTOR, useClass: AuditoriaInterceptor }],
  exports: [AuditoriaService],
})
export class AuditoriaModule {}
