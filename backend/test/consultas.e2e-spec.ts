import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { entrar, prismaTeste, subirApp } from './apoio/app.js';
import {
  agendarConsulta,
  criarDisponibilidade,
  criarHospital,
  criarMedico,
  criarPaciente,
  criarRepresentante,
} from './apoio/fixtures.js';

// HEM-42 / UC10 – ver, cancelar e reagendar consulta (RN10, RN18; PT05).
describe('Minhas consultas (integração)', () => {
  let app: INestApplication<App>;
  const prisma = prismaTeste();
  let hospitalId: string;
  let repId: string;

  beforeAll(async () => {
    app = await subirApp();
    const hospital = await criarHospital(prisma);
    const rep = await criarRepresentante(prisma, hospital.id);
    hospitalId = hospital.id;
    repId = rep.id;
  }, 60_000);
  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  // Um médico por cenário: horários do mesmo médico não podem se sobrepor.
  async function pacienteComConsulta(horas: number) {
    const medicoId = (await criarMedico(prisma, hospitalId, repId)).id;
    const paciente = await criarPaciente(prisma);
    const horario = await criarDisponibilidade(prisma, medicoId, horas);
    const consulta = await agendarConsulta(prisma, paciente.id, horario);
    const token = await entrar(app, paciente.email);
    const api = (metodo: 'get' | 'post', url: string) =>
      request(app.getHttpServer())[metodo](url).set('Authorization', `Bearer ${token}`);
    return { paciente, horario, consulta, api, medicoId };
  }

  it('lista a consulta sem link antes dos 15 minutos', async () => {
    const { api, consulta } = await pacienteComConsulta(48);
    const r = await api('get', '/paciente/consultas').expect(200);
    expect(r.body[0]).toMatchObject({ id: consulta.id, status: 'AGENDADA', linkVideochamada: null, podeCancelarOuReagendar: true });
    expect(r.body[0].medico).toBe('Dra. Médica E2E');
  });

  it('mostra o link da sala a partir de 15 minutos antes (RN18)', async () => {
    const { api, horario } = await pacienteComConsulta(0.15); // 9 minutos
    const r = await api('get', '/paciente/consultas').expect(200);
    expect(r.body[0]).toMatchObject({ linkVideochamada: horario.linkVideochamada, podeCancelarOuReagendar: false });
  });

  it('recusa cancelar com menos de 24 horas (FE01)', async () => {
    const { api, consulta } = await pacienteComConsulta(10);
    const r = await api('post', `/paciente/consultas/${consulta.id}/cancelar`).send({}).expect(422);
    expect(r.body.message).toMatch(/24 horas/);
  });

  it('cancela, libera o horário e volta o paciente a PRE_CADASTRADO', async () => {
    const { api, consulta, horario, paciente, medicoId } = await pacienteComConsulta(48);
    await api('post', `/paciente/consultas/${consulta.id}/cancelar`).send({ motivo: 'Imprevisto' }).expect(200);

    const gravada = await prisma.consulta.findUniqueOrThrow({ where: { id: consulta.id } });
    expect(gravada).toMatchObject({ status: 'CANCELADA', motivoCancelamento: 'Imprevisto', canceladaPorId: paciente.id });
    expect((await prisma.paciente.findUniqueOrThrow({ where: { usuarioId: paciente.id } })).situacao).toBe('PRE_CADASTRADO');

    // A consulta criada diretamente pelo fixture é legada e não tem pré-triagem.
    await api('post', '/paciente/pre-triagem').send({ versao: '2026-10-23', pesoKg: 70,
      doouAntes: false, condicaoSaudeRequerAvaliacao: false }).expect(201);
    const livres = await api('get', `/paciente/consultas/horarios-disponiveis?medicoId=${medicoId}`).expect(200);
    expect(livres.body.itens.map((h: { disponibilidadeId: string }) => h.disponibilidadeId)).toContain(horario.id);
    expect(await prisma.logAuditoria.count({ where: { acao: 'CANCELAR_CONSULTA', entidadeId: consulta.id } })).toBe(1);
  });

  it('reagenda guardando a consulta de origem e liberando o horário anterior (PT05)', async () => {
    const { api, consulta, horario, paciente, medicoId } = await pacienteComConsulta(48);
    const novo = await criarDisponibilidade(prisma, medicoId, 72);

    const r = await api('post', `/paciente/consultas/${consulta.id}/reagendar`)
      .send({ disponibilidadeId: novo.id })
      .expect(200);
    expect(r.body.consulta).toMatchObject({ status: 'AGENDADA', consultaOrigemId: consulta.id });

    expect((await prisma.consulta.findUniqueOrThrow({ where: { id: consulta.id } })).status).toBe('CANCELADA');
    expect((await prisma.paciente.findUniqueOrThrow({ where: { usuarioId: paciente.id } })).situacao).toBe('CONSULTA_AGENDADA');
    const livres = await api('get', `/paciente/consultas/horarios-disponiveis?medicoId=${medicoId}`).expect(200);
    const ids = livres.body.itens.map((h: { disponibilidadeId: string }) => h.disponibilidadeId);
    expect(ids).toContain(horario.id);
    expect(ids).not.toContain(novo.id);
  });

  it('não reagenda para horário já reservado por outra pessoa', async () => {
    const outro = await pacienteComConsulta(96);
    const { api, consulta } = await pacienteComConsulta(48);
    const r = await api('post', `/paciente/consultas/${consulta.id}/reagendar`)
      .send({ disponibilidadeId: outro.horario.id })
      .expect(409);
    expect(r.body.message).toMatch(/acabou de ser reservado/);
    expect((await prisma.consulta.findUniqueOrThrow({ where: { id: consulta.id } })).status).toBe('AGENDADA');
  });

  it('não acessa consulta de outro paciente', async () => {
    const dono = await pacienteComConsulta(48);
    const { api } = await pacienteComConsulta(50);
    await api('post', `/paciente/consultas/${dono.consulta.id}/cancelar`).send({}).expect(404);
  });
});
