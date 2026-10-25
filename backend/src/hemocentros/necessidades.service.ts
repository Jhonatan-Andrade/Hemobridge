import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { SIGLAS_TIPOS } from '../common/tipos-sanguineos.js';
import type { NivelNecessidade } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AtualizarNecessidadesDto } from './dto/necessidade.dto.js';

export interface NecessidadeInformada {
  tipo: string;
  nivel: NivelNecessidade;
  atualizadoEm: Date;
}

// RF17 / RF18: nível de necessidade por tipo sanguíneo. Leitura pública; escrita só do
// Admin do próprio hemocentro. Tipo sem registro = não informado (nível nulo).
@Injectable()
export class NecessidadesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Os oito tipos, na ordem de exibição, com o nível atual. */
  async listar(hemocentroId: string) {
    const hemocentro = await this.prisma.hemocentro.findFirst({
      where: { id: hemocentroId, ativo: true },
      select: { id: true, nome: true },
    });
    if (!hemocentro) throw new NotFoundException('Hemocentro não encontrado.');

    const informadas = (await this.porHemocentro([hemocentroId])).get(hemocentroId) ?? [];
    return { hemocentro, ...this.oitoTipos(informadas) };
  }

  async atualizar(
    hemocentroId: string,
    membro: { id: string; hemocentro: { id: string } },
    { niveis }: AtualizarNecessidadesDto,
  ) {
    // O hemocentro vem do vínculo do usuário no banco, nunca só da URL (RNF04).
    if (membro.hemocentro.id !== hemocentroId) {
      throw new ForbiddenException('Você só pode atualizar as necessidades do seu hemocentro.');
    }
    const tipos = niveis.map((n) => n.tipo);
    if (new Set(tipos).size !== tipos.length) {
      throw new BadRequestException('Cada tipo sanguíneo deve aparecer uma única vez.');
    }

    const ids = new Map(
      (await this.prisma.tipoSanguineo.findMany({ where: { sigla: { in: tipos } } })).map((t) => [t.sigla, t.id]),
    );
    const agora = new Date();
    await this.prisma.$transaction(
      niveis.map(({ tipo, nivel }) => {
        const dados = { nivel, atualizadoPorId: membro.id, atualizadoEm: agora };
        const tipoSanguineoId = ids.get(tipo)!;
        return this.prisma.necessidade.upsert({
          where: { hemocentroId_tipoSanguineoId: { hemocentroId, tipoSanguineoId } },
          update: dados,
          create: { hemocentroId, tipoSanguineoId, ...dados },
        });
      }),
    );

    return { mensagem: 'Necessidades atualizadas.', ...(await this.listar(hemocentroId)) };
  }

  /** Necessidades informadas de vários hemocentros, agrupadas por hemocentro. */
  async porHemocentro(ids: string[]) {
    const mapa = new Map<string, NecessidadeInformada[]>();
    if (!ids.length) return mapa;

    const registros = await this.prisma.necessidade.findMany({
      where: { hemocentroId: { in: ids } },
      select: { hemocentroId: true, nivel: true, atualizadoEm: true, tipoSanguineo: { select: { sigla: true } } },
      orderBy: { tipoSanguineoId: 'asc' },
    });
    for (const r of registros) {
      const lista = mapa.get(r.hemocentroId) ?? [];
      lista.push({ tipo: r.tipoSanguineo.sigla, nivel: r.nivel, atualizadoEm: r.atualizadoEm });
      mapa.set(r.hemocentroId, lista);
    }
    return mapa;
  }

  oitoTipos(informadas: NecessidadeInformada[]) {
    const porTipo = new Map(informadas.map((n) => [n.tipo, n]));
    const datas = informadas.map((n) => n.atualizadoEm.getTime());
    return {
      ultimaAtualizacao: datas.length ? new Date(Math.max(...datas)).toISOString() : null,
      necessidades: SIGLAS_TIPOS.map((tipo) => ({
        tipo,
        nivel: porTipo.get(tipo)?.nivel ?? null,
        atualizadoEm: porTipo.get(tipo)?.atualizadoEm.toISOString() ?? null,
      })),
    };
  }
}
