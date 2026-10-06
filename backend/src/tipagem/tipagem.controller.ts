import { Controller, Get } from '@nestjs/common';
import { Publico } from '../auth/decorators.js';
import { TipagemService } from './tipagem.service.js';

@Publico()
@Controller('tipos-sanguineos')
export class TipagemController {
  constructor(private readonly tipagemService: TipagemService) {}

  @Get()
  listarTipos() {
    return this.tipagemService.listarTipos();
  }

  // RF19
  @Get('compatibilidade')
  compatibilidade() {
    return this.tipagemService.compatibilidade();
  }
}
