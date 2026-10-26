import 'reflect-metadata';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerStorage } from '@nestjs/throttler';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { ArmazenamentoService } from '../src/armazenamento/armazenamento.service.js';
import { hojeIso } from '../src/common/data.js';
import { somarDias } from '../src/common/elegibilidade.js';
import { EmailService } from '../src/email/email.service.js';
import { NecessidadeCriticaService } from '../src/notificacoes/necessidade-critica.service.js';
import { entrar, prismaTeste } from './apoio/app.js';
import {
  criarHospital,
  criarMedico,
  criarPaciente,
  criarRepresentante,
  definirNivel,
  registrarDoacao,
  tipoId,
} from './apoio/fixtures.js';

// Requer DATABASE_URL de banco descartável. Não usa S3, SMTP nem banco operacional.
describe('Doações vinculadas: contratos completos da API', () => {
  const db = prismaTeste();
  let app: INestApplication<App>;
  const api = () => request(app.getHttpServer());
  async function contexto(dados: Parameters<typeof criarPaciente>[1] = {}) {
    const hospital = await criarHospital(db);
    const rep = await criarRepresentante(db, hospital.id);
    const medico = await criarMedico(db, hospital.id, rep.id);
    const paciente = await criarPaciente(db, {
      situacao: 'APROVADO',
      tipo: 'O-',
      medicoId: medico.id,
      ...dados,
    });
    return {
      hospital,
      rep,
      medico,
      paciente,
      token: await entrar(app, rep.email),
    };
  }
  const payload = (
    pacienteId: string,
    extras: Record<string, unknown> = {},
  ) => ({ pacienteId, dataColeta: hojeIso(), pesoAferido: 72.5, ...extras });
  const registrar = (token: string, body: Record<string, unknown>) =>
    api()
      .post('/representante/doacoes')
      .auth(token, { type: 'bearer' })
      .send(body);

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
  }, 60_000);
  afterAll(async () => {
    await app?.close();
    await db.$disconnect();
  });

  it('identifica, registra peso/tipagem validada no hospital da sessão, lista e audita sem mudar a necessidade', async () => {
    const { hospital, rep, paciente, token } = await contexto();
    await definirNivel(db, hospital.id, 'O-', 'CRITICO', rep.id);
    const needKey = {
      hospitalId_tipoSanguineoId: {
        hospitalId: hospital.id,
        tipoSanguineoId: await tipoId(db, 'O-'),
      },
    };
    const needBefore = await db.necessidadeEstoque.findUniqueOrThrow({
      where: needKey,
    });
    const historyBefore = await db.historicoNecessidade.count({
      where: { necessidadeId: needBefore.id },
    });
    const found = await api()
      .post('/representante/doacoes/buscar-doador')
      .auth(token, { type: 'bearer' })
      .send({ cpf: paciente.cpf })
      .expect(200);
    expect(found.body.doador).toMatchObject({ id: paciente.id, tipo: 'O-' });

    const response = await registrar(token, payload(paciente.id)).expect(201);
    expect(response.body.doacao).toMatchObject({
      avulsa: false,
      doador: { id: paciente.id, nome: paciente.nome },
      tipo: 'O-',
      pesoAferido: 72.5,
      dataColeta: hojeIso(),
    });
    const saved = await db.doacao.findUniqueOrThrow({
      where: { id: response.body.doacao.id },
    });
    expect(saved).toMatchObject({
      pacienteId: paciente.id,
      hospitalId: hospital.id,
      registradoPorId: rep.id,
      tipoSanguineoId: await tipoId(db, 'O-'),
    });
    expect(saved.pesoAferido?.toNumber()).toBe(72.5);
    expect(
      await db.logAuditoria.count({
        where: {
          entidade: 'doacao',
          entidadeId: saved.id,
          acao: 'REGISTRAR_DOACAO_VINCULADA',
          usuarioId: rep.id,
        },
      }),
    ).toBe(1);
    expect(
      await db.necessidadeEstoque.findUniqueOrThrow({ where: needKey }),
    ).toEqual(needBefore);
    expect(
      await db.historicoNecessidade.count({
        where: { necessidadeId: needBefore.id },
      }),
    ).toBe(historyBefore);
    const listed = await api()
      .get('/representante/doacoes')
      .auth(token, { type: 'bearer' })
      .query({ de: hojeIso(), ate: hojeIso(), tamanhoPagina: 1 })
      .expect(200);
    expect(listed.body.itens).toEqual([
      expect.objectContaining({
        id: saved.id,
        avulsa: false,
        doador: paciente.nome,
        pesoAferido: 72.5,
      }),
    ]);
    const other = await criarRepresentante(db, (await criarHospital(db)).id);
    const otherToken = await entrar(app, other.email);
    expect(
      (
        await api()
          .get('/representante/doacoes')
          .auth(otherToken, { type: 'bearer' })
          .expect(200)
      ).body.total,
    ).toBe(0);
  });

  it('rejeita tipagem/hospital/responsável enviados, peso insuficiente, futuro e doador não aprovado sem gravar avulsa', async () => {
    const { paciente, hospital, token, medico } = await contexto();
    for (const extra of [
      { hospitalId: hospital.id },
      { tipo: 'AB+' },
      { registradoPorId: medico.id },
    ]) {
      await registrar(token, payload(paciente.id, extra)).expect(400);
    }
    await registrar(token, payload(paciente.id, { pesoAferido: 49.9 })).expect(
      422,
    );
    await registrar(
      token,
      payload(paciente.id, { dataColeta: somarDias(hojeIso(), 1) }),
    ).expect(422);
    const unapproved = await criarPaciente(db);
    await registrar(token, payload(unapproved.id)).expect(422);
    expect(await db.doacao.count({ where: { hospitalId: hospital.id } })).toBe(
      0,
    );
    const patientToken = await entrar(app, paciente.email);
    await registrar(patientToken, payload(paciente.id)).expect(403);
  });

  it('exige autorização formal de responsável para menor e conserva a confirmação na auditoria', async () => {
    const { paciente, token } = await contexto({
      dataNascimento: `${Number(hojeIso().slice(0, 4)) - 17}-01-01`,
    });
    await registrar(token, payload(paciente.id)).expect(422);
    const saved = await registrar(
      token,
      payload(paciente.id, { autorizacaoResponsavelConfirmada: true }),
    ).expect(201);
    const audit = await db.logAuditoria.findFirstOrThrow({
      where: {
        entidadeId: saved.body.doacao.id,
        acao: 'REGISTRAR_DOACAO_VINCULADA',
      },
    });
    expect(audit.detalhes).toMatchObject({
      autorizacaoResponsavelConfirmada: true,
    });
    expect(await db.doacao.count({ where: { pacienteId: paciente.id } })).toBe(
      1,
    );
  });

  it('persiste comprovação pré-60 e a reutiliza em recomendações, notificações e nova coleta sem fabricar evidência legada', async () => {
    const { hospital, rep, paciente, token } = await contexto({
      dataNascimento: `${Number(hojeIso().slice(0, 4)) - 63}-01-01`,
    });
    const refusal = await registrar(token, payload(paciente.id)).expect(422);
    expect(refusal.body.motivo).toBe('PRIMEIRA_DOACAO_APOS_60');
    const saved = await registrar(
      token,
      payload(paciente.id, { dataColeta: somarDias(hojeIso(), -100), doouAntesDos60Confirmado: true }),
    ).expect(201);
    const audit = await db.logAuditoria.findFirstOrThrow({
      where: {
        entidadeId: saved.body.doacao.id,
        acao: 'REGISTRAR_DOACAO_VINCULADA',
      },
    });
    expect(audit.detalhes).toMatchObject({ doouAntesDos60Confirmado: true });
    expect(await db.doacao.findUniqueOrThrow({ where: { id: saved.body.doacao.id } })).toMatchObject({
      doouAntesDos60Confirmado: true,
    });
    const pacienteToken = await entrar(app, paciente.email);
    const recommendations = await api().get('/paciente/locais-recomendados')
      .auth(pacienteToken, { type: 'bearer' }).expect(200);
    expect(recommendations.body.elegibilidade.elegivel).toBe(true);
    const orientations = await api().get('/paciente/orientacoes-doacao')
      .auth(pacienteToken, { type: 'bearer' }).expect(200);
    expect(orientations.body.elegivel).toBe(true);
    await definirNivel(db, hospital.id, 'O-', 'CRITICO', rep.id);
    await app.get(NecessidadeCriticaService).notificarDoadores(hospital.id, ['O-']);
    expect(await db.notificacao.count({ where: { usuarioId: paciente.id, necessidade: { hospitalId: hospital.id } } })).toBe(1);
    // A segunda coleta não precisa reafirmar uma confirmação já registrada pela triagem.
    const next = await registrar(token, payload(paciente.id)).expect(201);
    expect(await db.doacao.findUniqueOrThrow({ where: { id: next.body.doacao.id } })).toMatchObject({
      doouAntesDos60Confirmado: null,
    });
    const afterCollection = await api().get('/paciente/locais-recomendados')
      .auth(pacienteToken, { type: 'bearer' }).expect(200);
    expect(afterCollection.body.elegibilidade.motivo).toBe('INTERVALO');
  });

  it('serializa duas coletas concorrentes do mesmo doador em hospitais diferentes sem duplicação', async () => {
    const { paciente, token } = await contexto();
    const otherRep = await criarRepresentante(db, (await criarHospital(db)).id);
    const otherToken = await entrar(app, otherRep.email);
    const results = await Promise.all([
      registrar(token, payload(paciente.id)),
      registrar(otherToken, payload(paciente.id)),
    ]);
    expect(results.map((r) => r.status).sort((a, b) => a - b)).toEqual([
      201, 422,
    ]);
    expect(results.find((r) => r.status === 422)?.body.motivo).toBe(
      'INTERVALO',
    );
    const saved = await db.doacao.findMany({
      where: { pacienteId: paciente.id },
    });
    expect(saved).toHaveLength(1);
    expect(
      await db.logAuditoria.count({
        where: { entidadeId: saved[0].id, acao: 'REGISTRAR_DOACAO_VINCULADA' },
      }),
    ).toBe(1);
  });

  it('recusa inclusão retroativa que viola o intervalo até coleta já existente', async () => {
    const { hospital, rep, paciente, token } = await contexto();
    await registrarDoacao(db, {
      hospitalId: hospital.id,
      representanteId: rep.id,
      pacienteId: paciente.id,
      tipo: 'O-',
      dataColeta: somarDias(hojeIso(), -30),
    });
    const response = await registrar(
      token,
      payload(paciente.id, { dataColeta: somarDias(hojeIso(), -60) }),
    ).expect(422);
    expect(response.body.motivo).toBe('INTERVALO');
    expect(await db.doacao.count({ where: { pacienteId: paciente.id } })).toBe(
      1,
    );
  });

  it('recusa inclusão retroativa que excede frequência em janela posterior e permite uma coleta histórica consistente', async () => {
    const { hospital, rep, paciente, token } = await contexto();
    for (const days of [-280, -210, -140, -70]) {
      await registrarDoacao(db, {
        hospitalId: hospital.id,
        representanteId: rep.id,
        pacienteId: paciente.id,
        tipo: 'O-',
        dataColeta: somarDias(hojeIso(), days),
      });
    }
    const response = await registrar(
      token,
      payload(paciente.id, { dataColeta: somarDias(hojeIso(), -350) }),
    ).expect(422);
    expect(response.body.motivo).toBe('LIMITE_ANUAL');
    expect(await db.doacao.count({ where: { pacienteId: paciente.id } })).toBe(
      4,
    );
    await registrar(
      token,
      payload(paciente.id, { dataColeta: somarDias(hojeIso(), -650) }),
    ).expect(201);
    expect(await db.doacao.count({ where: { pacienteId: paciente.id } })).toBe(
      5,
    );
  });
});
