import { Controller, Get, GoneException, Post } from '@nestjs/common';
import { Publico } from '../auth/decorators.js';
@Publico()
@Controller()
export class HomeController {
  @Get() home() {
    return { service: 'HemoBridge', api: 'comunidade/publicacoes' };
  }
  @Get('post') getPost() {
    throw new GoneException('Use /comunidade/publicacoes.');
  }
  @Post('post') createPost() {
    throw new GoneException(
      'Use /comunidade/publicacoes com uma sessão autenticada.',
    );
  }
}
