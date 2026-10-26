import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

export const TOUR_VERSION = 1;

@Injectable()
export class OnboardingService {
  constructor(private readonly prisma: PrismaService) {}

  async concluir(usuarioId: string, versao: unknown) {
    if (versao !== TOUR_VERSION)
      throw new BadRequestException(
        'Reabra a apresentação para concluir a versão atual.',
      );
    await this.prisma.usuario.updateMany({
      where: {
        id: usuarioId,
        status: 'ATIVO',
        senhaProvisoria: false,
        OR: [{ isFirstAccess: true }, { tourVersao: { lt: TOUR_VERSION } }],
      },
      data: {
        isFirstAccess: false,
        tourVersao: TOUR_VERSION,
        tourConcluidoEm: new Date(),
      },
    });
    const user = await this.prisma.usuario.findFirstOrThrow({
      where: { id: usuarioId, status: 'ATIVO', senhaProvisoria: false },
      select: { isFirstAccess: true, tourVersao: true, tourConcluidoEm: true },
    });
    return {
      isFirstAccess: user.isFirstAccess,
      tourVersion: user.tourVersao,
      completedAt: user.tourConcluidoEm,
    };
  }
}
