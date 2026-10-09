import { randomInt, randomUUID } from 'node:crypto';
import type { PrismaClient } from '../../src/generated/prisma/client.js';
import type { NivelNecessidade, SituacaoPaciente, Sexo } from '../../src/generated/prisma/enums.js';
import { gerarHashSenha } from '../../src/common/senha.js';

// Dados de apoio para testes de integração no banco de desenvolvimento.
// Cada execução usa e-mails, CPFs e CNPJs novos, então os testes não colidem.
export const SENHA_TESTE = 'SenhaTeste123';
const hashSenha = gerarHashSenha(SENHA_TESTE);

export function gerarCpf(): string {
  const base = Array.from({ length: 9 }, () => randomInt(10));
  const dv = (nums: number[]) => {
    const soma = nums.reduce((acc, d, i) => acc + d * (nums.length + 1 - i), 0);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  const d1 = dv(base);
  const d2 = dv([...base, d1]);
  return [...base, d1, d2].join('');
}

export const gerarCnpj = () => Array.from({ length: 14 }, () => randomInt(10)).join('');
const email = (prefixo: string) => `e2e.${prefixo}.${randomUUID().slice(0, 8)}@teste.local`;

export async function tipoId(prisma: PrismaClient, sigla: string) {
  return (await prisma.tipoSanguineo.findUniqueOrThrow({ where: { sigla } })).id;
}

export async function criarHospital(
  prisma: PrismaClient,
  dados: { estado?: string; cidade?: string; latitude?: number; longitude?: number; nome?: string } = {},
) {
  return prisma.hospital.create({
    data: {
      nome: dados.nome ?? `Hospital E2E ${randomUUID().slice(0, 6)}`,
      cnpj: gerarCnpj(),
      endereco: 'Rua dos Testes, 100',
      cidade: dados.cidade ?? 'Curitiba',
      estado: dados.estado ?? 'PR',
      cep: '80000000',
      latitude: dados.latitude ?? -25.43,
      longitude: dados.longitude ?? -49.27,
    },
  });
}

export async function criarRepresentante(prisma: PrismaClient, hospitalId: string) {
  return prisma.usuario.create({
    data: {
      nome: 'Rep E2E',
      email: email('rep'),
      cpf: gerarCpf(),
      senhaHash: await hashSenha,
      perfil: 'REPRESENTANTE',
      representante: { create: { hospitalId } },
    },
  });
}

export async function criarMedico(prisma: PrismaClient, hospitalId: string, conferidoPorId: string) {
  return prisma.usuario.create({
    data: {
      nome: 'Dra. Médica E2E',
      email: email('med'),
      cpf: gerarCpf(),
      senhaHash: await hashSenha,
      perfil: 'MEDICO',
      medico: {
        create: { hospitalId, crm: String(randomInt(100000, 9999999)), ufCrm: 'PR', crmConferidoPorId: conferidoPorId },
      },
    },
  });
}

export async function criarPaciente(
  prisma: PrismaClient,
  dados: {
    situacao?: SituacaoPaciente;
    tipo?: string;
    medicoId?: string;
    estado?: string;
    cidade?: string;
    sexo?: Sexo;
    dataNascimento?: string;
    pesoKg?: number;
    nome?: string;
  } = {},
) {
  const aprovado = dados.situacao === 'APROVADO';
  return prisma.usuario.create({
    data: {
      nome: dados.nome ?? 'Paciente E2E',
      email: email('pac'),
      cpf: gerarCpf(),
      senhaHash: await hashSenha,
      perfil: 'PACIENTE',
      paciente: {
        create: {
          dataNascimento: new Date(`${dados.dataNascimento ?? '1990-05-10'}T00:00:00Z`),
          sexo: dados.sexo ?? 'MASCULINO',
          pesoKg: dados.pesoKg ?? 75,
          cidade: dados.cidade ?? 'Curitiba',
          estado: dados.estado ?? 'PR',
          situacao: dados.situacao ?? 'PRE_CADASTRADO',
          ...(aprovado
            ? {
                tipoSanguineoId: await tipoId(prisma, dados.tipo ?? 'O+'),
                medicoValidadorId: dados.medicoId,
                validadoEm: new Date(),
              }
            : {}),
        },
      },
    },
  });
}

export async function definirNivel(
  prisma: PrismaClient,
  hospitalId: string,
  sigla: string,
  nivel: NivelNecessidade,
  usuarioId: string,
) {
  await prisma.necessidadeEstoque.update({
    where: { hospitalId_tipoSanguineoId: { hospitalId, tipoSanguineoId: await tipoId(prisma, sigla) } },
    data: { nivel, atualizadoPorId: usuarioId, atualizadoEm: new Date() },
  });
}

/** Horário do médico começando daqui a `horas` horas, com 30 minutos. */
export async function criarDisponibilidade(prisma: PrismaClient, medicoId: string, horas: number) {
  const inicio = new Date(Date.now() + horas * 3_600_000);
  return prisma.disponibilidadeMedico.create({
    data: {
      medicoId,
      inicio,
      fim: new Date(inicio.getTime() + 30 * 60_000),
      linkVideochamada: `https://meet.teste.local/${randomUUID().slice(0, 8)}`,
    },
  });
}

/** Consulta AGENDADA (paciente passa a CONSULTA_AGENDADA). */
export async function agendarConsulta(prisma: PrismaClient, pacienteId: string, disponibilidade: { id: string; medicoId: string; linkVideochamada: string }) {
  await prisma.paciente.update({ where: { usuarioId: pacienteId }, data: { situacao: 'CONSULTA_AGENDADA' } });
  return prisma.consulta.create({
    data: {
      pacienteId,
      medicoId: disponibilidade.medicoId,
      disponibilidadeId: disponibilidade.id,
      linkVideochamada: disponibilidade.linkVideochamada,
      termoTelemedicinaAceitoEm: new Date(),
    },
  });
}
