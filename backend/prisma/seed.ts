import 'dotenv/config';
import { FatorRh, GrupoAbo, NivelNecessidade, PrismaClient } from '../src/generated/prisma/client.js';
import { isCpfValido, normalizarCpf } from '../src/common/cpf.js';
import { dataIsoParaDate, hojeIso, instanteLocal, somarDias } from '../src/common/data.js';
import { diaDaSemana, horaParaTime } from '../src/common/horario.js';
import { gerarHashSenha } from '../src/common/senha.js';
import { TERMO_CONSENTIMENTO } from '../src/lgpd/termo-consentimento.js';
import { criarAdapterPg } from '../src/prisma/adapter.js';
import { MENSAGEM_SENHA_INVALIDA, isSenhaValida } from '../src/common/validators.js';

const prisma = new PrismaClient({
  adapter: criarAdapterPg(process.env['DATABASE_URL']!),
});

// Os oito tipos ABO/Rh.
const TIPOS: { sigla: string; grupoAbo: GrupoAbo; fatorRh: FatorRh }[] = [
  { sigla: 'A+', grupoAbo: GrupoAbo.A, fatorRh: FatorRh.POSITIVO },
  { sigla: 'A-', grupoAbo: GrupoAbo.A, fatorRh: FatorRh.NEGATIVO },
  { sigla: 'B+', grupoAbo: GrupoAbo.B, fatorRh: FatorRh.POSITIVO },
  { sigla: 'B-', grupoAbo: GrupoAbo.B, fatorRh: FatorRh.NEGATIVO },
  { sigla: 'AB+', grupoAbo: GrupoAbo.AB, fatorRh: FatorRh.POSITIVO },
  { sigla: 'AB-', grupoAbo: GrupoAbo.AB, fatorRh: FatorRh.NEGATIVO },
  { sigla: 'O+', grupoAbo: GrupoAbo.O, fatorRh: FatorRh.POSITIVO },
  { sigla: 'O-', grupoAbo: GrupoAbo.O, fatorRh: FatorRh.NEGATIVO },
];

async function seedTiposSanguineos() {
  for (const tipo of TIPOS) {
    await prisma.tipoSanguineo.upsert({
      where: { sigla: tipo.sigla },
      update: { grupoAbo: tipo.grupoAbo, fatorRh: tipo.fatorRh },
      create: tipo,
    });
  }
  console.log(`Tipos sanguíneos: ${TIPOS.length}`);
}

// O primeiro administrador da plataforma é criado por carga inicial.
async function seedAdministradorInicial() {
  const existente = await prisma.usuario.findFirst({ where: { perfil: 'ADMIN_PLATAFORMA' } });
  if (existente) {
    console.log('Administrador da plataforma já existe; nada a fazer.');
    return;
  }

  const { ADMIN_NOME, ADMIN_EMAIL, ADMIN_CPF, ADMIN_SENHA_INICIAL } = process.env;
  if (!ADMIN_NOME || !ADMIN_EMAIL || !ADMIN_CPF || !ADMIN_SENHA_INICIAL) {
    console.warn(
      'ADMIN_NOME, ADMIN_EMAIL, ADMIN_CPF e ADMIN_SENHA_INICIAL não definidos; administrador não criado.',
    );
    return;
  }
  if (!isCpfValido(ADMIN_CPF)) throw new Error('ADMIN_CPF inválido.');
  if (!isSenhaValida(ADMIN_SENHA_INICIAL)) {
    throw new Error(`ADMIN_SENHA_INICIAL inválida: ${MENSAGEM_SENHA_INVALIDA}.`);
  }

  await prisma.usuario.create({
    data: {
      nome: ADMIN_NOME,
      email: ADMIN_EMAIL.trim().toLowerCase(),
      cpf: normalizarCpf(ADMIN_CPF),
      senhaHash: await gerarHashSenha(ADMIN_SENHA_INICIAL),
      // Obriga a troca da senha no primeiro acesso.
      senhaProvisoria: true,
      perfil: 'ADMIN_PLATAFORMA',
    },
  });
  console.log(`Administrador da plataforma criado: ${ADMIN_EMAIL}`);
}

// ---------------------------------------------------------------------------
// Dados FICTÍCIOS para desenvolvimento e demonstração (SEED_DADOS_EXEMPLO=true).
// Dois hemocentros, equipe, horários e um paciente que doou no Hemocentro A e tem
// agendamento no Hemocentro B, que por isso enxerga o histórico compartilhado.
// Todas as contas usam a senha de SEED_SENHA_EXEMPLO.
// ---------------------------------------------------------------------------

