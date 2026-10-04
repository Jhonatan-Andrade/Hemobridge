import 'dotenv/config';
import { FatorRh, GrupoAbo, NivelNecessidade, PrismaClient } from '../src/generated/prisma/client.js';
import { isCpfValido, normalizarCpf } from '../src/common/cpf.js';
import { gerarHashSenha } from '../src/common/senha.js';
import { criarAdapterPg } from '../src/prisma/adapter.js';
import { MENSAGEM_SENHA_INVALIDA, isSenhaValida } from '../src/common/validators.js';

const prisma = new PrismaClient({
  adapter: criarAdapterPg(process.env['DATABASE_URL']!),
});

// RN01
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

// RN05 / Tabela 1 — doador -> receptores (concentrado de hemácias)
const COMPATIBILIDADE: Record<string, string[]> = {
  'O-': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
  'O+': ['O+', 'A+', 'B+', 'AB+'],
  'A-': ['A-', 'A+', 'AB-', 'AB+'],
  'A+': ['A+', 'AB+'],
  'B-': ['B-', 'B+', 'AB-', 'AB+'],
  'B+': ['B+', 'AB+'],
  'AB-': ['AB-', 'AB+'],
  'AB+': ['AB+'],
};

async function seedTiposSanguineos() {
  for (const tipo of TIPOS) {
    await prisma.tipoSanguineo.upsert({
      where: { sigla: tipo.sigla },
      update: { grupoAbo: tipo.grupoAbo, fatorRh: tipo.fatorRh },
      create: tipo,
    });
  }

  const ids = new Map(
    (await prisma.tipoSanguineo.findMany()).map((t) => [t.sigla, t.id]),
  );
  const pares = Object.entries(COMPATIBILIDADE).flatMap(([doador, receptores]) =>
    receptores.map((receptor) => ({
      tipoDoadorId: ids.get(doador)!,
      tipoReceptorId: ids.get(receptor)!,
    })),
  );
  await prisma.compatibilidadeSanguinea.createMany({
    data: pares,
    skipDuplicates: true,
  });

  console.log(`Tipos sanguíneos: ${ids.size}; pares de compatibilidade: ${pares.length}`);
}

// RN16: o primeiro Administrador é criado por carga inicial.
async function seedAdministradorInicial() {
  const existente = await prisma.usuario.findFirst({
    where: { perfil: 'ADMINISTRADOR' },
  });
  if (existente) {
    console.log('Administrador já existe; nada a fazer.');
    return;
  }

  const { ADMIN_NOME, ADMIN_EMAIL, ADMIN_CPF, ADMIN_SENHA_INICIAL } = process.env;
  if (!ADMIN_NOME || !ADMIN_EMAIL || !ADMIN_CPF || !ADMIN_SENHA_INICIAL) {
    console.warn(
      'ADMIN_NOME, ADMIN_EMAIL, ADMIN_CPF e ADMIN_SENHA_INICIAL não definidos; administrador não criado.',
    );
    return;
  }
  if (!isCpfValido(ADMIN_CPF)) {
    throw new Error('ADMIN_CPF inválido.');
  }
  if (!isSenhaValida(ADMIN_SENHA_INICIAL)) {
    throw new Error(`ADMIN_SENHA_INICIAL inválida: ${MENSAGEM_SENHA_INVALIDA}.`);
  }

  await prisma.usuario.create({
    data: {
      nome: ADMIN_NOME,
      email: ADMIN_EMAIL.trim().toLowerCase(),
      cpf: normalizarCpf(ADMIN_CPF),
      senhaHash: await gerarHashSenha(ADMIN_SENHA_INICIAL),
      // Obriga a troca da senha no primeiro acesso (UC07).
      senhaProvisoria: true,
      perfil: 'ADMINISTRADOR',
    },
  });
  console.log(`Administrador inicial criado: ${ADMIN_EMAIL}`);
}

