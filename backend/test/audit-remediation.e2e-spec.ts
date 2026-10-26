import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { createHmac } from 'node:crypto';
import { decifrar, lerChave } from '../src/armazenamento/cifra.js';
import { EmailService } from '../src/email/email.service.js';
import { AuditoriaService } from '../src/auditoria/auditoria.service.js';
import { NecessidadeCriticaService } from '../src/notificacoes/necessidade-critica.service.js';
import { NecessidadesService } from '../src/representante/necessidades.service.js';
import { NotificacoesService } from '../src/notificacoes/notificacoes.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { entrar, prismaTeste, subirApp } from './apoio/app.js';
import {
  agendarConsulta,
  criarAdministrador,
  criarDisponibilidade,
  criarHospital,
  criarMedico,
  criarPaciente,
  criarRepresentante,
  definirNivel,
  SENHA_TESTE,
} from './apoio/fixtures.js';

describe('Regressões da auditoria: persistência, concorrência e privacidade', () => {
  const db = prismaTeste();
  let app: INestApplication<App>;
  beforeAll(async () => {
    app = await subirApp();
  }, 60_000);
  afterAll(async () => {
    vi.restoreAllMocks();
    await app?.close();
    await db.$disconnect();
  });
  const api = () => request(app.getHttpServer());

  it('tour é versionado, idempotente, persistido por conta e compartilhado entre sessões', async () => {
    const a = await criarPaciente(db),
      b = await criarPaciente(db);
    const [tokenA, tokenB] = await Promise.all([
      entrar(app, a.email),
      entrar(app, b.email),
    ]);
    await api().post('/auth/tour/conclusao').send({ versao: 1 }).expect(401);
    await api()
      .post('/auth/tour/conclusao')
      .auth(tokenA, { type: 'bearer' })
      .send({ versao: 999 })
      .expect(400);
    await api()
      .post('/auth/tour/conclusao')
      .auth(tokenA, { type: 'bearer' })
      .send({ versao: 1, usuarioId: b.id })
      .expect(400);
    expect(
      (await api().get('/auth/me').auth(tokenA, { type: 'bearer' })).body
        .isFirstAccess,
    ).toBe(true);
    await api()
      .post('/auth/tour/conclusao')
      .auth(tokenA, { type: 'bearer' })
      .send({ versao: 1 })
      .expect(200);
    const original = await db.usuario.findUniqueOrThrow({
      where: { id: a.id },
    });
    await api()
      .post('/auth/tour/conclusao')
      .auth(tokenA, { type: 'bearer' })
      .send({ versao: 1 })
      .expect(200);
    expect(
      (await db.usuario.findUniqueOrThrow({ where: { id: a.id } }))
        .tourConcluidoEm,
    ).toEqual(original.tourConcluidoEm);
    const secondDevice = await entrar(app, a.email);
    expect(
      (await api().get('/auth/me').auth(secondDevice, { type: 'bearer' })).body,
    ).toMatchObject({ isFirstAccess: false, tourVersion: 1 });
    expect(
      (await api().get('/auth/me').auth(tokenB, { type: 'bearer' })).body
        .isFirstAccess,
    ).toBe(true);
  });

  it('dois processadores simultâneos respeitam a janela móvel de sete dias da RN20', async () => {
    const h = await criarHospital(db, { estado: 'RR' }),
      r = await criarRepresentante(db, h.id),
      m = await criarMedico(db, h.id, r.id);
    const p = await criarPaciente(db, {
      situacao: 'APROVADO',
      tipo: 'O-',
      medicoId: m.id,
      estado: 'RR',
    });
    await definirNivel(db, h.id, 'O-', 'CRITICO', r.id);
    const notifier = app.get(NotificacoesService);
    const second = new NecessidadeCriticaService(
      app.get(PrismaService),
      notifier,
      app.get(AuditoriaService),
      app.get(ConfigService),
    );
    await Promise.all([
      app.get(NecessidadeCriticaService).notificarDoadores(h.id, ['O-']),
      second.notificarDoadores(h.id, ['O-']),
    ]);
    expect(
      await db.notificacao.count({
        where: { usuarioId: p.id, necessidade: { hospitalId: h.id } },
      }),
    ).toBe(1);
  }, 30_000);

  it('evento crítico sobrevive à falha entre o commit do estoque e o processamento', async () => {
    const h = await criarHospital(db, { estado: 'AC' }),
      r = await criarRepresentante(db, h.id),
      m = await criarMedico(db, h.id, r.id);
    const p = await criarPaciente(db, {
      situacao: 'APROVADO',
      tipo: 'O-',
      medicoId: m.id,
      estado: 'AC',
    });
    const worker = app.get(NecessidadeCriticaService);
    const failure = vi
      .spyOn(worker, 'processarEvento')
      .mockRejectedValueOnce(new Error('Interrupção após commit'));
    await app
      .get(NecessidadesService)
      .atualizar(h.id, r.id, { niveis: [{ tipo: 'O-', nivel: 'CRITICO' }] });
    failure.mockRestore();
    const event = await db.eventoNecessidadeCritica.findFirstOrThrow({
      where: { hospitalId: h.id, processadoEm: null },
    });
    await Promise.all([
      worker.processarEvento(event.id),
      worker.processarEvento(event.id),
    ]);
    expect(
      (
        await db.eventoNecessidadeCritica.findUniqueOrThrow({
          where: { id: event.id },
        })
      ).processadoEm,
    ).not.toBeNull();
    expect(
      await db.notificacao.count({
        where: { usuarioId: p.id, necessidade: { hospitalId: h.id } },
      }),
    ).toBe(1);
  }, 30_000);

  it('reserva de envio impede duplicação concorrente e recupera e-mail nunca tentado ou com reserva expirada', async () => {
    const p = await criarPaciente(db);
    const sent: { assunto: string; texto: string; para: string }[] = [];
    const spy = vi
      .spyOn(app.get(EmailService), 'enviar')
      .mockImplementation(async (msg) => {
        sent.push(msg);
        await new Promise((resolve) => setTimeout(resolve, 15));
      });
    try {
      const n = await db.notificacao.create({
        data: {
          usuarioId: p.id,
          titulo: 'Exame O- pendente',
          mensagem: 'Dados clínicos reservados de teste.',
          emailSolicitado: true,
          enviadaEm: new Date('2000-01-01'),
        },
      });
      const a = app.get(NotificacoesService),
        b = new NotificacoesService(
          app.get(PrismaService),
          app.get(EmailService),
          app.get(ConfigService),
        );
      await Promise.all([a.despacharEmails([n.id]), b.despacharEmails([n.id])]);
      expect(sent.filter((s) => s.para === p.email)).toHaveLength(1);
      expect(sent[0].texto + sent[0].assunto).not.toMatch(/clínic|O-|Exame/i);
      expect(sent[0].texto).toContain('/#notifications');
      const never = await db.notificacao.create({
        data: {
          usuarioId: p.id,
          titulo: 'Atualização',
          mensagem: 'Privada',
          emailSolicitado: true,
          enviadaEm: new Date('1999-01-01'),
        },
      });
      await b.reenviarPendentes();
      expect(
        (await db.notificacao.findUniqueOrThrow({ where: { id: never.id } }))
          .emailEnviadoEm,
      ).not.toBeNull();
      const expired = await db.notificacao.create({
        data: {
          usuarioId: p.id,
          titulo: 'Atualização',
          mensagem: 'Privada',
          emailSolicitado: true,
          emailReservaToken: n.id,
          emailReservadoAte: new Date('2000-01-01'),
          emailTentativas: 1,
        },
      });
      await b.despacharEmails([expired.id]);
      expect(
        (await db.notificacao.findUniqueOrThrow({ where: { id: expired.id } }))
          .emailEnviadoEm,
      ).not.toBeNull();
    } finally {
      spy.mockRestore();
    }
  });

  async function doctorAtTwoHospitals() {
    const h1 = await criarHospital(db),
      h2 = await criarHospital(db),
      rep = await criarRepresentante(db, h1.id),
      doctor = await criarMedico(db, h1.id, rep.id);
    await db.medicoHospital.createMany({
      data: [
        { medicoId: doctor.id, hospitalId: h1.id },
        { medicoId: doctor.id, hospitalId: h2.id },
      ],
    });
    const a = await criarDisponibilidade(db, doctor.id, 2),
      b = await criarDisponibilidade(db, doctor.id, 4);
    await db.disponibilidadeMedico.update({
      where: { id: b.id },
      data: { hospitalId: h2.id },
    });
    const p1 = await criarPaciente(db),
      p2 = await criarPaciente(db);
    const c1 = await agendarConsulta(db, p1.id, a),
      c2 = await agendarConsulta(db, p2.id, b);
    return { h1, h2, rep, doctor, p1, p2, c1, c2 };
  }
  it('desativação de uma instituição cancela só suas consultas e mantém o outro vínculo do médico', async () => {
    const { h1, h2, doctor, p1, c1, c2 } = await doctorAtTwoHospitals(),
      admin = await criarAdministrador(db);
    const adminToken = await entrar(app, admin.email),
      oldDoctor = await entrar(app, doctor.email);
    await api()
      .post(`/admin/hospitais/${h1.id}/desativar`)
      .auth(adminToken, { type: 'bearer' })
      .expect(200);
    expect(
      (await db.consulta.findUniqueOrThrow({ where: { id: c1.id } })).status,
    ).toBe('CANCELADA');
    expect(
      (await db.consulta.findUniqueOrThrow({ where: { id: c2.id } })).status,
    ).toBe('AGENDADA');
    expect(
      (await db.paciente.findUniqueOrThrow({ where: { usuarioId: p1.id } }))
        .situacao,
    ).toBe('PRE_CADASTRADO');
    expect(
      await db.notificacao.count({
        where: {
          usuarioId: p1.id,
          titulo: 'Consulta cancelada pela instituição',
        },
      }),
    ).toBe(1);
    await api().get('/auth/me').auth(oldDoctor, { type: 'bearer' }).expect(401);
    const fresh = await entrar(app, doctor.email);
    expect(
      (
        await api().get('/medico/hospitais').auth(fresh, { type: 'bearer' })
      ).body.map((h: { id: string }) => h.id),
    ).toEqual([h2.id]);
  });
  it('representante desativa somente seu vínculo médico, inclusive o vínculo principal', async () => {
    const { h1, h2, rep, doctor, c1, c2 } = await doctorAtTwoHospitals();
    const token = await entrar(app, rep.email);
    await api()
      .post(`/representante/medicos/${doctor.id}/desativar`)
      .auth(token, { type: 'bearer' })
      .expect(200);
    expect(
      (await db.usuario.findUniqueOrThrow({ where: { id: doctor.id } })).status,
    ).toBe('ATIVO');
    expect(
      (await db.consulta.findUniqueOrThrow({ where: { id: c1.id } })).status,
    ).toBe('CANCELADA');
    expect(
      (await db.consulta.findUniqueOrThrow({ where: { id: c2.id } })).status,
    ).toBe('AGENDADA');
    const fresh = await entrar(app, doctor.email);
    expect(
      (
        await api().get('/medico/hospitais').auth(fresh, { type: 'bearer' })
      ).body.map((h: { id: string }) => h.id),
    ).toEqual([h2.id]);
    const stale = await criarDisponibilidade(db, doctor.id, 6).catch(
      () => null,
    );
    // O trigger de disponibilidade e/ou agendamento deve recusar vínculo principal desativado.
    if (stale)
      await expect(
        agendarConsulta(db, (await criarPaciente(db)).id, stale),
      ).rejects.toThrow();
    expect(h1.id).not.toBe(h2.id);
  });

  it('admin desativa conta de paciente, cancela a consulta futura e revoga a sessão', async () => {
    const h = await criarHospital(db),
      r = await criarRepresentante(db, h.id),
      m = await criarMedico(db, h.id, r.id),
      p = await criarPaciente(db),
      a = await criarAdministrador(db);
    const c = await agendarConsulta(
      db,
      p.id,
      await criarDisponibilidade(db, m.id, 1),
    );
    const old = await entrar(app, p.email),
      token = await entrar(app, a.email);
    await api()
      .post(`/admin/usuarios/${p.id}/desativar`)
      .auth(token, { type: 'bearer' })
      .expect(200);
    expect(
      (await db.consulta.findUniqueOrThrow({ where: { id: c.id } })).status,
    ).toBe('CANCELADA');
    await api().get('/auth/me').auth(old, { type: 'bearer' }).expect(401);
  });

  it('encerramento exige administrador, fundamentação e confirmação; remove dados de conta sem histórico clínico', async () => {
    const p = await criarPaciente(db),
      a = await criarAdministrador(db),
      token = await entrar(app, p.email),
      admin = await entrar(app, a.email);
    const requests = await Promise.all(
      [1, 2].map(() =>
        api()
          .post('/conta/solicitacoes-exclusao')
          .auth(token, { type: 'bearer' })
          .send({ senhaAtual: SENHA_TESTE })
          .expect(201),
      ),
    );
    expect(requests[0].body.id).toBe(requests[1].body.id);
    const path = `/admin/solicitacoes-exclusao/${requests[0].body.id}/decisao`;
    const decision = {
      decisao: 'CONCLUIR',
      justificativa:
        'Encerramento solicitado e identidade conferida; não há registros clínicos.',
      confirmarAnalise: true,
    };
    await api()
      .post(path)
      .auth(token, { type: 'bearer' })
      .send(decision)
      .expect(403);
    await api()
      .post(path)
      .auth(admin, { type: 'bearer' })
      .send({ ...decision, confirmarAnalise: false })
      .expect(400);
    expect(
      (
        await api()
          .post(path)
          .auth(admin, { type: 'bearer' })
          .send(decision)
          .expect(201)
      ).body,
    ).toMatchObject({ status: 'CONCLUIDA', retencao: false });
    await api().get('/auth/me').auth(token, { type: 'bearer' }).expect(401);
    const closed = await db.usuario.findUniqueOrThrow({ where: { id: p.id } });
    expect(closed).toMatchObject({
      status: 'ENCERRADO',
      nome: 'Conta encerrada',
      telefone: null,
    });
    expect(closed.email).not.toBe(p.email);
    expect(closed.cpf).not.toBe(p.cpf);
    await expect(
      db.usuario.update({ where: { id: p.id }, data: { status: 'ATIVO' } }),
    ).rejects.toThrow();
    await api()
      .post(`/admin/usuarios/${p.id}/ativar`)
      .auth(admin, { type: 'bearer' })
      .expect(400);
    expect(
      await db.paciente.findUnique({ where: { usuarioId: p.id } }),
    ).toBeNull();
    await api()
      .post(path)
      .auth(admin, { type: 'bearer' })
      .send(decision)
      .expect(409);
    expect(
      await db.logAuditoria.count({
        where: {
          acao: 'CONCLUIR_ENCERRAMENTO',
          entidadeId: requests[0].body.id,
        },
      }),
    ).toBe(1);
  });
  it('encerramento preserva registros clínicos, cifra identidade, cancela agenda e não altera auditoria', async () => {
    const h = await criarHospital(db),
      r = await criarRepresentante(db, h.id),
      m = await criarMedico(db, h.id, r.id),
      p = await criarPaciente(db),
      a = await criarAdministrador(db);
    const c = await agendarConsulta(
      db,
      p.id,
      await criarDisponibilidade(db, m.id, 2),
    );
    const token = await entrar(app, p.email),
      admin = await entrar(app, a.email);
    const req = await api()
      .post('/conta/solicitacoes-exclusao')
      .auth(token, { type: 'bearer' })
      .send({ senhaAtual: SENHA_TESTE })
      .expect(201);
    const path = `/admin/solicitacoes-exclusao/${req.body.id}/decisao`,
      decision = {
        decisao: 'CONCLUIR',
        justificativa:
          'Guarda do vínculo clínico e da autoria para cumprimento das obrigações de retenção aplicáveis.',
        confirmarAnalise: true,
      };
    await api()
      .post(path)
      .auth(admin, { type: 'bearer' })
      .send(decision)
      .expect(400);
    const result = await api()
      .post(path)
      .auth(admin, { type: 'bearer' })
      .send({
        ...decision,
        reavaliarEm: new Date(Date.now() + 365 * 86400000).toISOString(),
      })
      .expect(201);
    expect(result.body).toMatchObject({
      retencao: true,
      consultasCanceladas: 1,
    });
    expect(
      (await db.consulta.findUniqueOrThrow({ where: { id: c.id } })).status,
    ).toBe('CANCELADA');
    const archive = await db.identidadeRetida.findUniqueOrThrow({
      where: { usuarioId: p.id },
    });
    expect(Buffer.from(archive.conteudo).includes(Buffer.from(p.cpf))).toBe(
      false,
    );
    const key = createHmac('sha256', lerChave(process.env.ARMAZENAMENTO_CHAVE!))
      .update('hemobridge:identidade-retida:v1')
      .digest();
    expect(
      JSON.parse(decifrar(Buffer.from(archive.conteudo), key).toString()),
    ).toMatchObject({ usuarioId: p.id, cpf: p.cpf, nome: p.nome });
    const list = await api()
      .get('/admin/solicitacoes-exclusao')
      .auth(admin, { type: 'bearer' })
      .expect(200);
    expect(JSON.stringify(list.body)).not.toContain(p.cpf);
    expect(
      await db.logAuditoria.count({
        where: { entidadeId: c.id, acao: 'CANCELAR_CONSULTA_OPERACIONAL' },
      }),
    ).toBe(1);
  });
});