/** CPF válido a partir de 9 dígitos (só para dados fictícios). */
function cpfFicticio(base: string): string {
  const dv = (digitos: string) => {
    const soma = digitos.split('').reduce((acc, d, i) => acc + Number(d) * (digitos.length + 1 - i), 0);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  const d1 = dv(base);
  return `${base}${d1}${dv(`${base}${d1}`)}`;
}

const { URGENTE, NECESSARIO, ESTAVEL } = NivelNecessidade;

const HEMOCENTROS_EXEMPLO = [
  {
    chave: 'A',
    dados: {
      nome: 'Hemocentro Exemplo Curitiba', cnpj: '00000000000101', cidade: 'Curitiba', estado: 'PR',
      endereco: 'Rua Exemplo, 100 – Centro', cep: '80010000', telefone: '4130000001',
      horarioFuncionamento: 'Segunda a sábado, 7h às 18h',
    },
    niveis: { 'O-': URGENTE, 'O+': NECESSARIO, 'A+': ESTAVEL, 'A-': NECESSARIO, 'B+': ESTAVEL },
    admin: { nome: 'Ana Admin Curitiba', email: 'admin.curitiba@hemobridge.local', cpf: cpfFicticio('100000001') },
    medico: { nome: 'Dr. Bruno Médico Curitiba', email: 'medico.curitiba@hemobridge.local', cpf: cpfFicticio('100000002') },
  },
  {
    chave: 'B',
    dados: {
      nome: 'Hemocentro Exemplo Londrina', cnpj: '00000000000102', cidade: 'Londrina', estado: 'PR',
      endereco: 'Avenida Exemplo, 2000 – Centro', cep: '86010000', telefone: '4330000002',
      horarioFuncionamento: 'Segunda a sexta, 8h às 17h',
    },
    niveis: { 'O+': URGENTE, 'A+': URGENTE, 'B-': NECESSARIO, 'AB-': ESTAVEL },
    admin: { nome: 'Carla Admin Londrina', email: 'admin.londrina@hemobridge.local', cpf: cpfFicticio('100000003') },
    medico: { nome: 'Dra. Daniela Médica Londrina', email: 'medico.londrina@hemobridge.local', cpf: cpfFicticio('100000004') },
  },
] as const;

const PACIENTE_EXEMPLO = {
  nome: 'Paulo Paciente Exemplo',
  email: 'paciente@hemobridge.local',
  cpf: cpfFicticio('100000005'),
  telefone: '41999990000',
  dataNascimento: '1990-04-12',
  sexo: 'MASCULINO',
} as const;

/** Horários das próximas 4 semanas: quartas 13h–17h (6 vagas) e sábados 8h–12h (10 vagas). */
function proximosHorarios(hemocentroId: string) {
  const hoje = hojeIso();
  const regras = [
    { diaSemana: 3, horaInicio: '13:00', horaFim: '17:00', vagasTotal: 6 },
    { diaSemana: 6, horaInicio: '08:00', horaFim: '12:00', vagasTotal: 10 },
  ];
  return regras.flatMap((r) => {
    const primeira = somarDias(hoje, ((r.diaSemana - diaDaSemana(hoje) + 7) % 7) || 7);
    return Array.from({ length: 4 }, (_, i) => ({
      hemocentroId,
      data: dataIsoParaDate(somarDias(primeira, i * 7)),
      horaInicio: horaParaTime(r.horaInicio),
      horaFim: horaParaTime(r.horaFim),
      vagasTotal: r.vagasTotal,
    }));
  });
}

async function seedDadosExemplo() {
  const senha = process.env['SEED_SENHA_EXEMPLO'];
  if (!senha || !isSenhaValida(senha)) {
    throw new Error(`Defina SEED_SENHA_EXEMPLO para os dados de exemplo (${MENSAGEM_SENHA_INVALIDA}).`);
  }
  const senhaHash = await gerarHashSenha(senha);
  const tipos = new Map((await prisma.tipoSanguineo.findMany()).map((t) => [t.sigla, t.id]));

  const ids: Record<string, { hemocentro: string; admin: string; medico: string }> = {};
  for (const { chave, dados, niveis, admin, medico } of HEMOCENTROS_EXEMPLO) {
    const hemocentro = await prisma.hemocentro.upsert({
      where: { cnpj: dados.cnpj },
      update: { ...dados, ativo: true },
      create: dados,
    });

    const membros = { admin: '', medico: '' };
    for (const [papelChave, pessoa, papel] of [
      ['admin', admin, 'ADMIN_HEMOCENTRO'],
      ['medico', medico, 'MEDICO'],
    ] as const) {
      const usuario = await prisma.usuario.upsert({
        where: { email: pessoa.email },
        update: {},
        create: {
          ...pessoa,
          telefone: dados.telefone,
          senhaHash,
          perfil: 'EQUIPE',
          equipe: { create: { hemocentroId: hemocentro.id, papel } },
        },
      });
      membros[papelChave] = usuario.id;
    }

    for (const [sigla, nivel] of Object.entries(niveis)) {
      const tipoSanguineoId = tipos.get(sigla)!;
      const valores = { nivel, atualizadoPorId: membros.admin, atualizadoEm: new Date() };
      await prisma.necessidade.upsert({
        where: { hemocentroId_tipoSanguineoId: { hemocentroId: hemocentro.id, tipoSanguineoId } },
        update: valores,
        create: { hemocentroId: hemocentro.id, tipoSanguineoId, ...valores },
      });
    }

    await prisma.horario.createMany({ data: proximosHorarios(hemocentro.id), skipDuplicates: true });
    ids[chave] = { hemocentro: hemocentro.id, ...membros };
  }

  const paciente = await prisma.usuario.upsert({
    where: { email: PACIENTE_EXEMPLO.email },
    update: {},
    create: {
      nome: PACIENTE_EXEMPLO.nome,
      email: PACIENTE_EXEMPLO.email,
      cpf: PACIENTE_EXEMPLO.cpf,
      telefone: PACIENTE_EXEMPLO.telefone,
      senhaHash,
      perfil: 'PACIENTE',
      paciente: { create: { dataNascimento: dataIsoParaDate(PACIENTE_EXEMPLO.dataNascimento), sexo: PACIENTE_EXEMPLO.sexo } },
      consentimentos: {
        create: { versaoTermo: TERMO_CONSENTIMENTO.versao, finalidade: TERMO_CONSENTIMENTO.finalidade },
      },
    },
  });

  // Histórico: doou há 70 dias no Hemocentro A (homem: pode voltar a doar depois de 60), que ativou a conta com o tipo O+.
  if (!(await prisma.doacao.count({ where: { pacienteId: paciente.id } }))) {
    const a = ids['A'];
    const passado = await prisma.horario.upsert({
      where: {
        hemocentroId_data_horaInicio: {
          hemocentroId: a.hemocentro,
          data: dataIsoParaDate(somarDias(hojeIso(), -70)),
          horaInicio: horaParaTime('09:00'),
        },
      },
      update: {},
      create: {
        hemocentroId: a.hemocentro,
        data: dataIsoParaDate(somarDias(hojeIso(), -70)),
        horaInicio: horaParaTime('09:00'),
        horaFim: horaParaTime('12:00'),
        vagasTotal: 6,
      },
    });
    const agendamento = await prisma.agendamento.create({
      data: { pacienteId: paciente.id, horarioId: passado.id, status: 'CONCLUIDO' },
    });
    await prisma.doacao.create({
      data: {
        agendamentoId: agendamento.id,
        pacienteId: paciente.id,
        hemocentroId: a.hemocentro,
        medicoId: a.medico,
        compareceu: true,
        doou: true,
        tipoSanguineoId: tipos.get('O+')!,
        observacoes: 'Doação sem intercorrências.',
        registradoEm: instanteLocal(somarDias(hojeIso(), -70), '10:00'),
      },
    });
    await prisma.paciente.update({
      where: { usuarioId: paciente.id },
      data: { situacao: 'ATIVA', tipoSanguineoId: tipos.get('O+')!, ativadoPorId: a.admin, ativadoEm: new Date() },
    });

    // Próximo agendamento no Hemocentro B: a equipe de B passa a ver o histórico de A.
    const proximo = await prisma.horario.findFirstOrThrow({
      where: { hemocentroId: ids['B'].hemocentro, data: { gt: dataIsoParaDate(hojeIso()) } },
      orderBy: [{ data: 'asc' }, { horaInicio: 'asc' }],
    });
    await prisma.agendamento.create({ data: { pacienteId: paciente.id, horarioId: proximo.id } });
  }

  console.log(
    `Dados de exemplo: ${HEMOCENTROS_EXEMPLO.length} hemocentros, equipe e o paciente ${PACIENTE_EXEMPLO.email}`,
  );
}

async function main() {
  await seedTiposSanguineos();
  await seedAdministradorInicial();
  if (process.env['SEED_DADOS_EXEMPLO'] === 'true') {
    await seedDadosExemplo();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