// Hospitais FICTÍCIOS para desenvolvimento e demonstração (SEED_DADOS_EXEMPLO=true).
// Os níveis não listados ficam como NAO_INFORMADO.
const { CRITICO, BAIXO, ESTAVEL, ADEQUADO } = NivelNecessidade;
const HOSPITAIS_EXEMPLO = [
  {
    nome: 'Hospital Exemplo Centro', cnpj: '00000000000101', cidade: 'Curitiba', estado: 'PR',
    endereco: 'Rua Exemplo, 100 – Centro', cep: '80010000', latitude: -25.4284, longitude: -49.2733,
    niveis: { 'O-': CRITICO, 'O+': BAIXO, 'A+': ESTAVEL, 'A-': BAIXO, 'B+': ADEQUADO, 'AB+': ADEQUADO },
  },
  {
    nome: 'Hemocentro Exemplo Norte', cnpj: '00000000000102', cidade: 'Curitiba', estado: 'PR',
    endereco: 'Avenida Exemplo, 2000 – Cabral', cep: '80035000', latitude: -25.392, longitude: -49.258,
    niveis: { 'O-': ESTAVEL, 'O+': CRITICO, 'A+': CRITICO, 'B-': BAIXO, 'AB-': ESTAVEL },
  },
  {
    nome: 'Hospital Exemplo Londrina', cnpj: '00000000000103', cidade: 'Londrina', estado: 'PR',
    endereco: 'Rua Exemplo, 50 – Centro', cep: '86010000', latitude: -23.3045, longitude: -51.1696,
    niveis: { 'O-': BAIXO, 'O+': ESTAVEL, 'A-': CRITICO, 'B+': BAIXO },
  },
  {
    nome: 'Hospital Exemplo Maringá', cnpj: '00000000000104', cidade: 'Maringá', estado: 'PR',
    endereco: 'Avenida Exemplo, 900 – Zona 7', cep: '87020000', latitude: -23.4205, longitude: -51.9333,
    niveis: { 'O+': ADEQUADO, 'A+': BAIXO, 'AB+': CRITICO },
  },
  {
    nome: 'Hospital Exemplo Paulista', cnpj: '00000000000105', cidade: 'São Paulo', estado: 'SP',
    endereco: 'Avenida Exemplo, 1500 – Bela Vista', cep: '01310000', latitude: -23.5614, longitude: -46.6559,
    niveis: { 'O-': CRITICO, 'O+': CRITICO, 'B-': ESTAVEL },
  },
  {
    nome: 'Hospital Exemplo Desativado', cnpj: '00000000000106', cidade: 'Curitiba', estado: 'PR',
    endereco: 'Rua Exemplo, 1 – Batel', cep: '80420000', latitude: -25.4411, longitude: -49.2869,
    niveis: { 'O-': CRITICO }, ativo: false,
  },
];

async function seedDadosExemplo() {
  const admin = await prisma.usuario.findFirst({ where: { perfil: 'ADMINISTRADOR' } });
  if (!admin) throw new Error('Os dados de exemplo exigem o administrador inicial.');
  const tipos = new Map((await prisma.tipoSanguineo.findMany()).map((t) => [t.sigla, t.id]));

  for (const { niveis, ativo = true, ...dados } of HOSPITAIS_EXEMPLO) {
    const hospital = await prisma.hospital.upsert({
      where: { cnpj: dados.cnpj },
      update: { ...dados, ativo },
      create: {
        ...dados,
        ativo,
        telefone: '4130000000',
        horarioFuncionamento: 'Segunda a sexta, 7h às 18h; sábado, 8h às 12h',
      },
    });
    // As oito linhas de necessidade são criadas pelo trigger do banco.
    for (const [sigla, nivel] of Object.entries(niveis)) {
      await prisma.necessidadeEstoque.update({
        where: { hospitalId_tipoSanguineoId: { hospitalId: hospital.id, tipoSanguineoId: tipos.get(sigla)! } },
        data: { nivel, atualizadoPorId: admin.id, atualizadoEm: new Date() },
      });
    }
  }
  console.log(`Hospitais de exemplo: ${HOSPITAIS_EXEMPLO.length}`);
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
