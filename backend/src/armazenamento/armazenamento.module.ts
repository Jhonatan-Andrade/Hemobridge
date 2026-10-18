import { Global, Module } from '@nestjs/common';
import { ArmazenamentoService } from './armazenamento.service.js';
import { S3ArmazenamentoService } from './s3-armazenamento.service.js';

@Global()
@Module({
  providers: [{ provide: ArmazenamentoService, useClass: S3ArmazenamentoService }],
  exports: [ArmazenamentoService],
})
export class ArmazenamentoModule {}
