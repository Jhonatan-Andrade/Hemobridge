// Massa de dados de TESTE e VALIDAÇÃO. Separado do seed de produção
// (prisma/seed.ts), que só cria tipos sanguíneos, compatibilidade e o admin inicial.
//
//   npm run db:seed:teste                 # escala padrão (PT20 / RNF08)
//   SEED_TESTE_ESCALA=0.2 npm run db:seed:teste   # versão reduzida
//
// Nunca use em produção: todos os dados são sintéticos.
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { Prisma, PrismaClient } from '../src/generated/prisma/client.js';
import type { NivelNecessidade, Sexo, SituacaoPaciente } from '../src/generated/prisma/enums.js';
import { S3ArmazenamentoService } from '../src/armazenamento/s3-armazenamento.service.js';
import { gerarHashSenha } from '../src/common/senha.js';
import { SIGLAS_TIPOS } from '../src/common/tipos-sanguineos.js';
import { criarAdapterPg } from '../src/prisma/adapter.js';

if (process.env['NODE_ENV'] === 'production') {
  throw new Error('seed-teste não pode rodar em produção.');
}
const bancoTeste = new URL(process.env['DATABASE_URL'] ?? 'postgresql://invalid/blocked').pathname;
if (!/_(test|teste|validation)$/.test(bancoTeste)) {
  throw new Error('A carga de testes exige banco com sufixo _test, _teste ou _validation.');
}

const prisma = new PrismaClient({ adapter: criarAdapterPg(process.env['DATABASE_URL']!) });
const ESCALA = Number(process.env['SEED_TESTE_ESCALA'] ?? 1);
const MARCADOR_CNPJ = '99000000000100'; // primeiro hospital: indica que a carga já foi feita

// Contas de validação (documentadas no README). Senha válida pela RN06.
export const SENHA_TESTE = 'Teste2026hb';
const CONTAS_TESTE = {
  administrador: 'admin.teste@hemobridge.local',
  representante: 'representante.teste@hemobridge.local',
  medico: 'medico.teste@hemobridge.local',
  paciente: 'paciente.teste@hemobridge.local',
  doador: 'doador.teste@hemobridge.local',
};

// Gerador pseudoaleatório com semente: a mesma carga a cada execução.
let semente = 20261009;
const aleatorio = () => {
  semente = (semente * 1664525 + 1013904223) % 4294967296;
  return semente / 4294967296;
};
const inteiro = (min: number, max: number) => min + Math.floor(aleatorio() * (max - min + 1));
const escolher = <T>(lista: readonly T[]): T => lista[Math.floor(aleatorio() * lista.length)];

function gerarCpf(): string {
  const base = Array.from({ length: 9 }, () => inteiro(0, 9));
  const dv = (nums: number[]) => {
    const resto = (nums.reduce((acc, d, i) => acc + d * (nums.length + 1 - i), 0) * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  const d1 = dv(base);
  return [...base, d1, dv([...base, d1])].join('');
}

// Cidades reais com coordenadas aproximadas do centro; hospitais sintéticos.
const CIDADES = [
  { cidade: 'Curitiba', estado: 'PR', lat: -25.4284, lng: -49.2733, cep: '80010000', peso: 5 },
  { cidade: 'Londrina', estado: 'PR', lat: -23.3045, lng: -51.1696, cep: '86010000', peso: 2 },
  { cidade: 'Maringá', estado: 'PR', lat: -23.4205, lng: -51.9333, cep: '87013000', peso: 2 },
  { cidade: 'Ponta Grossa', estado: 'PR', lat: -25.0945, lng: -50.1633, cep: '84010000', peso: 1 },
  { cidade: 'Cascavel', estado: 'PR', lat: -24.9555, lng: -53.4552, cep: '85801000', peso: 1 },
  { cidade: 'São Paulo', estado: 'SP', lat: -23.5505, lng: -46.6333, cep: '01001000', peso: 5 },
  { cidade: 'Campinas', estado: 'SP', lat: -22.9056, lng: -47.0608, cep: '13010000', peso: 2 },
  { cidade: 'Florianópolis', estado: 'SC', lat: -27.5949, lng: -48.5482, cep: '88010000', peso: 2 },
  { cidade: 'Joinville', estado: 'SC', lat: -26.3045, lng: -48.8487, cep: '89201000', peso: 1 },
  { cidade: 'Porto Alegre', estado: 'RS', lat: -30.0346, lng: -51.2177, cep: '90010000', peso: 2 },
  { cidade: 'Rio de Janeiro', estado: 'RJ', lat: -22.9068, lng: -43.1729, cep: '20010000', peso: 3 },
  { cidade: 'Belo Horizonte', estado: 'MG', lat: -19.9167, lng: -43.9345, cep: '30110000', peso: 2 },
];
const NOMES = ['Ana', 'Bruno', 'Carla', 'Diego', 'Eduarda', 'Felipe', 'Gabriela', 'Henrique', 'Isabela', 'João', 'Larissa', 'Marcos', 'Natália', 'Otávio', 'Paula', 'Rafael', 'Sofia', 'Thiago', 'Vitória', 'William'];
const SOBRENOMES = ['Silva', 'Souza', 'Oliveira', 'Santos', 'Pereira', 'Costa', 'Ferreira', 'Almeida', 'Ribeiro', 'Carvalho', 'Gomes', 'Martins', 'Rocha', 'Lima'];
const nome = () => `${escolher(NOMES)} ${escolher(SOBRENOMES)} ${escolher(SOBRENOMES)}`;
const NIVEIS_INFORMAVEIS: NivelNecessidade[] = ['CRITICO', 'BAIXO', 'ESTAVEL', 'ADEQUADO'];

const dia = (offset: number) => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + offset);
  return d;
};
const instante = (offsetDias: number, hora = 12) => new Date(dia(offsetDias).getTime() + (hora + 3) * 3_600_000);

