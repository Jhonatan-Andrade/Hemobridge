import { Controller, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { Perfis } from '../auth/decorators.js';
import { SenhaProvisoriaService } from '../contas/senha-provisoria.service.js';

// UC26 – Gerenciar Usuários
@Perfis('ADMINISTRADOR')
@Controller('admin/usuarios')
export class UsuariosAdminController {
  constructor(private readonly senhaProvisoria: SenhaProvisoriaService) {}

  // FA02
  @Post(':id/reenviar-senha-provisoria')
  @HttpCode(HttpStatus.OK)
  reenviarSenhaProvisoria(@Param('id', ParseUUIDPipe) id: string) {
    return this.senhaProvisoria.reenviar(id);
  }
}
