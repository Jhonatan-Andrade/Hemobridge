import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ConsultarHemocentrosDto } from './dto/hemocentro.dto.js';
import { NecessidadesService } from './necessidades.service.js';

interface LinhaHemocentro {
  id: string;
  nome: string;
  endereco: string;
  cidade: string;
  estado: string;
}

/** Escapa os curingas do LIKE para buscar o texto literalmente. */
const escaparLike = (texto: string) => texto.replace(/[\\%_]/g, (c) => `\\${c}`);

// RF05 / RF18: consulta pública dos hemocentros ativos.
@Injectable()
export class HemocentrosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly necessidades: NecessidadesService,
  ) {}

  async listar({ busca, cidade, tipo, pagina, tamanhoPagina }: ConsultarHemocentrosDto) {
    const condicoes = [Prisma.sql`h.ativo`];
    if (busca) {
      const termo = `%${escaparLike(busca)}%`;
      condicoes.push(Prisma.sql`(unaccent(lower(h.nome)) LIKE unaccent(lower(${termo}))
        OR unaccent(lower(h.cidade)) LIKE unaccent(lower(${termo})))`);
    }
    if (cidade) condicoes.push(Prisma.sql`unaccent(lower(h.cidade)) = unaccent(lower(${cidade}))`);
    const where = Prisma.join(condicoes, ' AND ');

    // RF18: com o tipo do paciente, quem precisa exatamente dele vem primeiro
    // (URGENTE antes de NECESSARIO). Não há regra de compatibilidade.
    const prioridade = tipo
      ? Prisma.sql`(
          SELECT CASE n.nivel WHEN 'URGENTE' THEN 1 WHEN 'NECESSARIO' THEN 2 END
            FROM necessidade n
            JOIN tipo_sanguineo t ON t.id = n.tipo_sanguineo_id
           WHERE n.hemocentro_id = h.id AND t.sigla = ${tipo})`
      : Prisma.sql`NULL::int`;

    const [linhas, [{ total }]] = await Promise.all([
      this.prisma.$queryRaw<LinhaHemocentro[]>`
        SELECT h.id, h.nome, h.endereco, h.cidade, h.estado
          FROM hemocentro h
         WHERE ${where}
         ORDER BY ${prioridade} ASC NULLS LAST, h.nome ASC
         LIMIT ${tamanhoPagina} OFFSET ${(pagina - 1) * tamanhoPagina}`,
      this.prisma.$queryRaw<[{ total: number }]>`
        SELECT COUNT(*)::int AS total FROM hemocentro h WHERE ${where}`,
    ]);

    const necessidades = await this.necessidades.porHemocentro(linhas.map((l) => l.id));
    return {
      itens: linhas.map((l) => {
        const informadas = necessidades.get(l.id) ?? [];
        const doTipo = tipo ? informadas.find((n) => n.tipo === tipo) : undefined;
        return {
          ...l,
          necessidades: informadas.map(({ tipo: t, nivel }) => ({ tipo: t, nivel })),
          // Nulo quando o paciente ainda não tem tipo sanguíneo registrado.
          precisaDoTipo: tipo ? doTipo?.nivel === 'URGENTE' || doTipo?.nivel === 'NECESSARIO' : null,
        };
      }),
      total,
      pagina,
      tamanhoPagina,
    };
  }

  async detalhar(id: string) {
    const hemocentro = await this.prisma.hemocentro.findFirst({
      where: { id, ativo: true },
      select: {
        id: true,
        nome: true,
        endereco: true,
        cidade: true,
        estado: true,
        cep: true,
        telefone: true,
        horarioFuncionamento: true,
      },
    });
    if (!hemocentro) throw new NotFoundException('Hemocentro não encontrado.');

    const informadas = (await this.necessidades.porHemocentro([id])).get(id) ?? [];
    return { ...hemocentro, ...this.necessidades.oitoTipos(informadas) };
  }
}