async function main() {
  if (await prisma.hospital.findUnique({ where: { cnpj: MARCADOR_CNPJ } })) {
    console.log('A massa de teste já foi carregada neste banco; nada a fazer.');
    return;
  }
  const tipos = new Map((await prisma.tipoSanguineo.findMany()).map((t) => [t.sigla, t.id]));
  if (tipos.size !== 8) throw new Error('Rode antes o seed principal (npm run db:setup).');

  const senhaHash = await gerarHashSenha(SENHA_TESTE);
  const qtdHospitais = Math.max(12, Math.round(40 * ESCALA));
  const qtdPacientes = Math.max(80, Math.round(2000 * ESCALA));

  // --- Administrador de validação ---------------------------------------------
  await prisma.usuario.create({
    data: { nome: 'Administração Teste', email: CONTAS_TESTE.administrador, cpf: gerarCpf(), senhaHash, perfil: 'ADMINISTRADOR' },
  });

  // --- Hospitais, representantes e médicos ----------------------------------------
  const sorteioCidades = CIDADES.flatMap((c) => Array<typeof c>(c.peso).fill(c));
  const hospitais: { id: string; estado: string; cidade: string; repId: string; medicos: string[] }[] = [];
  for (let i = 0; i < qtdHospitais; i++) {
    const c = i < CIDADES.length ? CIDADES[i] : escolher(sorteioCidades);
    const hospital = await prisma.hospital.create({
      data: {
        nome: `${i % 3 === 0 ? 'Hemocentro' : 'Banco de Sangue'} Teste ${c.cidade} ${i + 1}`,
        cnpj: i === 0 ? MARCADOR_CNPJ : `99${String(i).padStart(10, '0')}01`,
        endereco: `Rua de Teste, ${inteiro(10, 3000)}`,
        cidade: c.cidade,
        estado: c.estado,
        cep: c.cep,
        telefone: '4130000000',
        horarioFuncionamento: 'Segunda a sexta, 7h às 18h; sábado, 8h às 12h',
        latitude: new Prisma.Decimal((c.lat + (aleatorio() - 0.5) * 0.08).toFixed(6)),
        longitude: new Prisma.Decimal((c.lng + (aleatorio() - 0.5) * 0.08).toFixed(6)),
        ativo: i !== qtdHospitais - 1, // o último fica desativado (RN09)
      },
    });
    const rep = await prisma.usuario.create({
      data: {
        nome: nome(),
        email: i === 0 ? CONTAS_TESTE.representante : `rep.${i + 1}@teste.hemobridge.local`,
        cpf: gerarCpf(),
        senhaHash,
        perfil: 'REPRESENTANTE',
        representante: { create: { hospitalId: hospital.id, cargo: 'Coordenação do banco de sangue' } },
      },
    });
    const medicos: string[] = [];
    for (let m = 0; m < 2; m++) {
      const medico = await prisma.usuario.create({
        data: {
          nome: `Dr(a). ${nome()}`,
          email: i === 0 && m === 0 ? CONTAS_TESTE.medico : `medico.${i + 1}.${m + 1}@teste.hemobridge.local`,
          cpf: gerarCpf(),
          senhaHash,
          perfil: 'MEDICO',
          medico: {
            create: { hospitalId: hospital.id, crm: String(100000 + i * 10 + m), ufCrm: c.estado, crmConferidoPorId: rep.id },
          },
        },
      });
      medicos.push(medico.id);
    }
    hospitais.push({ id: hospital.id, estado: c.estado, cidade: c.cidade, repId: rep.id, medicos });
  }
  console.log(`Hospitais: ${hospitais.length} (1 desativado), com representante e 2 médicos cada`);

  // --- Necessidades com histórico (RN02/RN03) ---------------------------------------
  // Até 4 rodadas nos últimos 120 dias; cada rodada é um UPDATE que dispara o
  // trigger de histórico com a data da própria rodada.
  const necessidades = await prisma.necessidadeEstoque.findMany({ select: { id: true, hospitalId: true } });
  const doTeste = necessidades.filter((n) => hospitais.some((h) => h.id === n.hospitalId));
  for (const [rodada, diasAtras] of [120, 75, 30, 5].entries()) {
    const linhas = doTeste
      .filter(() => aleatorio() < (rodada === 0 ? 0.9 : 0.45))
      .map((n) => {
        const rep = hospitais.find((h) => h.id === n.hospitalId)!.repId;
        return Prisma.sql`(${n.id}::uuid, ${escolher(NIVEIS_INFORMAVEIS)}::nivel_necessidade, ${rep}::uuid, ${instante(-diasAtras - inteiro(0, 3), inteiro(8, 18))}::timestamptz)`;
      });
    if (!linhas.length) continue;
    await prisma.$executeRaw`
      UPDATE necessidade_estoque n
         SET nivel = v.nivel, atualizado_por = v.rep, atualizado_em = v.em
        FROM (VALUES ${Prisma.join(linhas)}) AS v(id, nivel, rep, em)
       WHERE n.id = v.id`;
  }
  console.log(`Histórico de necessidades: ${await prisma.historicoNecessidade.count({ where: { necessidade: { hospital: { cnpj: { startsWith: '99' } } } } })} alterações`);

  // --- Pacientes em todas as situações (RN10) ---------------------------------------
  const ativos = hospitais.slice(0, -1);
  const situacoes: SituacaoPaciente[] = ['PRE_CADASTRADO', 'CONSULTA_AGENDADA', 'AGUARDANDO_EXAME', 'EM_ANALISE', 'APROVADO', 'REPROVADO'];
  // 70% doadores aprovados (para UC17/UC19/PT20); o resto distribuído nas demais situações.
  const plano = Array.from({ length: qtdPacientes }, (_, i) =>
    i < 8 ? 'APROVADO' : i === 8 ? 'PRE_CADASTRADO' : aleatorio() < 0.7 ? 'APROVADO' : escolher(situacoes.filter((s) => s !== 'APROVADO')),
  ) as SituacaoPaciente[];

  const pacientes: { id: string; situacao: SituacaoPaciente; hospital: (typeof ativos)[number]; tipo?: string; sexo: Sexo; email: string }[] = [];
  const usuarios: Prisma.UsuarioCreateManyInput[] = [];
  const perfis: Prisma.PacienteCreateManyInput[] = [];
  plano.forEach((situacao, i) => {
    const id = randomUUID();
    // O doador de validação fica no hospital do representante/médico de validação.
    const hospital = i === 0 ? ativos[0] : escolher(ativos);
    const sexo: Sexo = aleatorio() < 0.5 ? 'MASCULINO' : 'FEMININO';
    // Os 8 primeiros garantem doadores aprovados de todos os tipos.
    const tipo = situacao === 'APROVADO' ? (i < 8 ? SIGLAS_TIPOS[i] : escolher(SIGLAS_TIPOS)) : undefined;
    const email =
      i === 0 ? CONTAS_TESTE.doador : situacao === 'PRE_CADASTRADO' && !pacientes.some((p) => p.email === CONTAS_TESTE.paciente) ? CONTAS_TESTE.paciente : `paciente.${i + 1}@teste.hemobridge.local`;
    usuarios.push({ id, nome: nome(), email, cpf: gerarCpf(), senhaHash, perfil: 'PACIENTE', telefone: '41990000000', criadoEm: instante(-inteiro(30, 365)) });
    perfis.push({
      usuarioId: id,
      dataNascimento: dia(-365 * inteiro(19, 58) - inteiro(0, 364)),
      sexo,
      pesoKg: new Prisma.Decimal(inteiro(52, 110)),
      cidade: hospital.cidade,
      estado: hospital.estado,
      situacao,
      tipoSanguineoId: tipo ? tipos.get(tipo) : undefined,
      medicoValidadorId: tipo ? hospital.medicos[0] : undefined,
      validadoEm: tipo ? instante(-inteiro(150, 300)) : undefined,
    });
    pacientes.push({ id, situacao, hospital, tipo, sexo, email });
  });
  for (let i = 0; i < usuarios.length; i += 500) {
    await prisma.usuario.createMany({ data: usuarios.slice(i, i + 500) });
    await prisma.paciente.createMany({ data: perfis.slice(i, i + 500) });
  }
  await prisma.consentimentoLgpd.createMany({
    data: pacientes.map((p) => ({ usuarioId: p.id, versaoTermo: '1.0', finalidade: 'Tratamento de dados pessoais sensíveis de saúde (seed de teste)' })),
  });
  console.log(`Pacientes: ${pacientes.length} (${pacientes.filter((p) => p.situacao === 'APROVADO').length} doadores aprovados)`);

  // --- Fluxo clínico coerente com a situação de cada paciente ----------------------
  const armazenamento = criarArmazenamento();
  const pdfExemplo = Buffer.from('%PDF-1.4\n% Resultado de exame sintético para validação\n%%EOF\n');
  let exames = 0;
  // Horários sem sobreposição: cada médico recebe um dia diferente por consulta.
  const passadas = new Map<string, number>();
  const futuras = new Map<string, number>();
  for (const [i, p] of pacientes.entries()) {
    if (p.situacao === 'PRE_CADASTRADO') continue;
    const medicoId = p.hospital.medicos[i % 2];
    const futura = p.situacao === 'CONSULTA_AGENDADA';
    const contador = futura ? futuras : passadas;
    const n = contador.get(medicoId) ?? 0;
    contador.set(medicoId, n + 1);
    const offset = futura ? 2 + n : -(30 + n);
    const inicio = instante(offset, 8 + (n % 10));
    const disp = await prisma.disponibilidadeMedico.create({
      data: {
        medicoId,
        inicio,
        fim: new Date(inicio.getTime() + 30 * 60_000),
        linkVideochamada: `https://meet.teste.hemobridge.local/${randomUUID().slice(0, 8)}`,
      },
    });
    const consulta = await prisma.consulta.create({
      data: {
        pacienteId: p.id,
        medicoId,
        disponibilidadeId: disp.id,
        status: futura ? 'AGENDADA' : 'REALIZADA',
        linkVideochamada: disp.linkVideochamada,
        termoTelemedicinaAceitoEm: new Date(inicio.getTime() - 7 * 86_400_000),
        observacoes: futura ? null : 'Atendimento de teste.',
      },
    });
    if (futura) continue;
    const solicitacao = await prisma.solicitacaoExame.create({
      data: { consultaId: consulta.id, descricao: 'Tipagem sanguínea ABO/Rh', orientacoes: 'Enviar o laudo em PDF.', solicitadoEm: inicio },
    });
    if (p.situacao === 'AGUARDANDO_EXAME') continue;
    const arquivo = armazenamento
      ? await armazenamento.enviar(pdfExemplo, { prefixo: `exames/${p.id}/${solicitacao.id}`, mimeType: 'application/pdf' })
      : { chave: `seed/sem-arquivo/${randomUUID()}`, hashSha256: 'a'.repeat(64), tamanhoBytes: pdfExemplo.length };
    const avaliado = p.situacao === 'APROVADO' || p.situacao === 'REPROVADO';
    await prisma.exame.create({
      data: {
        solicitacaoExameId: solicitacao.id,
        situacao: p.situacao === 'APROVADO' ? 'VALIDADO' : p.situacao === 'REPROVADO' ? 'REPROVADO' : 'EM_ANALISE',
        tipoSanguineoId: p.situacao === 'APROVADO' ? tipos.get(p.tipo!)! : null,
        chaveArmazenamento: arquivo.chave,
        nomeOriginal: 'laudo-tipagem.pdf',
        mimeType: 'application/pdf',
        tamanhoBytes: arquivo.tamanhoBytes,
        hashSha256: arquivo.hashSha256,
        enviadoEm: new Date(inicio.getTime() + 3 * 86_400_000),
        medicoAvaliadorId: avaliado ? medicoId : null,
        avaliadoEm: avaliado ? new Date(inicio.getTime() + 5 * 86_400_000) : null,
        motivoReprovacao: p.situacao === 'REPROVADO' ? 'Laudo ilegível; envie uma cópia nítida.' : null,
      },
    });
    exames++;
  }
  console.log(`Fluxo clínico: consultas, solicitações e ${exames} exames${armazenamento ? ' (arquivos no S3)' : ' (sem S3 configurado)'}`);

  // --- Doações vinculadas e avulsas nos últimos 12 meses (RN11/RN17) ----------------
  const doacoes: Prisma.DoacaoCreateManyInput[] = [];
  for (const p of pacientes.filter((x) => x.situacao === 'APROVADO')) {
    const intervalo = p.sexo === 'MASCULINO' ? 60 : 90;
    let offset = -inteiro(5, 40);
    for (let k = 0; k < inteiro(0, p.sexo === 'MASCULINO' ? 4 : 3) && offset > -365; k++) {
      doacoes.push({
        hospitalId: p.hospital.id,
        pacienteId: p.id,
        tipoSanguineoId: tipos.get(p.tipo!)!,
        dataColeta: dia(offset),
        pesoAferido: new Prisma.Decimal(inteiro(55, 105)),
        registradoPorId: p.hospital.repId,
        registradaEm: instante(offset, 15),
      });
      offset -= intervalo + inteiro(0, 40);
    }
  }
  for (const h of ativos) {
    for (let k = 0; k < Math.round(25 * Math.max(ESCALA, 0.2)); k++) {
      const offset = -inteiro(0, 364);
      doacoes.push({
        hospitalId: h.id,
        tipoSanguineoId: tipos.get(escolher(SIGLAS_TIPOS))!,
        dataColeta: dia(offset),
        registradoPorId: h.repId,
        registradaEm: instante(offset, 16),
      });
    }
  }
  for (let i = 0; i < doacoes.length; i += 1000) await prisma.doacao.createMany({ data: doacoes.slice(i, i + 1000) });
  console.log(`Doações: ${doacoes.length} (${doacoes.filter((d) => !d.pacienteId).length} avulsas)`);

  // --- Notificações de exemplo para o doador de validação ------------------------
  const doadorTeste = pacientes[0];
  const necessidadeCritica = await prisma.necessidadeEstoque.findFirst({
    where: { hospitalId: doadorTeste.hospital.id },
    select: { id: true },
  });
  await prisma.notificacao.createMany({
    data: [
      { usuarioId: doadorTeste.id, titulo: 'Cadastro aprovado', mensagem: 'Seu tipo sanguíneo foi validado. Você já pode ver onde sua doação é mais necessária.', link: '/locais-recomendados', enviadaEm: instante(-150), lidaEm: instante(-149) },
      { usuarioId: doadorTeste.id, necessidadeId: necessidadeCritica?.id, titulo: 'Necessidade crítica de sangue', mensagem: 'Um banco de sangue do seu estado precisa com urgência de um tipo compatível com o seu.', link: `/bancos-de-sangue/${doadorTeste.hospital.id}`, enviadaEm: instante(-1) },
    ],
  });

  console.log('\nContas de validação (senha de todas: %s):', SENHA_TESTE);
  for (const [perfil, email] of Object.entries(CONTAS_TESTE)) console.log(`  ${perfil.padEnd(14)} ${email}`);
}

function criarArmazenamento(): S3ArmazenamentoService | null {
  if (!process.env['S3_ENDPOINT'] || !process.env['ARMAZENAMENTO_CHAVE']) return null;
  return new S3ArmazenamentoService(new ConfigService(process.env));
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
