import { Module } from '@nestjs/common';
import { TipagemController } from './tipagem.controller.js';
import { TipagemService } from './tipagem.service.js';

@Module({
  controllers: [TipagemController],
  providers: [TipagemService],
})
export class TipagemModule {}
