import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Ip,
  Post,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { clearSessionCookie, setSessionCookie } from './web-session.js';
import {
  LimiteLogin,
  LimiteRecuperacaoSenha,
  LimiteRedefinicaoSenha,
} from '../common/limite-requisicoes.js';
import { TERMO_RESPONSABILIDADE } from '../lgpd/termo-responsabilidade.js';
import { AuthService } from './auth.service.js';
import type { UsuarioAutenticado } from './auth.types.js';
import {
  PermitePrimeiroAcesso,
  Perfis,
  Publico,
  UsuarioAtual,
} from './decorators.js';
import { LoginDto } from './dto/login.dto.js';
import { PrimeiroAcessoDto } from './dto/primeiro-acesso.dto.js';
import {
  RecuperarSenhaDto,
  RedefinirSenhaDto,
} from './dto/recuperacao-senha.dto.js';
import { RecuperacaoSenhaService } from './recuperacao-senha.service.js';
import { Auditar } from '../auditoria/auditar.decorator.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly recuperacaoSenha: RecuperacaoSenhaService,
  ) {}

  @Publico()
  @LimiteLogin()
  @Auditar({ acao: 'LOGIN', entidade: 'usuario', registrarFalha: true })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Publico()
  @LimiteLogin()
  @Post('sessao')
  @HttpCode(HttpStatus.OK)
  @Auditar({ acao: 'LOGIN', entidade: 'usuario', registrarFalha: true })
  async sessaoWeb(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const sessao = await this.authService.login(dto);
    setSessionCookie(res, sessao.accessToken, sessao.expiraEm);
    return {
      usuario: { ...sessao.usuario, senhaProvisoria: sessao.primeiroAcesso },
      primeiroAcesso: sessao.primeiroAcesso,
      expiraEm: sessao.expiraEm,
    };
  }

  // UC06: resposta idêntica exista ou não a conta (RN14).
  @Publico()
  @LimiteRecuperacaoSenha()
  @Auditar({ acao: 'SOLICITAR_RECUPERACAO_SENHA', entidade: 'usuario' })
  @Post('recuperar-senha')
  @HttpCode(HttpStatus.ACCEPTED)
  recuperarSenha(@Body() dto: RecuperarSenhaDto) {
    return this.recuperacaoSenha.solicitar(dto);
  }

  @Publico()
  @LimiteRedefinicaoSenha()
  @Auditar({
    acao: 'REDEFINIR_SENHA',
    entidade: 'usuario',
    registrarFalha: true,
  })
  @Post('redefinir-senha')
  @HttpCode(HttpStatus.OK)
  redefinirSenha(@Body() dto: RedefinirSenhaDto) {
    return this.recuperacaoSenha.redefinir(dto);
  }

  @PermitePrimeiroAcesso()
  @Auditar({ acao: 'LOGOUT', entidade: 'usuario' })
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Res({ passthrough: true }) res?: Response,
  ) {
    await this.authService.logout(usuario.id);
    clearSessionCookie(res);
  }

  // Dados da sessão atual (usado pelo frontend para montar o painel do perfil).
  @PermitePrimeiroAcesso()
  @Get('me')
  me(@UsuarioAtual() usuario: UsuarioAutenticado) {
    return usuario;
  }

  // Contas de pacientes nunca recebem senha provisória (RN04/RN15).
  @PermitePrimeiroAcesso()
  @Perfis('MEDICO', 'REPRESENTANTE', 'ADMINISTRADOR')
  @Get('primeiro-acesso/termo')
  termoResponsabilidade() {
    return TERMO_RESPONSABILIDADE;
  }

  @PermitePrimeiroAcesso()
  @Perfis('MEDICO', 'REPRESENTANTE', 'ADMINISTRADOR')
  @Auditar({
    acao: 'PRIMEIRO_ACESSO',
    entidade: 'usuario',
    registrarFalha: true,
  })
  @Post('primeiro-acesso')
  @HttpCode(HttpStatus.OK)
  async definirSenhaPrimeiroAcesso(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Body() dto: PrimeiroAcessoDto,
    @Ip() ip: string,
    @Res({ passthrough: true }) res?: Response,
  ) {
    const sessao = await this.authService.definirSenhaPrimeiroAcesso(
      usuario.id,
      dto,
      ip,
    );
    if (res) setSessionCookie(res, sessao.accessToken, sessao.expiraEm);
    return sessao;
  }
}
