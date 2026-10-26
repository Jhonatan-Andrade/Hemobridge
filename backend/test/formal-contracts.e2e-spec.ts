import 'reflect-metadata';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerStorage } from '@nestjs/throttler';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { ArmazenamentoService } from '../src/armazenamento/armazenamento.service.js';
import { EmailService } from '../src/email/email.service.js';
import { entrar, prismaTeste } from './apoio/app.js';
import { responderPreTriagemTeste } from './apoio/pre-triagem.js';
import {
  criarDisponibilidade,
  criarHospital,
  criarMedico,
  criarPaciente,
  criarRepresentante,
  definirNivel,
  tipoId,
} from './apoio/fixtures.js';

// API, autenticação, validação, transações e triggers reais em PostgreSQL
// descartável. S3 e envio de e-mail não fazem parte destes cinco contratos.
describe('Contratos formais: permissões, histórico, concorrência e proximidade', () => {
  const db = prismaTeste();
  let app: INestApplication<App>;
  const api = () => request(app.getHttpServer());

  beforeAll(async () => {
    process.env.NOTIFICACOES_REENVIO_MINUTOS = '0';
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ArmazenamentoService)
      .useValue({ enviar: vi.fn(), obter: vi.fn(), remover: vi.fn() })
      .overrideProvider(EmailService)
      .useValue({ enviar: vi.fn().mockResolvedValue(undefined) })
      .overrideProvider(ThrottlerStorage)
      .useValue({
        increment: async () => ({
          totalHits: 1,
          timeToExpire: 60,
          isBlocked: false,
          timeToBlockExpire: 0,
        }),
      })
      .compile();
    app = module.createNestApplication<INestApplication<App>>();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
    await db.$disconnect();
  });

  it('PT09: rejeita tipagem enviada pelo paciente e preserva a validação médica', async () => {
    const hospital = await criarHospital(db);
    const rep = await criarRepresentante(db, hospital.id);
    const doctor = await criarMedico(db, hospital.id, rep.id);
    const patient = await criarPaciente(db, {
      situacao: 'APROVADO',
      tipo: 'O+',
      medicoId: doctor.id,
    });
    const token = await entrar(app, patient.email);
    const before = await db.paciente.findUniqueOrThrow({
      where: { usuarioId: patient.id },
    });
    const validProfile = {
      telefone: '41999990000',
      pesoKg: 76,
      cidade: 'Curitiba',
      estado: 'PR',
    };
    const desiredTypeId = await tipoId(db, 'AB-');

    for (const forbidden of [
      { tipoSanguineoId: desiredTypeId },
      { bloodType: 'AB-' },
      { tipoSanguineo: 'AB-' },
    ]) {
      await api()
        .patch('/paciente/perfil')
        .auth(token, { type: 'bearer' })
        .send({ ...validProfile, ...forbidden })
        .expect(400);
    }

    const after = await db.paciente.findUniqueOrThrow({
      where: { usuarioId: patient.id },
    });
    expect(after).toMatchObject({
      tipoSanguineoId: before.tipoSanguineoId,
      medicoValidadorId: doctor.id,
      validadoEm: before.validadoEm,
      pesoKg: before.pesoKg,
      situacao: 'APROVADO',
    });
    const profile = await api()
      .get('/paciente/perfil')
      .auth(token, { type: 'bearer' })
      .expect(200);
    expect(profile.body.bloodType).toBe('O+');

    // Controle positivo: o mesmo usuário consegue alterar os dados permitidos.
    const saved = await api()
      .patch('/paciente/perfil')
      .auth(token, { type: 'bearer' })
      .send(validProfile)
      .expect(200);
    expect(saved.body).toMatchObject({ bloodType: 'O+', weight: '76' });
  });

  it('PT11: persiste nível anterior, novo, responsável e instante no histórico', async () => {
    const hospital = await criarHospital(db);
    const rep = await criarRepresentante(db, hospital.id);
    const token = await entrar(app, rep.email);
    const update = (nivel: string) =>
      api()
        .put('/representante/necessidades')
        .auth(token, { type: 'bearer' })
        .send({ niveis: [{ tipo: 'O+', nivel }] })
        .expect(200);

    await update('BAIXO');
    const key = {
      hospitalId_tipoSanguineoId: {
        hospitalId: hospital.id,
        tipoSanguineoId: await tipoId(db, 'O+'),
      },
    };
    const need = await db.necessidadeEstoque.findUniqueOrThrow({ where: key });
    const beforeCount = await db.historicoNecessidade.count({
      where: { necessidadeId: need.id },
    });
    const startedAt = new Date();
    const response = await update('CRITICO');
    const finishedAt = new Date();
    expect(response.body.alteracoes).toEqual([
      { tipo: 'O+', de: 'BAIXO', para: 'CRITICO' },
    ]);

    const current = await db.necessidadeEstoque.findUniqueOrThrow({
      where: key,
    });
    const history = await db.historicoNecessidade.findMany({
      where: { necessidadeId: need.id },
      orderBy: { id: 'asc' },
    });
    expect(history).toHaveLength(beforeCount + 1);
    const transition = history.at(-1)!;
    expect(transition).toMatchObject({
      nivelAnterior: 'BAIXO',
      nivelNovo: 'CRITICO',
      alteradoPorId: rep.id,
      alteradoEm: current.atualizadoEm,
    });
    expect(transition.alteradoEm.getTime()).toBeGreaterThanOrEqual(
      startedAt.getTime(),
    );
    expect(transition.alteradoEm.getTime()).toBeLessThanOrEqual(
      finishedAt.getTime(),
    );
    expect(current).toMatchObject({
      nivel: 'CRITICO',
      atualizadoPorId: rep.id,
    });

    const read = await api()
      .get('/representante/necessidades/historico')
      .auth(token, { type: 'bearer' })
      .query({ tipo: 'O+' })
      .expect(200);
    expect(read.body.itens).toContainEqual({
      tipo: 'O+',
      de: 'BAIXO',
      para: 'CRITICO',
      alteradoPor: rep.nome,
      alteradoEm: transition.alteradoEm.toISOString(),
    });

    // Repetir o mesmo valor não inventa uma nova transição.
    expect((await update('CRITICO')).body.alteracoes).toEqual([]);
    expect(
      await db.historicoNecessidade.count({
        where: { necessidadeId: need.id },
      }),
    ).toBe(beforeCount + 1);
  });

  it('PT16: recusa hospital alheio no payload e não altera seus níveis ou histórico', async () => {
    const a = await criarHospital(db);
    const b = await criarHospital(db);
    const repA = await criarRepresentante(db, a.id);
    const repB = await criarRepresentante(db, b.id);
    await definirNivel(db, a.id, 'O-', 'BAIXO', repA.id);
    await definirNivel(db, b.id, 'O-', 'ESTAVEL', repB.id);
    const tokenA = await entrar(app, repA.email);
    const beforeA = await db.necessidadeEstoque.findMany({
      where: { hospitalId: a.id },
      orderBy: { tipoSanguineoId: 'asc' },
    });
    const beforeB = await db.necessidadeEstoque.findMany({
      where: { hospitalId: b.id },
      orderBy: { tipoSanguineoId: 'asc' },
    });
    const bNeed = beforeB.find(
      (n) =>
        n.tipoSanguineoId ===
        beforeA.find((r) => r.nivel === 'BAIXO')?.tipoSanguineoId,
    )!;
    const bHistoryBefore = await db.historicoNecessidade.findMany({
      where: { necessidadeId: bNeed.id },
      orderBy: { id: 'asc' },
    });

    await api()
      .put('/representante/necessidades')
      .auth(tokenA, { type: 'bearer' })
      .send({ hospitalId: b.id, niveis: [{ tipo: 'O-', nivel: 'CRITICO' }] })
      .expect(400);
    await api()
      .put('/representante/necessidades')
      .auth(tokenA, { type: 'bearer' })
      .send({
        niveis: [{ tipo: 'O-', nivel: 'CRITICO', necessidadeId: bNeed.id }],
      })
      .expect(400);

    expect(
      await db.necessidadeEstoque.findMany({
        where: { hospitalId: a.id },
        orderBy: { tipoSanguineoId: 'asc' },
      }),
    ).toEqual(beforeA);
    const own = await api()
      .put('/representante/necessidades')
      .auth(tokenA, { type: 'bearer' })
      .send({ niveis: [{ tipo: 'O-', nivel: 'ADEQUADO' }] })
      .expect(200);
    expect(own.body.hospital.id).toBe(a.id);
    expect(
      await db.necessidadeEstoque.findMany({
        where: { hospitalId: b.id },
        orderBy: { tipoSanguineoId: 'asc' },
      }),
    ).toEqual(beforeB);
    expect(
      await db.historicoNecessidade.findMany({
        where: { necessidadeId: bNeed.id },
        orderBy: { id: 'asc' },
      }),
    ).toEqual(bHistoryBefore);
  });

  it('PT04: duas reservas HTTP concorrentes deixam somente uma consulta e desfazem a perdedora', async () => {
    const hospital = await criarHospital(db);
    const rep = await criarRepresentante(db, hospital.id);
    const doctor = await criarMedico(db, hospital.id, rep.id);
    const patients = await Promise.all([criarPaciente(db), criarPaciente(db)]);
    const tokens = await Promise.all(
      patients.map((patient) => entrar(app, patient.email)),
    );
    const slot = await criarDisponibilidade(db, doctor.id, 48);
    const triagens = await Promise.all(tokens.map(token => responderPreTriagemTeste(app, token)));
    const results = await Promise.all(
      tokens.map((token, index) =>
        api()
          .post('/paciente/agendamentos')
          .auth(token, { type: 'bearer' })
          .send({ disponibilidadeId: slot.id, aceiteTelemedicina: true, preTriagemId: triagens[index] })
          .then((response) => response),
      ),
    );
    expect(results.map((r) => r.status).sort((a, b) => a - b)).toEqual([
      201, 409,
    ]);
    const winner = results.findIndex((r) => r.status === 201);
    const loser = 1 - winner;
    expect(results[loser].body.message).toMatch(/Horário ocupado/);
    const consultations = await db.consulta.findMany({
      where: { disponibilidadeId: slot.id },
    });
    expect(consultations).toHaveLength(1);
    expect(consultations[0]).toMatchObject({
      id: results[winner].body.id,
      pacienteId: patients[winner].id,
      status: 'AGENDADA',
    });
    const states = await Promise.all(
      patients.map((patient) =>
        db.paciente.findUniqueOrThrow({ where: { usuarioId: patient.id } }),
      ),
    );
    expect(states[winner].situacao).toBe('CONSULTA_AGENDADA');
    expect(states[loser].situacao).toBe('PRE_CADASTRADO');
  });

  it('PT18: usa o tipo validado e prioriza necessidade antes do desempate por distância', async () => {
    const city = `Cidade PT ${randomUUID().slice(0, 8)}`;
    const positions = [
      { nome: 'Z Crítico perto', latitude: -25.44, nivel: 'CRITICO' },
      { nome: 'A Crítico longe', latitude: -25.63, nivel: 'CRITICO' },
      { nome: 'B Baixo muito perto', latitude: -25.4301, nivel: 'BAIXO' },
    ] as const;
    const hospitals = [];
    for (const position of positions) {
      const hospital = await criarHospital(db, {
        cidade: city,
        estado: 'PR',
        latitude: position.latitude,
        longitude: -49.27,
        nome: position.nome,
      });
      const rep = await criarRepresentante(db, hospital.id);
      await definirNivel(db, hospital.id, 'O-', position.nivel, rep.id);
      hospitals.push({ ...hospital, representativeId: rep.id });
    }
    const unrelated = await criarHospital(db, { cidade: city, estado: 'PR' });
    const unrelatedRep = await criarRepresentante(db, unrelated.id);
    await definirNivel(db, unrelated.id, 'AB+', 'CRITICO', unrelatedRep.id);
    const doctor = await criarMedico(
      db,
      hospitals[0].id,
      hospitals[0].representativeId,
    );
    const donor = await criarPaciente(db, {
      situacao: 'APROVADO',
      tipo: 'O-',
      medicoId: doctor.id,
      cidade: city,
    });
    const token = await entrar(app, donor.email);
    const defaults = await api()
      .get('/hospitais/filtros-padrao')
      .auth(token, { type: 'bearer' })
      .expect(200);
    expect(defaults.body).toEqual({
      cidade: city,
      estado: 'PR',
      tipos: ['O-'],
    });

    const listed = await api()
      .get('/hospitais')
      .auth(token, { type: 'bearer' })
      .query({ ...defaults.body, tipos: 'O-', lat: -25.43, lng: -49.27 })
      .expect(200);
    expect(listed.body.total).toBe(3);
    expect(listed.body.itens.map((h: { id: string }) => h.id)).toEqual(
      hospitals.map((h) => h.id),
    );
    const distances = listed.body.itens.map(
      (h: { distanciaKm: number }) => h.distanciaKm,
    );
    expect(distances[0]).toBeGreaterThan(0);
    expect(distances[1]).toBeGreaterThan(distances[0]);
    expect(distances[2]).toBeLessThan(distances[0]);
    expect(listed.body.itens[0].necessidades).toContainEqual({
      tipo: 'O-',
      nivel: 'CRITICO',
    });
  });
});
