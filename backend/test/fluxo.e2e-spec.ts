/**
 * Fluxo completo contra um PostgreSQL real: paciente agenda → médico registra a
 * doação → Admin do hemocentro ativa a conta → o hemocentro B enxerga o registro
 * feito no A. Cobre também a concorrência de vagas (sem overbooking).
 *
 * O banco é APAGADO no início. Rode só contra um banco descartável, com as
 * migrations aplicadas:
 *   E2E_DATABASE_URL=postgresql://usuario:senha@localhost:5440/banco_de_teste npm run test:e2e
 * Sem E2E_DATABASE_URL os testes são ignorados.
 */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerStorage } from '@nestjs/throttler';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { somarDias, hojeIso } from '../src/common/data.js';

const URL_BANCO = process.env['E2E_DATABASE_URL'];
const SENHA = 'SenhaForte1';
const NOVA_SENHA = 'NovaSenha9';

// CPFs válidos (dígitos verificadores) só para o teste.
function cpf(base: string): string {
  const dv = (d: string) => {
    const resto = (d.split('').reduce((s, n, i) => s + Number(n) * (d.length + 1 - i), 0) * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  const d1 = dv(base);
  return `${base}${d1}${dv(base + d1)}`;
}

describe.skipIf(!URL_BANCO)('Fluxo paciente → médico → admin (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: import('../src/prisma/prisma.service.js').PrismaService;
  const emails: { para: string; texto: string }[] = [];
  const api = () => request(app.getHttpServer());
  const autorizado = (token: string) => ({ Authorization: `Bearer ${token}` });

  const senhaProvisoriaDe = (email: string) =>
    emails.filter((e) => e.para === email).at(-1)!.texto.match(/Senha provisória: (\S+)/)![1];

  async function entrar(email: string, senha = SENHA) {
    const r = await api().post('/api/auth/login').send({ email, senha }).expect(200);
    return r.body.accessToken as string;
  }

  /** Conta criada por terceiros: entra com a senha provisória e conclui o primeiro acesso. */
  async function primeiroAcesso(email: string) {
    const provisoria = await entrar(email, senhaProvisoriaDe(email));
    const termo = await api().get('/api/auth/primeiro-acesso/termo').set(autorizado(provisoria)).expect(200);
    const r = await api()
      .post('/api/auth/primeiro-acesso')
      .set(autorizado(provisoria))
      .send({ novaSenha: NOVA_SENHA, confirmacaoSenha: NOVA_SENHA, aceiteTermo: true, versaoTermo: termo.body.versao })
      .expect(200);
    return r.body.accessToken as string;
  }

  async function cadastrarPaciente(n: number) {
    const email = `paciente${n}@teste.local`;
    const termo = await api().get('/api/auth/termo-consentimento').expect(200);
    await api()
      .post('/api/auth/register')
      .send({
        nome: `Paciente ${n}`,
        cpf: cpf(`2000000${String(n).padStart(2, '0')}`),
        email,
        senha: SENHA,
        confirmacaoSenha: SENHA,
        telefone: '41999990000',
        dataNascimento: '1990-01-01',
        sexo: 'MASCULINO',
        aceiteTermo: true,
        versaoTermo: termo.body.versao,
      })
      .expect(201);
    const token = await entrar(email);
    const me = await api().get('/api/auth/me').set(autorizado(token)).expect(200);
    return { id: me.body.id as string, email, token };
  }

  const amanha = somarDias(hojeIso(), 1);

  // Estado compartilhado entre os passos do fluxo (executados em ordem).
  const ctx = {} as {
    admin: string;
    hemoA: string;
    hemoB: string;
    adminA: string;
    adminB: string;
    medicoA: string;
    medicoB: string;
    paciente: { id: string; email: string; token: string };
    horarioA: string;
    agendamentoA: string;
  };

  beforeAll(async () => {
    process.env['DATABASE_URL'] = URL_BANCO;
    process.env['JWT_SECRET'] ??= 'segredo-somente-para-teste-e2e';
    const { AppModule } = await import('../src/app.module.js');
    const { EmailService } = await import('../src/email/email.service.js');
    const { PrismaService } = await import('../src/prisma/prisma.service.js');
    const { gerarHashSenha } = await import('../src/common/senha.js');

    const modulo = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(EmailService)
      .useValue({ enviar: async (m: { para: string; texto: string }) => void emails.push(m) })
      // Sem limite de requisições: o teste faz muitos logins e cadastros seguidos.
      .overrideProvider(ThrottlerStorage)
      .useValue({ increment: async () => ({ totalHits: 1, timeToExpire: 60, isBlocked: false, timeToBlockExpire: 0 }) })
      .compile();

    app = modulo.createNestApplication();
    // Mesma configuração do main.ts.
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    // Um único servidor escutando: as requisições simultâneas reaproveitam a mesma porta.
    await app.listen(0, '127.0.0.1');

    prisma = app.get(PrismaService);
    await prisma.$executeRawUnsafe(`TRUNCATE auditoria, doacao, agendamento, horario, necessidade, consentimento_lgpd,
      paciente, equipe_hemocentro, usuario, hemocentro, tipo_sanguineo RESTART IDENTITY CASCADE`);
    const tipos = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    await prisma.tipoSanguineo.createMany({
      data: tipos.map((sigla) => ({
        sigla,
        grupoAbo: sigla.replace(/[+-]/, '') as 'A' | 'B' | 'AB' | 'O',
        fatorRh: sigla.endsWith('+') ? ('POSITIVO' as const) : ('NEGATIVO' as const),
      })),
    });
    await prisma.usuario.create({
      data: {
        nome: 'Admin Plataforma',
        email: 'admin@teste.local',
        cpf: cpf('300000001'),
        senhaHash: await gerarHashSenha(SENHA),
        perfil: 'ADMIN_PLATAFORMA',
      },
    });
  }, 60_000);

  afterAll(async () => {
    await app?.close();
  });

  it('administrador da plataforma cadastra os hemocentros A e B com seus Admins (RF15)', async () => {
    ctx.admin = await entrar('admin@teste.local');
    const criar = (letra: string, cnpj: string, n: string) =>
      api()
        .post('/api/hemocentros')
        .set(autorizado(ctx.admin))
        .send({
          nome: `Hemocentro ${letra}`,
          cnpj,
          endereco: 'Rua Teste, 100',
          cidade: letra === 'A' ? 'Curitiba' : 'Londrina',
          estado: 'PR',
          cep: '80010000',
          telefone: '4130000000',
          admin: { nome: `Admin ${letra}`, cpf: cpf(n), email: `admin.${letra.toLowerCase()}@teste.local`, telefone: '41999990001' },
        })
        .expect(201);

    ctx.hemoA = (await criar('A', '11222333000181', '300000002')).body.hemocentro.id;
    ctx.hemoB = (await criar('B', '11444777000161', '300000003')).body.hemocentro.id;
    ctx.adminA = await primeiroAcesso('admin.a@teste.local');
    ctx.adminB = await primeiroAcesso('admin.b@teste.local');

    const me = await api().get('/api/auth/me').set(autorizado(ctx.adminA)).expect(200);
    expect(me.body).toMatchObject({ perfil: 'EQUIPE', papel: 'ADMIN_HEMOCENTRO', hemocentro: { id: ctx.hemoA } });
  });

  it('cada Admin cadastra o médico do seu hemocentro (RF14)', async () => {
    for (const [token, email, n] of [
      [ctx.adminA, 'medico.a@teste.local', '300000004'],
      [ctx.adminB, 'medico.b@teste.local', '300000005'],
    ]) {
      await api()
        .post('/api/equipe')
        .set(autorizado(token))
        .send({ nome: `Médico ${email}`, cpf: cpf(n), email, telefone: '41999990002' })
        .expect(201);
    }
    ctx.medicoA = await primeiroAcesso('medico.a@teste.local');
    ctx.medicoB = await primeiroAcesso('medico.b@teste.local');

    // Médico não gerencia equipe nem horários (RNF03).
    await api().get('/api/equipe').set(autorizado(ctx.medicoA)).expect(403);
    await api().post('/api/horarios').set(autorizado(ctx.medicoA)).send({}).expect(403);
  });

  it('Admin informa necessidades só do próprio hemocentro e a página Doar destaca o tipo (RF17 / RF18)', async () => {
    await api()
      .put(`/api/hemocentros/${ctx.hemoA}/necessidades`)
      .set(autorizado(ctx.adminA))
      .send({ niveis: [{ tipo: 'O+', nivel: 'URGENTE' }, { tipo: 'A-', nivel: 'ESTAVEL' }] })
      .expect(200);
    await api()
      .put(`/api/hemocentros/${ctx.hemoB}/necessidades`)
      .set(autorizado(ctx.adminA))
      .send({ niveis: [{ tipo: 'O+', nivel: 'ESTAVEL' }] })
      .expect(403);

    const necessidades = await api().get(`/api/hemocentros/${ctx.hemoA}/necessidades`).expect(200);
    expect(necessidades.body.necessidades).toHaveLength(8);
    expect(necessidades.body.necessidades.find((n: { tipo: string }) => n.tipo === 'O+').nivel).toBe('URGENTE');

    const lista = await api().get('/api/hemocentros').query({ tipo: 'O+' }).expect(200);
    expect(lista.body.itens[0]).toMatchObject({ id: ctx.hemoA, precisaDoTipo: true });
    expect(lista.body.itens[1]).toMatchObject({ id: ctx.hemoB, precisaDoTipo: false });

    const busca = await api().get('/api/hemocentros').query({ busca: 'londrina' }).expect(200);
    expect(busca.body.itens.map((h: { id: string }) => h.id)).toEqual([ctx.hemoB]);
  });

  it('Admin cria horários com vagas, inclusive em lote semanal (RF08)', async () => {
    const r = await api()
      .post('/api/horarios')
      .set(autorizado(ctx.adminA))
      .send({ data: amanha, horaInicio: '10:00', horaFim: '11:00', vagasTotal: 1 })
      .expect(201);
    ctx.horarioA = r.body.horario.id;

    await api()
      .post('/api/horarios')
      .set(autorizado(ctx.adminA))
      .send({ data: amanha, horaInicio: '10:00', horaFim: '12:00', vagasTotal: 3 })
      .expect(409);

    const lote = await api()
      .post('/api/horarios/lote')
      .set(autorizado(ctx.adminA))
      .send({ diaSemana: 0, horaInicio: '13:00', horaFim: '17:00', vagasTotal: 6, semanas: 4, aPartirDe: somarDias(hojeIso(), 1) })
      .expect(201);
    expect(lote.body.criados).toBe(4);

    const publico = await api().get(`/api/hemocentros/${ctx.hemoA}/horarios`).expect(200);
    expect(publico.body.horarios.find((h: { id: string }) => h.id === ctx.horarioA)).toMatchObject({
      vagasTotal: 1,
      vagasRestantes: 1,
      disponivel: true,
    });
  });

  it('agendamentos simultâneos não ultrapassam as vagas (RF09 / RNF06)', async () => {
    const vagas = 3;
    const { body } = await api()
      .post('/api/horarios')
      .set(autorizado(ctx.adminA))
      .send({ data: amanha, horaInicio: '15:00', horaFim: '16:00', vagasTotal: vagas })
      .expect(201);
    const horarioId = body.horario.id;

    const pacientes = await Promise.all(Array.from({ length: 10 }, (_, i) => cadastrarPaciente(i + 10)));
    const respostas = await Promise.all(
      pacientes.map((p) => api().post('/api/agendamentos').set(autorizado(p.token)).send({ horarioId })),
    );

    const sucesso = respostas.filter((r) => r.status === 201);
    const esgotado = respostas.filter((r) => r.status === 409);
    expect(sucesso).toHaveLength(vagas);
    expect(esgotado).toHaveLength(pacientes.length - vagas);
    expect(esgotado[0].body.message).toMatch(/esgotado/);
    expect(await prisma.agendamento.count({ where: { horarioId, status: 'AGENDADO' } })).toBe(vagas);

    // Cancelar libera a vaga para quem não conseguiu (RF07).
    const quemConseguiu = pacientes[respostas.indexOf(sucesso[0])];
    const quemNao = pacientes[respostas.indexOf(esgotado[0])];
    await api()
      .patch(`/api/agendamentos/${sucesso[0].body.agendamento.id}/cancelar`)
      .set(autorizado(quemConseguiu.token))
      .expect(200);
    await api().post('/api/agendamentos').set(autorizado(quemNao.token)).send({ horarioId }).expect(201);
    await api().post('/api/agendamentos').set(autorizado(quemConseguiu.token)).send({ horarioId }).expect(409);
  }, 60_000);

  it('paciente agenda no hemocentro A; outro paciente encontra o horário esgotado (RF06)', async () => {
    ctx.paciente = await cadastrarPaciente(1);
    const outro = await cadastrarPaciente(2);

    const r = await api()
      .post('/api/agendamentos')
      .set(autorizado(ctx.paciente.token))
      .send({ horarioId: ctx.horarioA })
      .expect(201);
    ctx.agendamentoA = r.body.agendamento.id;
    await api().post('/api/agendamentos').set(autorizado(outro.token)).send({ horarioId: ctx.horarioA }).expect(409);
    await api().post('/api/agendamentos').set(autorizado(ctx.paciente.token)).send({ horarioId: ctx.horarioA }).expect(409);

    const painel = await api().get('/api/pacientes/me/painel').set(autorizado(ctx.paciente.token)).expect(200);
    expect(painel.body).toMatchObject({ situacao: 'PENDENTE', tipoSanguineo: null });
    expect(painel.body.proximosAgendamentos[0]).toMatchObject({ id: ctx.agendamentoA, hemocentro: { id: ctx.hemoA } });

    const publico = await api().get(`/api/hemocentros/${ctx.hemoA}/horarios`).expect(200);
    expect(publico.body.horarios.find((h: { id: string }) => h.id === ctx.horarioA)).toMatchObject({
      vagasRestantes: 0,
      disponivel: false,
    });
  });

  it('no dia, o médico de A vê o paciente na agenda e registra a doação (RF10 / RF11)', async () => {
    // O dia do atendimento chega: o horário passa a ser hoje.
    await prisma.horario.update({ where: { id: ctx.horarioA }, data: { data: new Date(`${hojeIso()}T00:00:00Z`) } });

    const agenda = await api().get('/api/agenda').query({ data: hojeIso() }).set(autorizado(ctx.medicoA)).expect(200);
    const horario = agenda.body.horarios.find((h: { id: string }) => h.id === ctx.horarioA);
    expect(horario.agendamentos[0]).toMatchObject({
      id: ctx.agendamentoA,
      paciente: { id: ctx.paciente.id, ultimaDoacao: null },
      doacao: null,
    });

    // O médico de B não registra atendimento de A (RNF04).
    await api()
      .post('/api/doacoes')
      .set(autorizado(ctx.medicoB))
      .send({ agendamentoId: ctx.agendamentoA, compareceu: true, doou: true, tipoSanguineo: 'O+' })
      .expect(404);

    const r = await api()
      .post('/api/doacoes')
      .set(autorizado(ctx.medicoA))
      .send({ agendamentoId: ctx.agendamentoA, compareceu: true, doou: true, tipoSanguineo: 'O+', observacoes: 'Sem intercorrências' })
      .expect(201);
    expect(r.body.doacao).toMatchObject({ doou: true, tipoSanguineo: 'O+' });

    await api()
      .post('/api/doacoes')
      .set(autorizado(ctx.medicoA))
      .send({ agendamentoId: ctx.agendamentoA, compareceu: true, doou: true })
      .expect(409);
  });

  it('o Admin de A ativa a conta e o tipo sanguíneo aparece no painel (RF13 / RF04)', async () => {
    // O Admin de B não vê o paciente como pendente: a doação não é dele.
    const pendentesB = await api().get('/api/pacientes/pendentes-ativacao').set(autorizado(ctx.adminB)).expect(200);
    expect(pendentesB.body.itens).toEqual([]);
    await api().patch(`/api/pacientes/${ctx.paciente.id}/ativar`).set(autorizado(ctx.adminB)).expect(404);

    const pendentes = await api().get('/api/pacientes/pendentes-ativacao').set(autorizado(ctx.adminA)).expect(200);
    expect(pendentes.body.itens).toEqual([
      expect.objectContaining({ id: ctx.paciente.id, doacao: expect.objectContaining({ tipoSanguineo: 'O+' }) }),
    ]);
    await api().patch(`/api/pacientes/${ctx.paciente.id}/ativar`).set(autorizado(ctx.adminA)).expect(200);
    await api().patch(`/api/pacientes/${ctx.paciente.id}/ativar`).set(autorizado(ctx.adminA)).expect(409);

    const painel = await api().get('/api/pacientes/me/painel').set(autorizado(ctx.paciente.token)).expect(200);
    expect(painel.body).toMatchObject({ situacao: 'ATIVA', tipoSanguineo: 'O+' });
    expect(painel.body.doacoes[0]).toMatchObject({ resultado: 'DOOU', hemocentro: { id: ctx.hemoA, nome: 'Hemocentro A' } });
  });

  it('o hemocentro B só vê o histórico depois de o paciente agendar lá, e o acesso é auditado (RF12)', async () => {
    // Sem agendamento em B: não há busca livre por paciente.
    await api().get(`/api/pacientes/${ctx.paciente.id}/historico`).set(autorizado(ctx.medicoB)).expect(404);

    const horarioB = async (data: string) =>
      (
        await api()
          .post('/api/horarios')
          .set(autorizado(ctx.adminB))
          .send({ data, horaInicio: '09:00', horaFim: '10:00', vagasTotal: 5 })
          .expect(201)
      ).body.horario.id as string;

    // Doou hoje: como homem, só volta a doar daqui a 60 dias, em qualquer hemocentro.
    const cedo = await api()
      .post('/api/agendamentos')
      .set(autorizado(ctx.paciente.token))
      .send({ horarioId: await horarioB(amanha) })
      .expect(409);
    expect(cedo.body.message).toMatch(/60 dias para homens/);
    await api()
      .post('/api/agendamentos')
      .set(autorizado(ctx.paciente.token))
      .send({ horarioId: await horarioB(somarDias(hojeIso(), 60)) })
      .expect(201);
    const painel = await api().get('/api/pacientes/me/painel').set(autorizado(ctx.paciente.token)).expect(200);
    expect(painel.body).toMatchObject({ sexo: 'MASCULINO', proximaDoacaoPermitida: somarDias(hojeIso(), 60) });

    const historico = await api()
      .get(`/api/pacientes/${ctx.paciente.id}/historico`)
      .set(autorizado(ctx.medicoB))
      .expect(200);
    expect(historico.body.paciente).toMatchObject({ id: ctx.paciente.id, tipoSanguineo: 'O+', situacao: 'ATIVA' });
    expect(historico.body.doacoes).toEqual([
      expect.objectContaining({
        hemocentro: expect.objectContaining({ id: ctx.hemoA, nome: 'Hemocentro A' }),
        doMeuHemocentro: false,
        tipoSanguineo: 'O+',
        observacoes: 'Sem intercorrências',
      }),
    ]);

    const medicoB = await prisma.usuario.findUniqueOrThrow({ where: { email: 'medico.b@teste.local' } });
    expect(
      await prisma.auditoria.count({
        where: { usuarioId: medicoB.id, acao: 'VER_HISTORICO_COMPARTILHADO', entidadeId: ctx.paciente.id, hemocentroId: ctx.hemoB },
      }),
    ).toBe(1);

    // Paciente não lê histórico pela rota da equipe.
    await api().get(`/api/pacientes/${ctx.paciente.id}/historico`).set(autorizado(ctx.paciente.token)).expect(403);
  });

  it('paciente exclui os dados: conta encerrada, doações mantidas sem identificação (RF16)', async () => {
    await api().post('/api/pacientes/me/exclusao').set(autorizado(ctx.paciente.token)).send({ senha: 'Errada123' }).expect(403);
    await api().post('/api/pacientes/me/exclusao').set(autorizado(ctx.paciente.token)).send({ senha: SENHA }).expect(200);

    await api().get('/api/pacientes/me/painel').set(autorizado(ctx.paciente.token)).expect(401);
    await api().post('/api/auth/login').send({ email: ctx.paciente.email, senha: SENHA }).expect(401);

    const usuario = await prisma.usuario.findUniqueOrThrow({ where: { id: ctx.paciente.id } });
    expect(usuario).toMatchObject({ cpf: null, telefone: null, status: 'ENCERRADO', nome: 'Titular removido' });
    expect(await prisma.doacao.count({ where: { pacienteId: ctx.paciente.id } })).toBe(1);
    expect(await prisma.agendamento.count({ where: { pacienteId: ctx.paciente.id, status: 'AGENDADO' } })).toBe(0);
  });
});
