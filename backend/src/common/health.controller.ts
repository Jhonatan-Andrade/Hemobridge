import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { Publico } from '../auth/decorators.js';
import { PrismaService } from '../prisma/prisma.service.js';
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}
  @Publico() @Get('live') live() {
    return { status: 'ok' };
  }
  @Publico() @Get('ready') async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok' };
    } catch {
      throw new ServiceUnavailableException(
        'Serviço temporariamente indisponível.',
      );
    }
  }
}
