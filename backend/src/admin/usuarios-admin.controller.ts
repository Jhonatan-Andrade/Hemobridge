import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import type { UsuarioAutenticado } from '../auth/auth.types.js';
import { Perfis, UsuarioAtual } from '../auth/decorators.js';
import { SenhaProvisoriaService } from '../contas/senha-provisoria.service.js';
import { AtualizarUsuarioDto, ListarUsuariosDto, NovoAdministradorDto } from './dto/usuario.dto.js';
import { UsuariosAdminService } from './usuarios-admin.service.js';
import { Auditar } from '../auditoria/auditar.decorator.js';

// UC26 – Gerenciar Usuários (RF27)
@Perfis('ADMINISTRADOR')
@Controller('admin/usuarios')
export class UsuariosAdminController {
  constructor(
    private readonly service: UsuariosAdminService,
    private readonly senhaProvisoria: SenhaProvisoriaService,
  ) {}

  @Get()
  listar(@Query() filtros: ListarUsuariosDto) {
    return this.service.listar(filtros);
  }

  // FA01
  @Auditar({ acao: 'CRIAR_ADMINISTRADOR', entidade: 'usuario' })
  @Post('administradores')
  criarAdministrador(@Body() dto: NovoAdministradorDto) {
    return this.service.criarAdministrador(dto);
  }

  @Auditar({ acao: 'VISUALIZAR_USUARIO', entidade: 'usuario' })
  @Get(':id')
  detalhar(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.detalhar(id);
  }

  @Auditar({ acao: 'ATUALIZAR_USUARIO', entidade: 'usuario' })
  @Patch(':id')
  atualizar(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AtualizarUsuarioDto) {
    return this.service.atualizar(id, dto);
  }

  @Auditar({ acao: 'DESATIVAR_USUARIO', entidade: 'usuario' })
  @Post(':id/desativar')
  @HttpCode(HttpStatus.OK)
  desativar(
    @Param('id', ParseUUIDPipe) id: string,
    @UsuarioAtual() administrador: UsuarioAutenticado,
  ) {
    return this.service.desativar(id, administrador.id);
  }

  @Auditar({ acao: 'ATIVAR_USUARIO', entidade: 'usuario' })
  @Post(':id/ativar')
  @HttpCode(HttpStatus.OK)
  ativar(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.ativar(id);
  }

  // FA02
  @Auditar({ acao: 'REENVIAR_SENHA_PROVISORIA', entidade: 'usuario' })
  @Post(':id/reenviar-senha-provisoria')
  @HttpCode(HttpStatus.OK)
  reenviarSenhaProvisoria(@Param('id', ParseUUIDPipe) id: string) {
    return this.senhaProvisoria.reenviar(id);
  }
}
