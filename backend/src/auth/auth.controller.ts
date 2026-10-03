import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import type { UsuarioAutenticado } from './auth.types.js';
import { PermitePrimeiroAcesso, Publico, UsuarioAtual } from './decorators.js';
import { LoginDto } from './dto/login.dto.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Publico()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  // Dados da sessão atual (usado pelo frontend para montar o painel do perfil).
  @PermitePrimeiroAcesso()
  @Get('me')
  me(@UsuarioAtual() usuario: UsuarioAutenticado) {
    return usuario;
  }
}
