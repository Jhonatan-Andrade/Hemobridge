import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { AuditoriaService } from '../auditoria/auditoria.service.js';
import { dataIsoParaDate, hojeIso } from '../common/data.js';
import {
  dataParaIso,
  estimarElegibilidade,
  INTERVALO_MINIMO_DIAS,
  LIMITE_ANUAL_DOACOES,
  somarDias,
} from '../common/elegibilidade.js';
import type { Sexo } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  DoacaoAvulsaDto,
  DoacaoVinculadaDto,
  ListarDoacoesDto,
} from './dto/doacao.dto.js';

export const AVISO_DOACAO_AVULSA =
  'Doação registrada sem vínculo com doador, apenas para fins estatísticos. ' +
  'A elegibilidade, neste caso, é responsabilidade da triagem do hemocentro.';
export const AVISO_NIVEL_NAO_ALTERADO =
  'O registro não altera o nível de necessidade; atualize-o em "Necessidades de estoque" se for o caso.';
export const AVISO_TRIAGEM =
  'A estimativa considera o histórico registrado na plataforma e não substitui a triagem clínica do hemocentro.';

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
      select: {
        usuarioId: true,
        usuario: { select: { nome: true } },
        tipoSanguineo: { select: { sigla: true } },
      },
    });
    if (!paciente) {
      return {
        encontrado: false,
        podeRegistrarAvulsa: true,
        mensagem:
          'Doador não encontrado entre os cadastros aprovados. Você pode registrar uma doação avulsa.',
      };
    }
    return {
      encontrado: true,
      doador: {
        id: paciente.usuarioId,
        nome: paciente.usuario.nome,
        tipo: paciente.tipoSanguineo!.sigla,
      },
    };
  }

  async registrarVinculada(
    hospitalId: string,
    representanteId: string,
    dto: DoacaoVinculadaDto,
  ) {
    if (dto.dataColeta > hojeIso())
      throw new UnprocessableEntityException(
        'A data da coleta não pode ser futura.',
      );

    const doacao = await this.prisma.$transaction(async (tx) => {
      // Serializa registros do mesmo doador, inclusive em hospitais diferentes.
      // A leitura do histórico deve ocorrer depois da aquisição do bloqueio.
      // Mantém a mesma ordem de bloqueios do processamento de privacidade.
      await tx.$queryRaw`SELECT id FROM usuario WHERE id = ${dto.pacienteId}::uuid FOR UPDATE`;
      await tx.$queryRaw`SELECT usuario_id FROM paciente WHERE usuario_id = ${dto.pacienteId}::uuid FOR UPDATE`;
      const paciente = await tx.paciente.findUnique({
        where: { usuarioId: dto.pacienteId },
        select: {
          usuarioId: true,
          situacao: true,
          dataNascimento: true,
          sexo: true,
          tipoSanguineoId: true,
          tipoSanguineo: { select: { sigla: true } },
          usuario: { select: { nome: true, status: true } },
          doacoes: {
            select: { dataColeta: true, doouAntesDos60Confirmado: true },
            orderBy: { dataColeta: 'asc' },
          },
        },
      });
      if (
        !paciente ||
        paciente.situacao !== 'APROVADO' ||
        paciente.usuario.status !== 'ATIVO' ||
        !paciente.tipoSanguineoId ||
        !paciente.tipoSanguineo
      ) {
        throw new UnprocessableEntityException(
          'A doação vinculada exige um doador ativo, aprovado e com tipagem validada.',
        );
      }

      const datas = paciente.doacoes.map((d) => dataParaIso(d.dataColeta));
      const elegibilidade = estimarElegibilidade(
        {
          dataNascimento: dataParaIso(paciente.dataNascimento),
          sexo: paciente.sexo,
          pesoKg: dto.pesoAferido,
          doacoes: datas.filter((data) => data <= dto.dataColeta),
          doouAntesDos60Confirmado:
            dto.doouAntesDos60Confirmado === true ||
            paciente.doacoes.some(
              (registro) => registro.doouAntesDos60Confirmado === true,
            ),
        },
        dto.dataColeta,
      );
      if (!elegibilidade.elegivel) {
        throw new UnprocessableEntityException({
          message: `${elegibilidade.mensagem}${elegibilidade.proximaData ? ` Próxima data estimada: ${elegibilidade.proximaData}.` : ''}`,
          motivo: elegibilidade.motivo,
          proximaData: elegibilidade.proximaData,
        });
      }
      if (
        elegibilidade.exigeAutorizacaoResponsavel &&
        !dto.autorizacaoResponsavelConfirmada
      ) {
        throw new UnprocessableEntityException({
          message:
            'Para doadores menores de 18 anos, confirme que a autorização formal do responsável foi apresentada na triagem.',
          motivo: 'AUTORIZACAO_RESPONSAVEL',
        });
      }
      validarCronologiaPosterior(datas, dto.dataColeta, paciente.sexo);

      const criada = await tx.doacao.create({
        data: {
          hospitalId,
          pacienteId: paciente.usuarioId,
          tipoSanguineoId: paciente.tipoSanguineoId,
          dataColeta: dataIsoParaDate(dto.dataColeta),
          pesoAferido: dto.pesoAferido,
          doouAntesDos60Confirmado:
            dto.doouAntesDos60Confirmado === true ? true : null,
          registradoPorId: representanteId,
        },
        select: {
          id: true,
          dataColeta: true,
          pesoAferido: true,
          registradaEm: true,
        },
      });
      await this.auditoria.registrarEm(tx, {
        usuarioId: representanteId,
        acao: 'REGISTRAR_DOACAO_VINCULADA',
        entidade: 'doacao',
        entidadeId: criada.id,
        detalhes: {
          autorizacaoResponsavelConfirmada:
            elegibilidade.exigeAutorizacaoResponsavel &&
            dto.autorizacaoResponsavelConfirmada === true,
          doouAntesDos60Confirmado: dto.doouAntesDos60Confirmado === true,
        },
      });
      return {
        ...criada,
        tipo: paciente.tipoSanguineo.sigla,
        doador: { id: paciente.usuarioId, nome: paciente.usuario.nome },
      };
    });

    return {
      mensagem: 'Doação vinculada registrada.',
      avisos: [AVISO_TRIAGEM, AVISO_NIVEL_NAO_ALTERADO],
      doacao: {
        id: doacao.id,
        avulsa: false,
        doador: doacao.doador,
        tipo: doacao.tipo,
        dataColeta: dataParaIso(doacao.dataColeta),
        pesoAferido: doacao.pesoAferido!.toNumber(),
        registradaEm: doacao.registradaEm,
      },
    };
  }

  // FA01 passos 2 e 3.
  async registrarAvulsa(
    hospitalId: string,
    representanteId: string,
    { dataColeta, tipo }: DoacaoAvulsaDto,
  ) {
    // FE03
    if (dataColeta > hojeIso())
      throw new UnprocessableEntityException(
        'A data da coleta não pode ser futura.',
      );

    const { id: tipoSanguineoId } =
      await this.prisma.tipoSanguineo.findUniqueOrThrow({
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
        select: {
          id: true,
          dataColeta: true,
          registradaEm: true,
          tipoSanguineo: { select: { sigla: true } },
        },
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

  // Doações do próprio hospital, da coleta mais recente.
  async listar(
    hospitalId: string,
    { de, ate, pagina, tamanhoPagina }: ListarDoacoesDto,
  ) {
    const where = {
      hospitalId,
      dataColeta: {
        gte: de ? dataIsoParaDate(de) : undefined,
        lte: ate ? dataIsoParaDate(ate) : undefined,
      },
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

/** Uma inclusão retroativa também não pode tornar inválida uma coleta já registrada depois dela. */
function validarCronologiaPosterior(
  datas: string[],
  coleta: string,
  sexo: Sexo,
) {
  const posteriores = datas.filter((data) => data > coleta);
  const proxima = posteriores[0];
  if (proxima && somarDias(coleta, INTERVALO_MINIMO_DIAS[sexo]) > proxima) {
    throw new UnprocessableEntityException({
      message: `A data informada não respeita o intervalo de ${INTERVALO_MINIMO_DIAS[sexo]} dias até a doação já registrada em ${proxima}.`,
      motivo: 'INTERVALO',
    });
  }
  const limite = LIMITE_ANUAL_DOACOES[sexo];
  for (const data of posteriores.filter(
    (data) => data < somarDias(coleta, 365),
  )) {
    const inicio = somarDias(data, -365);
    if (datas.filter((d) => d > inicio && d <= data).length + 1 > limite) {
      throw new UnprocessableEntityException({
        message: `A inclusão ultrapassaria o limite de ${limite} doações em 12 meses no histórico registrado em ${data}.`,
        motivo: 'LIMITE_ANUAL',
      });
    }
  }
}
