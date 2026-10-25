import { Module } from '@nestjs/common';
import { EquipeController } from './equipe.controller.js';
import { EquipeService } from './equipe.service.js';

@Module({
  controllers: [EquipeController],
  providers: [EquipeService],
})
export class EquipeModule {}
