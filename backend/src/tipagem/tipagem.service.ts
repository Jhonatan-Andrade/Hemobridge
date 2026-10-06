import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

export const AVISO_COMPATIBILIDADE =
  'Informação educativa sobre doação de concentrado de hemácias. Não substitui a orientação do serviço de hemoterapia.';

@Injectable()
export class TipagemService {
  constructor(private readonly prisma: PrismaService) {}

  // RN01
  listarTipos() {
    return this.prisma.tipoSanguineo.findMany({
      select: { sigla: true, grupoAbo: true, fatorRh: true },
      orderBy: { id: 'asc' },
    });
  }

  // UC04 / RN05: para cada tipo, para quem pode doar e de quem pode receber.
  async compatibilidade() {
    const tipos = await this.prisma.tipoSanguineo.findMany({
      select: {
        sigla: true,
        doaPara: { select: { tipoReceptor: { select: { id: true, sigla: true } } } },
        recebeDe: { select: { tipoDoador: { select: { id: true, sigla: true } } } },
      },
      orderBy: { id: 'asc' },
    });

    const siglasOrdenadas = (lista: { id: number; sigla: string }[]) =>
      lista.sort((a, b) => a.id - b.id).map((t) => t.sigla);

    return {
      aviso: AVISO_COMPATIBILIDADE,
      tipos: tipos.map((t) => ({
        sigla: t.sigla,
        podeDoarPara: siglasOrdenadas(t.doaPara.map((c) => c.tipoReceptor)),
        podeReceberDe: siglasOrdenadas(t.recebeDe.map((c) => c.tipoDoador)),
      })),
    };
  }
}
