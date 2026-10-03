import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { FatorRh, GrupoAbo, PrismaClient } from '../src/generated/prisma/client.js';
import { isCpfValido, normalizarCpf } from '../src/common/cpf.js';
import { gerarHashSenha } from '../src/common/senha.js';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env['DATABASE_URL']! }),
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

async function main() {
  await seedTiposSanguineos();
  await seedAdministradorInicial();
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
