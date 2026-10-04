import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import type { NivelNecessidade } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ConsultarHospitaisDto } from './dto/consultar-hospitais.dto.js';

interface LinhaHospital {
  id: string;
  nome: string;
  cidade: string;
  estado: string;
  distancia_m: number | null;
}

@Injectable()
export class HospitaisService {
  constructor(private readonly prisma: PrismaService) {}

  // UC02 / UC03 – somente hospitais ativos (RN09).
  async listar(filtros: ConsultarHospitaisDto) {
    const { estado, cidade, tipos, lat, lng, raioKm, pagina, tamanhoPagina } = filtros;
    if ((lat === undefined) !== (lng === undefined)) {
      throw new BadRequestException('Informe lat e lng juntos.');
    }
    if (raioKm !== undefined && lat === undefined) {
      throw new BadRequestException('raioKm exige lat e lng.');
    }

    const ponto =
      lat !== undefined && lng !== undefined
        ? Prisma.sql`ST_SetSRID(ST_MakePoint(${lng}::float8, ${lat}::float8), 4326)::geography`
        : null;

    const condicoes = [Prisma.sql`h.ativo`];
    if (estado) condicoes.push(Prisma.sql`h.estado = ${estado}`);
    if (cidade) condicoes.push(Prisma.sql`unaccent(lower(h.cidade)) = unaccent(lower(${cidade}))`);
    if (ponto && raioKm !== undefined) {
      condicoes.push(Prisma.sql`ST_DWithin(h.localizacao, ${ponto}, ${raioKm * 1000}::float8)`);
    }
    const where = Prisma.join(condicoes, ' AND ');

    // RN02: CRITICO > BAIXO > ESTAVEL > ADEQUADO; NAO_INFORMADO não prioriza.
    const prioridade = tipos?.length
      ? Prisma.sql`(
          SELECT MIN(CASE n.nivel
                       WHEN 'CRITICO' THEN 1 WHEN 'BAIXO' THEN 2
                       WHEN 'ESTAVEL' THEN 3 WHEN 'ADEQUADO' THEN 4 END)
            FROM necessidade_estoque n
            JOIN tipo_sanguineo t ON t.id = n.tipo_sanguineo_id
           WHERE n.hospital_id = h.id AND t.sigla IN (${Prisma.join(tipos)}))`
      : Prisma.sql`NULL::int`;
    const distancia = ponto ? Prisma.sql`ST_Distance(h.localizacao, ${ponto})` : Prisma.sql`NULL::float8`;

    const [linhas, [{ total }]] = await Promise.all([
      this.prisma.$queryRaw<LinhaHospital[]>`
        SELECT h.id, h.nome, h.cidade, h.estado, ${distancia} AS distancia_m
          FROM hospital h
         WHERE ${where}
         ORDER BY ${prioridade} ASC NULLS LAST, distancia_m ASC NULLS LAST, h.nome ASC
         LIMIT ${tamanhoPagina} OFFSET ${(pagina - 1) * tamanhoPagina}`,
      this.prisma.$queryRaw<[{ total: number }]>`
        SELECT COUNT(*)::int AS total FROM hospital h WHERE ${where}`,
    ]);

    const necessidades = await this.necessidadesPorHospital(linhas.map((l) => l.id));

    return {
      itens: linhas.map((l) => ({
        id: l.id,
        nome: l.nome,
        cidade: l.cidade,
        estado: l.estado,
        distanciaKm: l.distancia_m === null ? null : Math.round(l.distancia_m / 100) / 10,
        necessidades: (necessidades.get(l.id) ?? []).map(({ tipo, nivel }) => ({ tipo, nivel })),
      })),
      total,
      pagina,
      tamanhoPagina,
    };
  }

  // UC02 passo 5
  async detalhar(id: string) {
    const hospital = await this.prisma.hospital.findFirst({
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
        latitude: true,
        longitude: true,
      },
    });
    if (!hospital) throw new NotFoundException('Banco de sangue não encontrado.');

    const necessidades = (await this.necessidadesPorHospital([id])).get(id) ?? [];
    const datas = necessidades.flatMap((n) => (n.atualizadoEm ? [n.atualizadoEm.getTime()] : []));

    return {
      ...hospital,
      latitude: hospital.latitude.toNumber(),
      longitude: hospital.longitude.toNumber(),
      necessidades,
      ultimaAtualizacao: datas.length ? new Date(Math.max(...datas)).toISOString() : null,
    };
  }

  private async necessidadesPorHospital(ids: string[]) {
    const mapa = new Map<
      string,
      { tipo: string; nivel: NivelNecessidade; atualizadoEm: Date | null }[]
    >();
    if (!ids.length) return mapa;

    const registros = await this.prisma.necessidadeEstoque.findMany({
      where: { hospitalId: { in: ids } },
      select: {
        hospitalId: true,
        nivel: true,
        atualizadoEm: true,
        tipoSanguineo: { select: { sigla: true } },
      },
      orderBy: { tipoSanguineoId: 'asc' },
    });
    for (const r of registros) {
      const lista = mapa.get(r.hospitalId) ?? [];
      lista.push({ tipo: r.tipoSanguineo.sigla, nivel: r.nivel, atualizadoEm: r.atualizadoEm });
      mapa.set(r.hospitalId, lista);
    }
    return mapa;
  }
}
