// Medição do RNF08 / PT20 (HEM-34): as consultas principais de bancos de
// sangue, necessidades e locais recomendados devem responder em até 3 s em
// pelo menos 95% das execuções, com base representativa (npm run db:seed:teste).
//
//   npm run desempenho                       # 200 execuções por cenário
//   EXECUCOES=500 npm run desempenho
//   RELATORIO=docs/desempenho-rnf08.md npm run desempenho
//
// Sobe a API compilada (node dist/main.js, como em produção) com o mesmo .env
// e mede cada requisição HTTP. Cada requisição usa um IP de origem diferente
// (X-Forwarded-For com TRUST_PROXY=1), como vários usuários, para o limite por
// IP não interferir.
import 'dotenv/config';
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { cpus, totalmem } from 'node:os';
import { performance } from 'node:perf_hooks';
import { setTimeout as esperar } from 'node:timers/promises';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { criarAdapterPg } from '../src/prisma/adapter.js';

const EXECUCOES = Number(process.env['EXECUCOES'] ?? 200);
const PORTA = Number(process.env['PORTA_MEDICAO'] ?? 3399);
const BASE = `http://127.0.0.1:${PORTA}`;
const LIMITE_MS = 3000;
const META_PERCENTUAL = 95;

interface Resultado {
  cenario: string;
  p50: number;
  p95: number;
  max: number;
  dentroDoLimite: number;
}

const percentil = (ordenados: number[], p: number) =>
  ordenados[Math.min(ordenados.length - 1, Math.ceil((p / 100) * ordenados.length) - 1)];

let ip = 0;
async function http(caminho: string) {
  ip++;
  const r = await fetch(BASE + caminho, {
    headers: { 'X-Forwarded-For': `10.${(ip >> 16) & 255}.${(ip >> 8) & 255}.${ip & 255}` },
  });
  if (!r.ok) throw new Error(`${caminho} respondeu ${r.status}`);
  await r.arrayBuffer();
}

async function subirApi() {
  const api = spawn(process.execPath, ['dist/main.js'], {
    env: { ...process.env, PORT: String(PORTA), TRUST_PROXY: '1', NOTIFICACOES_REENVIO_MINUTOS: '0' },
    stdio: ['ignore', 'ignore', 'inherit'],
  });
  for (let tentativa = 0; tentativa < 60; tentativa++) {
    try {
      await http('/hospitais?tamanhoPagina=1');
      return api;
    } catch {
      await esperar(500);
    }
  }
  api.kill();
  throw new Error('A API não subiu em 30 s (rode npm run build antes).');
}

