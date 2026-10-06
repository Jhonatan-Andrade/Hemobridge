import { Module } from '@nestjs/common';
import { HospitaisController } from './hospitais.controller.js';
import { HospitaisService } from './hospitais.service.js';

@Module({
  controllers: [HospitaisController],
  providers: [HospitaisService],
})
export class HospitaisModule {}
