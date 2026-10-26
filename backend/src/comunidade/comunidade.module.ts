import { Module } from '@nestjs/common';
import { ComunidadeController } from './comunidade.controller.js';
import { ComunidadeService } from './comunidade.service.js';
@Module({ controllers: [ComunidadeController], providers: [ComunidadeService] })
export class ComunidadeModule {}
