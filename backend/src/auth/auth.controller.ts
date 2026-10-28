import { Body, Controller, Get, HttpCode, HttpStatus, Ip, Post } from '@nestjs/common';
import {
  LimiteCadastro,
  LimiteLogin,
  LimiteRecuperacaoSenha,
  LimiteRedefinicaoSenha,
} from '../common/limite-requisicoes.js';
import { TERMO_CONSENTIMENTO } from '../lgpd/termo-consentimento.js';
import { TERMO_RESPONSABILIDADE } from '../lgpd/termo-responsabilidade.js';
import { AuthService } from './auth.service.js';
import type { UsuarioAutenticado } from './auth.types.js';
import { CadastroService } from './cadastro.service.js';
import { PermitePrimeiroAcesso, Perfis, Publico, UsuarioAtual } from './decorators.js';
import { CadastroDto } from './dto/cadastro.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { PrimeiroAcessoDto } from './dto/primeiro-acesso.dto.js';
import { RecuperarSenhaDto, RedefinirSenhaDto } from './dto/recuperacao-senha.dto.js';
import { RecuperacaoSenhaService } from './recuperacao-senha.service.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly recuperacaoSenha: RecuperacaoSenhaService,
    private readonly cadastro: CadastroService,
  ) {}

  // Versão vigente do termo, para o formulário de cadastro (RF01).
  @Publico()
  @Get('termo-consentimento')
  termoConsentimento() {
    return TERMO_CONSENTIMENTO;
  }

  // RF01: cadastro do paciente. Pré-condição: o visitante não estar autenticado.
  @Publico()
  @LimiteCadastro()
  @Post('register')
  cadastrar(@Body() dto: CadastroDto, @Ip() ip: string) {
    return this.cadastro.cadastrar(dto, ip);
  }

  @Publico()
  @LimiteLogin()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  // UC06: resposta idêntica exista ou não a conta (RN14).
  @Publico()
  @LimiteRecuperacaoSenha()
  @Post('recuperar-senha')
  @HttpCode(HttpStatus.ACCEPTED)
  recuperarSenha(@Body() dto: RecuperarSenhaDto) {
    return this.recuperacaoSenha.solicitar(dto);
  }

  @Publico()
  @LimiteRedefinicaoSenha()
  @Post('redefinir-senha')
  @HttpCode(HttpStatus.OK)
  redefinirSenha(@Body() dto: RedefinirSenhaDto) {
    return this.recuperacaoSenha.redefinir(dto);
  }

  @PermitePrimeiroAcesso()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@UsuarioAtual() usuario: UsuarioAutenticado) {
    await this.authService.logout(usuario.id);
  }

  // Dados da sessão atual (usado pelo frontend para montar o painel do perfil).
  @PermitePrimeiroAcesso()
  @Get('me')
  me(@UsuarioAtual() usuario: UsuarioAutenticado) {
    return usuario;
  }

  // Contas de pacientes nunca recebem senha provisória (RN15).
  @PermitePrimeiroAcesso()
  @Perfis('EQUIPE', 'ADMIN_PLATAFORMA')
  @Get('primeiro-acesso/termo')
  termoResponsabilidade() {
    return TERMO_RESPONSABILIDADE;
  }

  @PermitePrimeiroAcesso()
  @Perfis('EQUIPE', 'ADMIN_PLATAFORMA')
  @Post('primeiro-acesso')
  @HttpCode(HttpStatus.OK)
  definirSenhaPrimeiroAcesso(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Body() dto: PrimeiroAcessoDto,
    @Ip() ip: string,
  ) {
    return this.authService.definirSenhaPrimeiroAcesso(usuario.id, dto, ip);
  }
}
