import type { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { ArmazenamentoService } from '../src/armazenamento/armazenamento.service.js';
import { sha256 } from '../src/armazenamento/arquivo-exame.js';
import { entrar, prismaTeste, subirApp } from './apoio/app.js';
import {
  agendarConsulta,
  criarAdministrador,
  criarHospital,
  criarMedico,
  criarPaciente,
  criarRepresentante,
} from './apoio/fixtures.js';

describe('Permissões clínicas e revogação de vínculo institucional', () => {
  const db = prismaTeste();
  let app: INestApplication<App>;
  const pdf = Buffer.from(
    '%PDF-1.7\nArquivo exclusivo dos testes automatizados.',
  );
  beforeAll(async () => {
    app = await subirApp();
    vi.spyOn(app.get(ArmazenamentoService), 'obter').mockResolvedValue(pdf);
  });
  afterAll(async () => {
    vi.restoreAllMocks();
    await app?.close();
    await db.$disconnect();
  });
  const api = () => request(app.getHttpServer());

  async function cenario() {
    const a = await criarHospital(db),
      b = await criarHospital(db),
      rep = await criarRepresentante(db, a.id),
      doctor = await criarMedico(db, a.id, rep.id);
    await db.medicoHospital.createMany({
      data: [a, b].map((h) => ({ medicoId: doctor.id, hospitalId: h.id })),
    });
    const patients = await Promise.all([criarPaciente(db), criarPaciente(db)]);
    const records = [];
    for (const [index, hospital] of [a, b].entries()) {
      const inicio = new Date(Date.now() - (index + 1) * 3600000);
      const slot = await db.disponibilidadeMedico.create({
        data: {
          medicoId: doctor.id,
          hospitalId: hospital.id,
          inicio,
          fim: new Date(inicio.getTime() + 1800000),
          linkVideochamada: `https://meet.teste.local/${randomUUID()}`,
        },
      });
      const consultation = await agendarConsulta(db, patients[index].id, slot);
      const solicitation = await db.solicitacaoExame.create({
        data: { consultaId: consultation.id, descricao: 'Tipagem ABO/Rh' },
      });
      const exam = await db.exame.create({
        data: {
          solicitacaoExameId: solicitation.id,
          chaveArmazenamento: `permissoes/${randomUUID()}`,
          nomeOriginal: 'resultado.pdf',
          mimeType: 'application/pdf',
          tamanhoBytes: pdf.length,
          hashSha256: sha256(pdf),
        },
      });
      records.push({ slot, consultation, solicitation, exam });
    }
    return { a, b, rep, doctor, patients, records };
  }

  it('mantém o vínculo ativo e bloqueia agenda, atendimento e exames do vínculo revogado', async () => {
    const c = await cenario(),
      [revoked, active] = c.records;
    const repToken = await entrar(app, c.rep.email),
      staleToken = await entrar(app, c.doctor.email);
    await api()
      .post(`/representante/medicos/${c.doctor.id}/desativar`)
      .auth(repToken, { type: 'bearer' })
      .expect(200);
    await api()
      .get('/auth/me')
      .auth(staleToken, { type: 'bearer' })
      .expect(401);
    const token = await entrar(app, c.doctor.email);

    const agenda = await api()
      .get('/medico/agenda')
      .auth(token, { type: 'bearer' })
      .expect(200);
    expect(agenda.body.map((s: { id: string }) => s.id)).toEqual([
      active.slot.id,
    ]);
    await api()
      .get(`/medico/agenda?hospitalId=${c.a.id}`)
      .auth(token, { type: 'bearer' })
      .expect(403);
    const exams = await api()
      .get('/medico/exames')
      .auth(token, { type: 'bearer' })
      .expect(200);
    expect(exams.body.map((s: { id: string }) => s.id)).toEqual([
      active.solicitation.id,
    ]);
    await api()
      .get(`/medico/exames/${revoked.exam.id}/arquivo`)
      .auth(token, { type: 'bearer' })
      .expect(404);
    await api()
      .post(`/medico/consultas/${revoked.consultation.id}/solicitar-exames`)
      .auth(token, { type: 'bearer' })
      .send({ exames: ['Hemograma'] })
      .expect(404);
    await api()
      .patch(`/medico/consultas/${revoked.consultation.id}`)
      .auth(token, { type: 'bearer' })
      .send({ status: 'REALIZADA' })
      .expect(409);
    expect(
      (
        await db.consulta.findUniqueOrThrow({
          where: { id: revoked.consultation.id },
        })
      ).status,
    ).toBe('AGENDADA');

    await api()
      .get(`/medico/exames/${active.exam.id}/arquivo`)
      .auth(token, { type: 'bearer' })
      .expect(200);
    await api()
      .patch(`/medico/consultas/${active.consultation.id}`)
      .auth(token, { type: 'bearer' })
      .send({ status: 'REALIZADA' })
      .expect(200);
  });

  it('instituição desativada deixa de expor seus pacientes ao médico que segue em outra unidade', async () => {
    const c = await cenario(),
      [revoked, active] = c.records;
    const admin = await criarAdministrador(db),
      tokenAdmin = await entrar(app, admin.email);
    await api()
      .post(`/admin/hospitais/${c.a.id}/desativar`)
      .auth(tokenAdmin, { type: 'bearer' })
      .expect(200);
    const token = await entrar(app, c.doctor.email);
    const agenda = await api()
      .get('/medico/agenda')
      .auth(token, { type: 'bearer' })
      .expect(200);
    expect(agenda.body.map((s: { id: string }) => s.id)).toEqual([
      active.slot.id,
    ]);
    await api()
      .get(`/medico/exames/${revoked.exam.id}/arquivo`)
      .auth(token, { type: 'bearer' })
      .expect(404);
    await api()
      .patch(`/medico/consultas/${revoked.consultation.id}`)
      .auth(token, { type: 'bearer' })
      .send({ status: 'NAO_COMPARECEU' })
      .expect(409);
    await api()
      .get(`/medico/exames/${active.exam.id}/arquivo`)
      .auth(token, { type: 'bearer' })
      .expect(200);
  });

  it('recusa dados alheios e mantém administrador e representante fora dos arquivos clínicos', async () => {
    const c = await cenario(),
      [first] = c.records;
    const admin = await criarAdministrador(db),
      other = await criarMedico(db, c.a.id, c.rep.id);
    const tokens = await Promise.all(
      [c.patients[1], c.rep, admin, other].map((u) => entrar(app, u.email)),
    );
    await api()
      .get(`/paciente/exames/envios/${first.exam.id}/arquivo`)
      .auth(tokens[0], { type: 'bearer' })
      .expect(404);
    await api()
      .post(`/paciente/consultas/${first.consultation.id}/cancelar`)
      .auth(tokens[0], { type: 'bearer' })
      .send({})
      .expect(404);
    await api()
      .post(`/paciente/exames/${first.solicitation.id}/envios`)
      .auth(tokens[0], { type: 'bearer' })
      .attach('arquivo', pdf, 'resultado.pdf')
      .expect(404);
    for (const token of [tokens[1], tokens[2]]) {
      await api()
        .get(`/medico/exames/${first.exam.id}/arquivo`)
        .auth(token, { type: 'bearer' })
        .expect(403);
      await api()
        .get(`/paciente/exames/envios/${first.exam.id}/arquivo`)
        .auth(token, { type: 'bearer' })
        .expect(403);
    }
    await api()
      .get(`/medico/exames/${first.exam.id}/arquivo`)
      .auth(tokens[3], { type: 'bearer' })
      .expect(404);
    await api()
      .post('/medico/agenda')
      .auth(tokens[3], { type: 'bearer' })
      .send({
        hospitalId: c.b.id,
        inicio: new Date(Date.now() + 86400000).toISOString(),
        fim: new Date(Date.now() + 88200000).toISOString(),
        linkVideochamada: 'https://meet.teste.local/agenda',
      })
      .expect(403);
  });
});
