import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

/**
 * RN08 / RNF04: o representante só enxerga e altera dados do próprio banco de
 * sangue. O hospital vem sempre do vínculo no banco, nunca da requisição.
 */
@Injectable()
export class HospitalDoRepresentanteService {
  constructor(private readonly prisma: PrismaService) {}

  async obterId(usuarioId: string): Promise<string> {
    const vinculo = await this.prisma.representanteHospital.findUnique({
      where: { usuarioId },
      select: { hospitalId: true },
    });
    if (!vinculo) throw new ForbiddenException('Conta sem vínculo com banco de sangue.');
    return vinculo.hospitalId;
  }
}
