import { Module } from '@nestjs/common';
import { ExamesMedicoController, MeusExamesController } from './exames.controller.js';
import { ExamesService } from './exames.service.js';

// UC11 e UC15. A avaliação do exame pelo médico (UC16) entra na tarefa HEM-46.
@Module({
  controllers: [MeusExamesController, ExamesMedicoController],
  providers: [ExamesService],
  exports: [ExamesService],
})
export class ExamesModule {}
