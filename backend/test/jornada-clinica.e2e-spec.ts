import type { INestApplication } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { entrar, prismaTeste, subirApp } from './apoio/app.js';
import { criarHospital, criarMedico, criarPaciente, criarRepresentante, tipoId } from './apoio/fixtures.js';

describe('Jornada clínica completa e avaliação de exames', () => {
  let app: INestApplication<App>;
  const db = prismaTeste();
  const pdf = Buffer.concat([Buffer.from('%PDF-1.7\n'), randomBytes(1024)]);
  beforeAll(async () => { app = await subirApp(); });
  afterAll(async () => { await app.close(); await db.$disconnect(); });

  const api = (token: string) => ({
    get: (path: string) => request(app.getHttpServer()).get(path).set('Authorization', `Bearer ${token}`),
    post: (path: string) => request(app.getHttpServer()).post(path).set('Authorization', `Bearer ${token}`),
    patch: (path: string) => request(app.getHttpServer()).patch(path).set('Authorization', `Bearer ${token}`),
  });

  async function cenario(realizar = true) {
    const hospital = await criarHospital(db);
    const representante = await criarRepresentante(db, hospital.id);
    const medico = await criarMedico(db, hospital.id, representante.id);
    const paciente = await criarPaciente(db);
    const m = api(await entrar(app, medico.email));
    const p = api(await entrar(app, paciente.email));
    const inicio = new Date(Date.now() + 48 * 3_600_000);
    const horario = await m.post('/medico/agenda').send({
      hospitalId: hospital.id, inicio: inicio.toISOString(),
      fim: new Date(inicio.getTime() + 1_800_000).toISOString(),
      linkVideochamada: 'https://meet.teste.local/jornada-clinica',
    }).expect(201);
    const agendada = await p.post('/paciente/agendamentos').send({
      disponibilidadeId: horario.body.id, aceiteTelemedicina: true,
    }).expect(201);
    const consultaId = agendada.body.id as string;
    // Somente o relógio da agenda é antecipado no banco descartável; as decisões clínicas usam a API.
    await db.disponibilidadeMedico.update({ where: { id: horario.body.id }, data: {
      inicio: new Date(Date.now() - 3_600_000), fim: new Date(Date.now() - 1_800_000),
    } });
    if (realizar) await m.patch(`/medico/consultas/${consultaId}`).send({ status: 'REALIZADA' }).expect(200);
    const pedir = async (nome = 'Tipagem ABO/Rh') => {
      const r = await m.post(`/medico/consultas/${consultaId}/solicitar-exames`)
        .send({ exames: [nome], orientacoes: 'Envie um resultado legível.' }).expect(201);
      return r.body.id as string;
    };
    const enviar = async (solicitacaoId: string) => {
      const r = await p.post(`/paciente/exames/${solicitacaoId}/envios`).attach('arquivo', pdf, 'resultado-sintetico.pdf').expect(201);
      return r.body.exame.id as string;
    };
    const avaliar = (id: string, body: Record<string, unknown>) => m.patch(`/medico/exames/${id}/avaliacao`).send(body);
    return { m, p, paciente, medico, consultaId, pedir, enviar, avaliar };
  }

  it('publica agenda, reserva, atende, solicita, envia e valida resultado, atualizando painel e trilha', async () => {
    const c = await cenario();
    const solicitacaoId = await c.pedir();
    const exameId = await c.enviar(solicitacaoId);
    for (const [cliente, path] of [
      [c.p, `/paciente/exames/envios/${exameId}/arquivo`],
      [c.m, `/medico/exames/${exameId}/arquivo`],
    ] as const) {
      const download = await cliente.get(path).expect('Content-Type', /application\/pdf/).expect(200);
      expect(download.body).toEqual(pdf);
    }
    const lista = await c.m.get('/medico/exames').expect(200);
    expect(lista.body.find((s: { id: string }) => s.id === solicitacaoId).exames[0])
      .toMatchObject({ id: exameId, situacao: 'EM_ANALISE', podeAvaliar: true });
    const tipo = await tipoId(db, 'O-');
    const resultado = await c.avaliar(exameId, { situacao: 'VALIDADO', tipoSanguineoId: tipo }).expect(200);
    expect(resultado.body.situacaoPaciente).toBe('APROVADO');
    expect((await c.p.get('/paciente/perfil').expect(200)).body).toMatchObject({ status: 'APROVADO', bloodType: 'O-' });
    expect(await db.exame.findUniqueOrThrow({ where: { id: exameId } })).toMatchObject({
      situacao: 'VALIDADO', medicoAvaliadorId: c.medico.id, tipoSanguineoId: tipo,
    });
    expect(await db.logAuditoria.count({ where: { acao: 'AVALIAR_EXAME', entidadeId: exameId } })).toBe(1);
    expect(await db.notificacao.count({ where: { usuarioId: c.paciente.id, titulo: 'Avaliação de exame atualizada' } })).toBe(1);
    await c.p.post(`/paciente/exames/${solicitacaoId}/envios`).attach('arquivo', pdf, 'duplicado.pdf').expect(409);
  });

  it('reprova com orientação, aceita novo envio e preserva o resultado anterior após aprovação', async () => {
    const c = await cenario(); const pedido = await c.pedir(); const primeiro = await c.enviar(pedido);
    await c.avaliar(primeiro, { situacao: 'REPROVADO' }).expect(400);
    await c.avaliar(primeiro, { situacao: 'REPROVADO', motivoReprovacao: 'Imagem ilegível; envie o arquivo completo.' }).expect(200);
    expect((await c.p.get('/paciente/perfil').expect(200)).body.status).toBe('REPROVADO');
    const novo = await c.enviar(pedido);
    await c.avaliar(novo, { situacao: 'VALIDADO', tipoSanguineoId: await tipoId(db, 'A+') }).expect(200);
    const resultado = await c.p.get('/paciente/exames').expect(200);
    const item = resultado.body.itens.find((s: { id: string }) => s.id === pedido);
    expect(item.envios.map((e: { situacao: string }) => e.situacao)).toEqual(['VALIDADO', 'REPROVADO']);
    expect((await c.p.get('/paciente/perfil').expect(200)).body.status).toBe('APROVADO');
  });

  it('não aprova enquanto outro pedido estiver sem resultado e exige concordância da tipagem', async () => {
    const c = await cenario(); const p1 = await c.pedir(); const p2 = await c.pedir('Confirmação de tipagem');
    const e1 = await c.enviar(p1);
    const tipo = await tipoId(db, 'O+');
    expect((await c.avaliar(e1, { situacao: 'VALIDADO', tipoSanguineoId: tipo }).expect(200)).body.situacaoPaciente)
      .toBe('AGUARDANDO_EXAME');
    const e2 = await c.enviar(p2);
    await c.avaliar(e2, { situacao: 'VALIDADO', tipoSanguineoId: await tipoId(db, 'B+') }).expect(409);
    expect((await db.exame.findUniqueOrThrow({ where: { id: e2 } })).situacao).toBe('EM_ANALISE');
    expect((await c.avaliar(e2, { situacao: 'VALIDADO', tipoSanguineoId: tipo }).expect(200)).body.situacaoPaciente).toBe('APROVADO');
  });

  it('exige atendimento realizado, tipagem válida e médico responsável na avaliação', async () => {
    const c = await cenario(false); const pedido = await c.pedir(); const exame = await c.enviar(pedido);
    await c.avaliar(exame, { situacao: 'VALIDADO', tipoSanguineoId: await tipoId(db, 'O+') }).expect(409);
    await c.m.patch(`/medico/consultas/${c.consultaId}`).send({ status: 'REALIZADA' }).expect(200);
    await c.avaliar(exame, { situacao: 'VALIDADO' }).expect(400);
    await c.avaliar(exame, { situacao: 'VALIDADO', tipoSanguineoId: 32767 }).expect(400);
    await c.p.patch(`/medico/exames/${exame}/avaliacao`).send({ situacao: 'REPROVADO', motivoReprovacao: 'Teste de papel' }).expect(403);
    const outra = await cenario();
    await outra.avaliar(exame, { situacao: 'REPROVADO', motivoReprovacao: 'Teste de escopo' }).expect(404);
  });

  it('serializa duas avaliações simultâneas e grava uma única decisão e notificação', async () => {
    const c = await cenario(); const exame = await c.enviar(await c.pedir());
    const resultados = await Promise.all([
      c.avaliar(exame, { situacao: 'VALIDADO', tipoSanguineoId: await tipoId(db, 'AB+') }),
      c.avaliar(exame, { situacao: 'REPROVADO', motivoReprovacao: 'Nova versão necessária.' }),
    ]);
    expect(resultados.map((r) => r.status).sort((a, b) => a - b)).toEqual([200, 409]);
    expect(await db.logAuditoria.count({ where: { acao: 'AVALIAR_EXAME', entidadeId: exame } })).toBe(1);
    expect(await db.notificacao.count({ where: { usuarioId: c.paciente.id,
      titulo: { in: ['Resultado precisa de novo envio', 'Avaliação de exame atualizada'] } } })).toBe(1);
  });

  it('serializa uploads simultâneos e mantém um único resultado em análise', async () => {
    const c = await cenario(); const pedido = await c.pedir();
    const resultados = await Promise.all([1, 2].map((n) => c.p.post(`/paciente/exames/${pedido}/envios`)
      .attach('arquivo', pdf, `resultado-${n}.pdf`)));
    expect(resultados.map((r) => r.status).sort((a, b) => a - b)).toEqual([201, 409]);
    expect(await db.exame.count({ where: { solicitacaoExameId: pedido } })).toBe(1);
  });

  it('permite novo agendamento após não comparecimento, sem manter o cadastro preso na consulta antiga', async () => {
    const c = await cenario(false);
    await c.m.patch(`/medico/consultas/${c.consultaId}`).send({ status: 'NAO_COMPARECEU' }).expect(200);
    expect((await c.p.get('/paciente/perfil').expect(200)).body.status).toBe('PRE_CADASTRADO');
  });
});
