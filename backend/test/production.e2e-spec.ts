import 'reflect-metadata';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerStorage } from '@nestjs/throttler';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { ArmazenamentoService } from '../src/armazenamento/armazenamento.service.js';
import { EmailService } from '../src/email/email.service.js';
import { entrar, prismaTeste } from './apoio/app.js';
import {
  criarHospital,
  criarAdministrador,
  criarMedico,
  criarPaciente,
  criarRepresentante,
  SENHA_TESTE,
  tipoId,
} from './apoio/fixtures.js';

describe('contratos de produção: comunidade, instituição, estoque e sessão', () => {
  if (
    !/_(validation|test|teste)$/.test(
      new URL(process.env.DATABASE_URL ?? 'postgresql://invalid/blocked')
        .pathname,
    )
  )
    throw new Error(
      'Use exclusivamente um banco descartável com sufixo _validation, _test ou _teste.',
    );
  let app: INestApplication<App>;
  const db = prismaTeste();
  let patientToken: string,
    repToken: string,
    otherToken: string,
    patientId: string,
    patientEmail: string,
    hospitalId: string,
    postId: string,
    bagId: string;
  let representativeId: string;
  const norms = { aceiteNormas: true, versaoNormas: '2026-10' };
  beforeAll(async () => {
    process.env.NOTIFICACOES_REENVIO_MINUTOS = '0';
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ArmazenamentoService)
      .useValue({ enviar: vi.fn(), obter: vi.fn(), remover: vi.fn() })
      .overrideProvider(EmailService)
      .useValue({ enviar: vi.fn() })
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
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    const hospital = await criarHospital(db);
    hospitalId = hospital.id;
    const rep = await criarRepresentante(db, hospital.id),
      patient = await criarPaciente(db),
      otherHospital = await criarHospital(db),
      other = await criarRepresentante(db, otherHospital.id);
    patientId = patient.id;
    representativeId = rep.id;
    patientEmail = patient.email;
    [patientToken, repToken, otherToken] = await Promise.all([
      entrar(app, patient.email),
      entrar(app, rep.email),
      entrar(app, other.email),
    ]);
  });
  afterAll(async () => {
    await app?.close();
    await db.$disconnect();
  });
  it('médico e administrador também publicam e comentam, com selo calculado pelo servidor', async () => {
    const doctor = await criarMedico(db, hospitalId, representativeId);
    const administrator = await criarAdministrador(db);
    for (const [user, role, verified] of [
      [doctor, 'doctor', true],
      [administrator, 'administrator', false],
    ] as const) {
      const token = await entrar(app, user.email);
      const post = await request(app.getHttpServer())
        .post('/comunidade/publicacoes')
        .auth(token, { type: 'bearer' })
        .send({
          titulo: 'Orientações sobre doação de sangue',
          texto:
            'Converse com profissionais autorizados para receber orientações individuais.',
          tema: 'SAUDE',
          ...norms,
        })
        .expect(201);
      expect(post.body).toMatchObject({ role, verified, pinned: false });
      await request(app.getHttpServer())
        .post(`/comunidade/publicacoes/${post.body.id}/comentarios`)
        .auth(token, { type: 'bearer' })
        .send({
          texto: 'Informação geral para uma doação responsável.',
          ...norms,
        })
        .expect(201);
    }
  });
  it('só publica com aceite e nunca aceita selo enviado pelo cliente', async () => {
    const body = {
      titulo: 'Informação sobre doação',
      texto: 'Uma conversa pública sobre saúde e doação de sangue.',
      tema: 'DOACAO',
    };
    await request(app.getHttpServer())
      .post('/comunidade/publicacoes')
      .auth(patientToken, { type: 'bearer' })
      .send(body)
      .expect(400);
    await request(app.getHttpServer())
      .post('/comunidade/publicacoes')
      .auth(patientToken, { type: 'bearer' })
      .send({ ...body, ...norms, verified: true })
      .expect(400);
    const r = await request(app.getHttpServer())
      .post('/comunidade/publicacoes')
      .auth(patientToken, { type: 'bearer' })
      .send({ ...body, ...norms })
      .expect(201);
    postId = r.body.id;
    expect(r.body.verified).toBe(false);
    expect(r.body.role).toBe('patient');
    expect(
      await db.usuario.findUnique({
        where: { id: patientId },
        select: { normasComunidadeVersao: true },
      }),
    ).toMatchObject({ normasComunidadeVersao: '2026-10' });
  });
  it('fixa apenas avisos de instituição verificada e preserva a ordem', async () => {
    const body = {
      ...norms,
      titulo: 'Aviso de necessidade da instituição',
      texto: 'Aviso institucional confirmado para informar a comunidade.',
      tema: 'AVISO_INSTITUCIONAL',
      tipo: 'AVISO_CRITICO',
      fixadaAte: new Date(Date.now() + 3600000).toISOString(),
    };
    await request(app.getHttpServer())
      .post('/comunidade/publicacoes')
      .auth(patientToken, { type: 'bearer' })
      .send(body)
      .expect(403);
    await request(app.getHttpServer())
      .post('/comunidade/publicacoes')
      .auth(repToken, { type: 'bearer' })
      .send(body)
      .expect(403);
    await db.hospital.update({
      where: { id: hospitalId },
      data: {
        verificadoEm: new Date(),
        fonteVerificacao: 'Conferência institucional no ambiente de teste',
      },
    });
    const r = await request(app.getHttpServer())
      .post('/comunidade/publicacoes')
      .auth(repToken, { type: 'bearer' })
      .send(body)
      .expect(201);
    expect(r.body).toMatchObject({ verified: true, pinned: true });
    const feed = await request(app.getHttpServer())
      .get('/comunidade/publicacoes')
      .expect(200);
    expect(feed.body.items[0].id).toBe(r.body.id);
    expect(JSON.stringify(feed.body)).not.toContain(patientEmail);
    await request(app.getHttpServer())
      .post('/comunidade/publicacoes')
      .auth(repToken, { type: 'bearer' })
      .send({ ...body, fixadaAte: new Date(Date.now() - 1000).toISOString() })
      .expect(400);
  });
  it('comentários exigem sessão e aceite, e persistem no banco', async () => {
    const url = `/comunidade/publicacoes/${postId}/comentarios`;
    await request(app.getHttpServer())
      .post(url)
      .send({ texto: 'Conteúdo sobre saúde.', ...norms })
      .expect(401);
    const r = await request(app.getHttpServer())
      .post(url)
      .auth(patientToken, { type: 'bearer' })
      .send({ texto: 'Conteúdo sobre saúde e doação.', ...norms })
      .expect(201);
    expect(
      await db.comentario.count({
        where: { id: r.body.id, autorId: patientId },
      }),
    ).toBe(1);
  });
  it('estoque pertence à instituição e exige liberação técnica', async () => {
    const type = await tipoId(db, 'O+');
    const r = await request(app.getHttpServer())
      .post('/representante/estoque')
      .auth(repToken, { type: 'bearer' })
      .send({
        codigo: `bolsa-${Date.now()}`,
        componente: 'Concentrado de hemácias',
        tipoSanguineoId: type,
        coletadaEm: new Date(Date.now() - 86400000).toISOString(),
        validadeEm: new Date(Date.now() + 86400000).toISOString(),
      })
      .expect(201);
    bagId = r.body.id;
    expect(r.body.status).toBe('QUARENTENA');
    const body = {
      anterior: 'QUARENTENA',
      status: 'DISPONIVEL',
      motivo: 'Liberação pelo serviço técnico',
      liberacaoReferencia: 'registro-tecnico-de-teste',
    };
    await request(app.getHttpServer())
      .patch(`/representante/estoque/${bagId}`)
      .auth(otherToken, { type: 'bearer' })
      .send(body)
      .expect(409);
    await request(app.getHttpServer())
      .patch(`/representante/estoque/${bagId}`)
      .auth(repToken, { type: 'bearer' })
      .send({ ...body, liberacaoReferencia: undefined })
      .expect(400);
    await request(app.getHttpServer())
      .patch(`/representante/estoque/${bagId}`)
      .auth(repToken, { type: 'bearer' })
      .send(body)
      .expect(200);
    const movements = await db.movimentoEstoque.count({
      where: { bolsaId: bagId },
    });
    expect(movements).toBe(2);
    await expect(
      db.movimentoEstoque.deleteMany({ where: { bolsaId: bagId } }),
    ).rejects.toThrow();
  });
  it('cookie web não expõe token e alterações exigem origem autorizada', async () => {
    const agent = request.agent(app.getHttpServer());
    const login = await agent
      .post('/auth/sessao')
      .send({ email: patientEmail, senha: SENHA_TESTE })
      .expect(200);
    expect(login.body.accessToken).toBeUndefined();
    expect(String(login.headers['set-cookie'])).toContain('HttpOnly');
    await agent
      .patch('/paciente/perfil')
      .set('Origin', 'https://outro.example')
      .send({
        telefone: '41999999999',
        pesoKg: 75,
        cidade: 'Curitiba',
        estado: 'PR',
      })
      .expect(403);
    await agent
      .patch('/paciente/perfil')
      .set('Origin', 'http://localhost:5174')
      .send({
        telefone: '41999999999',
        pesoKg: 75,
        cidade: 'Curitiba',
        estado: 'PR',
      })
      .expect(200);
  });
});
