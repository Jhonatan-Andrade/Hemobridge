import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { AuditoriaService } from '../auditoria/auditoria.service.js';
import { dataIsoParaDate, hojeIso } from '../common/data.js';
import { dataParaIso } from '../common/elegibilidade.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { DoacaoAvulsaDto, ListarDoacoesDto } from './dto/doacao.dto.js';

export const AVISO_DOACAO_AVULSA =
  'Doação registrada sem vínculo com doador, apenas para fins estatísticos. ' +
  'A elegibilidade, neste caso, é responsabilidade da triagem do hemocentro.';
export const AVISO_NIVEL_NAO_ALTERADO =
  'O registro não altera o nível de necessidade; atualize-o em "Necessidades de estoque" se for o caso (RN11).';

// UC20 – Registrar Doação (RF18). Sempre no hospital do representante (RN08).
@Injectable()
export class DoacoesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoria: AuditoriaService,
  ) {}

  /**
   * Passos 2 a 4: localiza o doador APROVADO pelo CPF. Se não houver, oferece a
   * doação avulsa (FA01). A resposta não revela se o CPF tem conta em outra situação.
   */
  async buscarDoador(cpf: string) {
    const paciente = await this.prisma.paciente.findFirst({
      where: { situacao: 'APROVADO', usuario: { cpf, status: 'ATIVO' } },
      select: { usuarioId: true, usuario: { select: { nome: true } }, tipoSanguineo: { select: { sigla: true } } },
    });
    if (!paciente) {
      return {
        encontrado: false,
        podeRegistrarAvulsa: true,
        mensagem: 'Doador não encontrado entre os cadastros aprovados. Você pode registrar uma doação avulsa.',
      };
    }
    return {
      encontrado: true,
      doador: { id: paciente.usuarioId, nome: paciente.usuario.nome, tipo: paciente.tipoSanguineo!.sigla },
    };
  }

  // FA01 passos 2 e 3.
  async registrarAvulsa(hospitalId: string, representanteId: string, { dataColeta, tipo }: DoacaoAvulsaDto) {
    // FE03
    if (dataColeta > hojeIso()) throw new UnprocessableEntityException('A data da coleta não pode ser futura.');

    const { id: tipoSanguineoId } = await this.prisma.tipoSanguineo.findUniqueOrThrow({
      where: { sigla: tipo },
      select: { id: true },
    });

    const doacao = await this.prisma.$transaction(async (tx) => {
      const criada = await tx.doacao.create({
        data: {
          hospitalId,
          pacienteId: null,
          tipoSanguineoId,
          dataColeta: dataIsoParaDate(dataColeta),
          registradoPorId: representanteId,
        },
        select: { id: true, dataColeta: true, registradaEm: true, tipoSanguineo: { select: { sigla: true } } },
      });
      await this.auditoria.registrarEm(tx, {
        usuarioId: representanteId,
        acao: 'REGISTRAR_DOACAO_AVULSA',
        entidade: 'doacao',
        entidadeId: criada.id,
      });
      return criada;
    });

    return {
      mensagem: 'Doação avulsa registrada.',
      avisos: [AVISO_DOACAO_AVULSA, AVISO_NIVEL_NAO_ALTERADO],
      doacao: {
        id: doacao.id,
        avulsa: true,
        tipo: doacao.tipoSanguineo.sigla,
        dataColeta: dataParaIso(doacao.dataColeta),
        registradaEm: doacao.registradaEm,
      },
    };
  }

  // Doações do próprio hospital (tela H03), da coleta mais recente.
  async listar(hospitalId: string, { de, ate, pagina, tamanhoPagina }: ListarDoacoesDto) {
    const where = {
      hospitalId,
      dataColeta: { gte: de ? dataIsoParaDate(de) : undefined, lte: ate ? dataIsoParaDate(ate) : undefined },
    };
    const [registros, total] = await Promise.all([
      this.prisma.doacao.findMany({
        where,
        select: {
          id: true,
          dataColeta: true,
          registradaEm: true,
          pesoAferido: true,
          tipoSanguineo: { select: { sigla: true } },
          paciente: { select: { usuario: { select: { nome: true } } } },
          registradoPor: { select: { nome: true } },
        },
        orderBy: [{ dataColeta: 'desc' }, { registradaEm: 'desc' }],
        skip: (pagina - 1) * tamanhoPagina,
        take: tamanhoPagina,
      }),
      this.prisma.doacao.count({ where }),
    ]);

    return {
      itens: registros.map((d) => ({
        id: d.id,
        avulsa: d.paciente === null,
        doador: d.paciente?.usuario.nome ?? null,
        tipo: d.tipoSanguineo.sigla,
        dataColeta: dataParaIso(d.dataColeta),
        pesoAferido: d.pesoAferido?.toNumber() ?? null,
        registradaEm: d.registradaEm,
        registradoPor: d.registradoPor.nome,
      })),
      total,
      pagina,
      tamanhoPagina,
    };
  }
}
