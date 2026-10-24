import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { hojeIso } from '../common/data.js';
import { dataParaIso, estimarElegibilidade } from '../common/elegibilidade.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ConsultarLocaisRecomendadosDto } from './dto/consultar-locais-recomendados.dto.js';

const niveis = ['CRITICO', 'BAIXO', 'ESTAVEL'] as const;
const normalizar = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLocaleLowerCase('pt-BR');

function distanciaKm(
  lat: number,
  lng: number,
  destinoLat: number,
  destinoLng: number,
) {
  const rad = (value: number) => (value * Math.PI) / 180;
  const senoLat = Math.sin(rad(destinoLat - lat) / 2);
  const senoLng = Math.sin(rad(destinoLng - lng) / 2);
  const a =
    senoLat ** 2 +
    Math.cos(rad(lat)) * Math.cos(rad(destinoLat)) * senoLng ** 2;
  return (
    6371.0088 *
    2 *
    Math.atan2(Math.sqrt(Math.min(1, a)), Math.sqrt(Math.max(0, 1 - a)))
  );
}

@Injectable()
export class LocaisRecomendadosService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(usuarioId: string, filtros: ConsultarLocaisRecomendadosDto) {
    if ((filtros.lat === undefined) !== (filtros.lng === undefined)) {
      throw new BadRequestException('Informe lat e lng juntos.');
    }

    const paciente = await this.prisma.paciente.findUnique({
      where: { usuarioId },
      select: {
        situacao: true,
        cidade: true,
        estado: true,
        dataNascimento: true,
        sexo: true,
        pesoKg: true,
        tipoSanguineo: { select: { id: true, sigla: true } },
        doacoes: { select: { dataColeta: true, doouAntesDos60Confirmado: true } },
      },
    });
    if (paciente?.situacao !== 'APROVADO' || !paciente.tipoSanguineo) {
      throw new ForbiddenException(
        'As recomendações de doação ficam disponíveis após a aprovação e validação do seu tipo sanguíneo. Você pode continuar usando a busca pública de locais.',
      );
    }

    const hoje = hojeIso();
    const elegibilidade = estimarElegibilidade(
      {
        dataNascimento: dataParaIso(paciente.dataNascimento),
        sexo: paciente.sexo,
        pesoKg: Number(paciente.pesoKg),
        doacoes: paciente.doacoes.map((doacao) =>
          dataParaIso(doacao.dataColeta),
        ),
        doouAntesDos60Confirmado: paciente.doacoes.some(
          (doacao) => doacao.doouAntesDos60Confirmado === true,
        ),
      },
      hoje,
    );
    const registros = await this.prisma.necessidadeEstoque.findMany({
      where: {
        nivel: { in: [...niveis] },
        hospital: { ativo: true },
        tipoSanguineo: {
          recebeDe: { some: { tipoDoadorId: paciente.tipoSanguineo.id } },
        },
      },
      select: {
        id: true,
        nivel: true,
        atualizadoEm: true,
        tipoSanguineo: { select: { sigla: true } },
        hospital: {
          select: {
            id: true,
            nome: true,
            endereco: true,
            cidade: true,
            estado: true,
            latitude: true,
            longitude: true,
            horarioFuncionamento: true,
          },
        },
      },
    });

    const itens = registros
      .map((registro) => {
        const hospital = {
          ...registro.hospital,
          latitude: Number(registro.hospital.latitude),
          longitude: Number(registro.hospital.longitude),
        };
        const mesmoEstado = hospital.estado === paciente.estado;
        return {
          id: registro.id,
          hospital,
          tipoNecessitado: registro.tipoSanguineo.sigla,
          nivel: registro.nivel,
          atualizadoEm: registro.atualizadoEm?.toISOString() ?? null,
          mesmoTipo:
            registro.tipoSanguineo.sigla === paciente.tipoSanguineo!.sigla,
          mesmaCidade:
            mesmoEstado &&
            normalizar(hospital.cidade) === normalizar(paciente.cidade),
          mesmoEstado,
          distanciaKm:
            filtros.lat !== undefined && filtros.lng !== undefined
              ? distanciaKm(
                  filtros.lat,
                  filtros.lng,
                  hospital.latitude,
                  hospital.longitude,
                )
              : null,
        };
      })
      .sort(
        (a, b) =>
          niveis.indexOf(a.nivel as (typeof niveis)[number]) -
            niveis.indexOf(b.nivel as (typeof niveis)[number]) ||
          Number(b.mesmoTipo) - Number(a.mesmoTipo) ||
          Number(b.mesmaCidade) - Number(a.mesmaCidade) ||
          Number(b.mesmoEstado) - Number(a.mesmoEstado) ||
          (a.distanciaKm ?? 0) - (b.distanciaKm ?? 0) ||
          a.hospital.nome.localeCompare(b.hospital.nome, 'pt-BR') ||
          a.tipoNecessitado.localeCompare(b.tipoNecessitado) ||
          a.id.localeCompare(b.id),
      )
      .map((item) => ({
        ...item,
        distanciaKm:
          item.distanciaKm === null
            ? null
            : Math.round(item.distanciaKm * 10) / 10,
      }));

    return {
      tipoDoador: paciente.tipoSanguineo.sigla,
      referencia: { cidade: paciente.cidade, estado: paciente.estado },
      elegibilidade,
      dataEstimadaElegibilidade: elegibilidade.elegivel
        ? hoje
        : (elegibilidade.proximaData ?? null),
      orientacao:
        'Estimativa baseada nas doações registradas no HemoBridge. A triagem presencial confirma se você pode doar. Confirme atendimento e disponibilidade com a instituição; a distância é aproximada em linha reta.',
      itens,
    };
  }
}
