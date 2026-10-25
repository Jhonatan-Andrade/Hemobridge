import { Global, Module } from '@nestjs/common';
import { ArmazenamentoService } from './armazenamento.service.js';
import { DiscoArmazenamentoService } from './disco-armazenamento.service.js';

@Global()
@Module({
  providers: [{ provide: ArmazenamentoService, useClass: DiscoArmazenamentoService }],
  exports: [ArmazenamentoService],
})
export class ArmazenamentoModule {}
