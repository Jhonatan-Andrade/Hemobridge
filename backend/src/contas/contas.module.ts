import { Global, Module } from '@nestjs/common';
import { SenhaProvisoriaService } from './senha-provisoria.service.js';

@Global()
@Module({
  providers: [SenhaProvisoriaService],
  exports: [SenhaProvisoriaService],
})
export class ContasModule {}