async function main() {
  const prisma = new PrismaClient({ adapter: criarAdapterPg(process.env['DATABASE_URL']!) });
  const volume = {
    hospitais: await prisma.hospital.count(),
    necessidades: await prisma.necessidadeEstoque.count(),
    historicoNecessidade: await prisma.historicoNecessidade.count(),
    pacientes: await prisma.paciente.count(),
    doadoresAprovados: await prisma.paciente.count({ where: { situacao: 'APROVADO' } }),
    doacoes: await prisma.doacao.count(),
  };
  const ids = (await prisma.hospital.findMany({ where: { ativo: true }, select: { id: true } })).map((h) => h.id);
  if (!ids.length) throw new Error('Base vazia: rode npm run db:seed:teste antes.');
  const doadores = await prisma.paciente.findMany({
    where: { situacao: 'APROVADO' },
    select: { estado: true, cidade: true, tipoSanguineoId: true },
    take: 200,
  });

  let i = 0;
  const proximo = <T>(lista: T[]) => lista[i++ % lista.length];

  // UC17 ainda não tem endpoint (HEM-48); mede a consulta prevista na Seção 9.1.5.
  const locaisRecomendados = async () => {
    const d = proximo(doadores);
    await prisma.$queryRaw`
      SELECT h.id, h.nome, h.cidade, t.sigla, n.nivel, n.atualizado_em
        FROM compatibilidade_sanguinea c
        JOIN necessidade_estoque n ON n.tipo_sanguineo_id = c.tipo_receptor_id
        JOIN hospital h ON h.id = n.hospital_id AND h.ativo
        JOIN tipo_sanguineo t ON t.id = n.tipo_sanguineo_id
       WHERE c.tipo_doador_id = ${d.tipoSanguineoId}::smallint
         AND n.nivel IN ('CRITICO', 'BAIXO', 'ESTAVEL')
       ORDER BY CASE n.nivel WHEN 'CRITICO' THEN 1 WHEN 'BAIXO' THEN 2 ELSE 3 END,
                (n.tipo_sanguineo_id = ${d.tipoSanguineoId}::smallint) DESC,
                (h.cidade = ${d.cidade}) DESC, (h.estado = ${d.estado}) DESC, h.nome
       LIMIT 50`;
  };

  const cenarios: [string, () => Promise<void>][] = [
    ['GET /hospitais (lista pública, UC02)', () => http('/hospitais')],
    ['GET /hospitais?estado=PR&tipos=O- (UC03)', () => http('/hospitais?estado=PR&tipos=O-')],
    [
      'GET /hospitais?estado=SP&cidade=sao paulo&tipos=A+,O+ (UC03)',
      () => http('/hospitais?estado=SP&cidade=sao%20paulo&tipos=A%2B,O%2B'),
    ],
    [
      'GET /hospitais?lat&lng&raioKm=300&tipos=O- (proximidade, RF22)',
      () => http('/hospitais?lat=-25.43&lng=-49.27&raioKm=300&tipos=O-'),
    ],
    ['GET /hospitais/:id (detalhe e necessidades, UC02)', () => http(`/hospitais/${proximo(ids)}`)],
    ['Locais recomendados ao doador (consulta da Seção 9.1.5, UC17)', locaisRecomendados],
  ];

  const api = await subirApi();
  const resultados: Resultado[] = [];
  try {
    for (const [cenario, executar] of cenarios) {
      for (let a = 0; a < 10; a++) await executar(); // aquecimento
      const tempos: number[] = [];
      for (let e = 0; e < EXECUCOES; e++) {
        const t0 = performance.now();
        await executar();
        tempos.push(performance.now() - t0);
      }
      tempos.sort((a, b) => a - b);
      const r = {
        cenario,
        p50: percentil(tempos, 50),
        p95: percentil(tempos, 95),
        max: tempos.at(-1)!,
        dentroDoLimite: (tempos.filter((t) => t <= LIMITE_MS).length / tempos.length) * 100,
      };
      resultados.push(r);
      console.log(`${cenario}: p95 ${r.p95.toFixed(1)} ms`);
    }
  } finally {
    api.kill();
    await prisma.$disconnect();
  }

  const aprovado = resultados.every((r) => r.dentroDoLimite >= META_PERCENTUAL);
  const ms = (v: number) => v.toFixed(1).replace('.', ',');
  const agora = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date());
  const relatorio = [
    '# Medição de desempenho — RNF08 / PT20',
    '',
    `Executado em ${agora} com \`npm run desempenho\` (${EXECUCOES} execuções sequenciais por cenário, após 10 de aquecimento).`,
    '',
    '**Meta (RNF08):** responder em até 3 s em pelo menos 95% das execuções.',
    '',
    `**Resultado: ${aprovado ? 'APROVADO' : 'REPROVADO'}.**`,
    '',
    '| Cenário | p50 (ms) | p95 (ms) | Máximo (ms) | ≤ 3 s |',
    '| --- | ---: | ---: | ---: | ---: |',
    ...resultados.map(
      (r) => `| ${r.cenario} | ${ms(r.p50)} | ${ms(r.p95)} | ${ms(r.max)} | ${r.dentroDoLimite.toFixed(0)}% |`,
    ),
    '',
    '## Ambiente',
    '',
    `- API (build de produção) e banco na mesma máquina: ${cpus().length} vCPU, ${(totalmem() / 1024 ** 3).toFixed(1)} GB de RAM, Node ${process.version}.`,
    '- PostgreSQL 17 + PostGIS 3.5 (Docker), com os índices da migration `indices_consultas_publicas`.',
    '',
    '## Base representativa (`npm run db:seed:teste`)',
    '',
    '| Tabela | Registros |',
    '| --- | ---: |',
    ...Object.entries(volume).map(([k, v]) => `| ${k} | ${v} |`),
    '',
    'O tempo medido inclui a requisição HTTP completa (rota, validação, consulta e serialização),',
    'exceto em "Locais recomendados", que mede a consulta SQL prevista enquanto o endpoint do UC17 (HEM-48) não existe.',
    '',
  ].join('\n');
  console.log('\n' + relatorio);
  if (process.env['RELATORIO']) writeFileSync(process.env['RELATORIO'], relatorio);
  if (!aprovado) process.exitCode = 1;
}

await main();
