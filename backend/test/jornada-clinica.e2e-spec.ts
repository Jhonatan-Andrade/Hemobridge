import type { INestApplication } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { entrar, prismaTeste, subirApp } from './apoio/app.js';
import { responderPreTriagemTeste } from './apoio/pre-triagem.js';
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

  async function cenario(realizar = true, iniciar = true) {
    const hospital = await criarHospital(db);
    const representante = await criarRepresentante(db, hospital.id);
    const medico = await criarMedico(db, hospital.id, representante.id);
    const paciente = await criarPaciente(db);
    const m = api(await entrar(app, medico.email));
    const tokenPaciente = await entrar(app, paciente.email);
    const p = api(tokenPaciente);
    const preTriagemId = await responderPreTriagemTeste(app, tokenPaciente);
    const inicio = new Date(Date.now() + 48 * 3_600_000);
    const horario = await m.post('/medico/agenda').send({
      hospitalId: hospital.id, inicio: inicio.toISOString(),
      fim: new Date(inicio.getTime() + 1_800_000).toISOString(),
      linkVideochamada: 'https://meet.teste.local/jornada-clinica',
    }).expect(201);
    const agendada = await p.post('/paciente/agendamentos').send({
      disponibilidadeId: horario.body.id, aceiteTelemedicina: true, preTriagemId,
    }).expect(201);
    const consultaId = agendada.body.id as string;
    // Somente o relógio da agenda é antecipado no banco descartável; as decisões clínicas usam a API.
    if (iniciar) await db.disponibilidadeMedico.update({ where: { id: horario.body.id }, data: {
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
    return { m, p, tokenPaciente, paciente, medico, hospital, horarioId: horario.body.id as string, consultaId, pedir, enviar, avaliar };
  }

  it('separa próximos horários do histórico e pagina sem ocultar consultas recentes após cem horários antigos', async () => {
    const c = await cenario();
    await db.disponibilidadeMedico.createMany({ data: Array.from({ length: 110 }, (_, i) => {
      const inicio = new Date(Date.now() - (200 - i) * 86_400_000);
      return { medicoId: c.medico.id, hospitalId: c.hospital.id, inicio,
        fim: new Date(inicio.getTime() + 1_800_000), linkVideochamada: 'https://meet.teste.local/historico' };
    }) });
    const inicio = new Date(Date.now() + 72 * 3_600_000);
    const futuro = await c.m.post('/medico/agenda').send({
      hospitalId: c.hospital.id, inicio: inicio.toISOString(),
      fim: new Date(inicio.getTime() + 1_800_000).toISOString(),
      linkVideochamada: 'https://meet.teste.local/proximo',
    }).expect(201);
    const proximos = await c.m.get('/medico/agenda?periodo=proximos&pagina=1&tamanhoPagina=1&incluirRealizadas=true').expect(200);
    expect(proximos.body.map((v: { id: string }) => v.id)).toEqual([futuro.body.id]);
    const passado = await c.m.get('/medico/agenda?periodo=historico&pagina=1&tamanhoPagina=1&incluirRealizadas=true').expect(200);
    expect(passado.body[0]).toMatchObject({ id: c.horarioId, consultas: [{ id: c.consultaId, status: 'REALIZADA' }] });
    const seguinte = await c.m.get('/medico/agenda?periodo=historico&pagina=2&tamanhoPagina=1').expect(200);
    expect(seguinte.body).toHaveLength(1);
    expect(seguinte.body[0].id).not.toBe(c.horarioId);
    for (const query of ['periodo=invalido', 'pagina=0', 'tamanhoPagina=101', 'pagina=1.5']) {
      await c.m.get('/medico/agenda?' + query).expect(400);
    }
  });

  it('publica agenda, reserva, atende, solicita, envia e valida resultado, atualizando painel e trilha', async () => {
    const c = await cenario();
    const agendaAtual = await c.m.get('/medico/agenda').expect(200);
    expect(agendaAtual.body.flatMap((s: { consultas: { id: string }[] }) => s.consultas).some((v: { id: string }) => v.id === c.consultaId)).toBe(false);
    const historico = await c.m.get('/medico/agenda?incluirRealizadas=true').expect(200);
    expect(historico.body.flatMap((s: { consultas: { id: string; status: string }[] }) => s.consultas))
      .toContainEqual(expect.objectContaining({ id: c.consultaId, status: 'REALIZADA' }));
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
  it('persiste respostas versionadas antes dos horários e permite avaliar intervalo insuficiente', async () => {
    const hospital = await criarHospital(db);
    const rep = await criarRepresentante(db, hospital.id);
    const medico = await criarMedico(db, hospital.id, rep.id);
    const paciente = await criarPaciente(db);
    const p = api(await entrar(app, paciente.email));
    await p.get('/paciente/consultas/horarios-disponiveis').expect(409);
    const questionario = await p.get('/paciente/pre-triagem').expect(200);
    const base = { versao: questionario.body.versao, pesoKg: 70, doouAntes: true, condicaoSaudeRequerAvaliacao: false };
    await p.post('/paciente/pre-triagem').send(base).expect(400);
    await p.post('/paciente/pre-triagem').send({ ...base, dataUltimaDoacao: '2999-01-01' }).expect(400);
    expect(await db.preTriagem.count({ where: { pacienteId: paciente.id } })).toBe(0);
    const ontem = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const triagem = await p.post('/paciente/pre-triagem').send({ ...base, dataUltimaDoacao: ontem }).expect(201);
    expect(triagem.body).toMatchObject({ resultado: 'AGUARDAR_INTERVALO', permiteAgendarConsulta: true });
    const salva = await db.preTriagem.findUniqueOrThrow({ where: { id: triagem.body.id }, include: { respostas: true } });
    expect(salva.versaoQuestionario).toBe(questionario.body.versao);
    expect(salva.respostas).toHaveLength(4);
    const inicio = new Date(Date.now() + 48 * 3600000);
    const horario = await db.disponibilidadeMedico.create({ data: { medicoId: medico.id, hospitalId: hospital.id, inicio,
      fim: new Date(inicio.getTime() + 1800000), linkVideochamada: 'https://meet.teste.local/pre-triagem' } });
    await p.get('/paciente/consultas/horarios-disponiveis').expect(200);
    await p.post('/paciente/agendamentos').send({ disponibilidadeId: horario.id, aceiteTelemedicina: true }).expect(400);
    const agendada = await p.post('/paciente/agendamentos').send({ disponibilidadeId: horario.id, aceiteTelemedicina: true, preTriagemId: triagem.body.id }).expect(201);
    expect((await db.consulta.findUniqueOrThrow({ where: { id: agendada.body.id } })).preTriagemId).toBe(triagem.body.id);
  });

  it('consulta futura só permite cancelamento médico com motivo, remove disponibilidade e notifica', async () => {
    const c = await cenario(false, false);
    await c.m.patch(`/medico/consultas/${c.consultaId}`).send({ status: 'REALIZADA' }).expect(409);
    await c.m.patch(`/medico/consultas/${c.consultaId}`).send({ status: 'NAO_COMPARECEU' }).expect(409);
    await c.m.post(`/medico/consultas/${c.consultaId}/cancelar`).send({ motivo: ' ' }).expect(400);
    await c.p.post(`/medico/consultas/${c.consultaId}/cancelar`).send({ motivo: 'Teste de autorização.' }).expect(403);
    const detalhe = await c.m.get(`/medico/consultas/${c.consultaId}`).expect(200);
    expect(detalhe.body).toMatchObject({ podeAtender: false, podeCancelar: true });
    expect(detalhe.body.preTriagem.respostas.length).toBeGreaterThan(0);
    await c.m.post(`/medico/consultas/${c.consultaId}/cancelar`).send({ motivo: 'Indisponibilidade do profissional.' }).expect(201);
    expect((await db.disponibilidadeMedico.findUniqueOrThrow({ where: { id: c.horarioId } })).canceladaEm).not.toBeNull();
    expect((await c.m.get('/medico/agenda').expect(200)).body.map((h: { id: string }) => h.id)).not.toContain(c.horarioId);
    const historicoCancelamento = await c.m.get('/medico/agenda?periodo=historico&incluirRealizadas=true').expect(200);
    expect(historicoCancelamento.body.find((h: { id: string }) => h.id === c.horarioId).consultas).toEqual(expect.arrayContaining([expect.objectContaining({ id: c.consultaId, status: 'CANCELADA' })]));
    expect((await c.p.get('/paciente/consultas/horarios-disponiveis').expect(200)).body.itens.map((h: { disponibilidadeId: string }) => h.disponibilidadeId)).not.toContain(c.horarioId);
    expect((await c.p.get('/paciente/perfil').expect(200)).body.status).toBe('PRE_CADASTRADO');
    expect(await db.notificacao.count({ where: { usuarioId: c.paciente.id, titulo: 'Consulta cancelada pelo médico' } })).toBe(1);
    await c.m.post(`/medico/consultas/${c.consultaId}/cancelar`).send({ motivo: 'Tentativa repetida.' }).expect(409);
    const anterior = await db.disponibilidadeMedico.findUniqueOrThrow({ where: { id: c.horarioId } });
    const republicada = await c.m.post('/medico/agenda').send({ hospitalId: c.hospital.id, inicio: anterior.inicio.toISOString(),
      fim: anterior.fim.toISOString(), linkVideochamada: 'https://meet.teste.local/republicado' }).expect(201);
    expect(republicada.body.id).not.toBe(c.horarioId);
    const outraPessoa = await criarPaciente(db);
    const outroToken = await entrar(app, outraPessoa.email);
    const triagem = await responderPreTriagemTeste(app, outroToken);
    await api(outroToken).post('/paciente/agendamentos').send({ disponibilidadeId: republicada.body.id,
      aceiteTelemedicina: true, preTriagemId: triagem }).expect(201);
    await c.m.patch(`/medico/consultas/${c.consultaId}`).send({ status: 'REALIZADA' }).expect(409);
  });

  it('registra observações e inaptidão com motivo sem divulgar conteúdo clínico na auditoria', async () => {
    const c = await cenario(false);
    await c.m.patch(`/medico/consultas/${c.consultaId}`).send({ status: 'REALIZADA', decisao: 'REPROVAR' }).expect(400);
    await c.m.patch(`/medico/consultas/${c.consultaId}`).send({ status: 'REALIZADA', observacoes: 'Observação clínica sintética.', decisao: 'REPROVAR', motivoReprovacao: 'Restrição temporária identificada na avaliação.' }).expect(200);
    expect(await db.consulta.findUniqueOrThrow({ where: { id: c.consultaId } })).toMatchObject({ status: 'REALIZADA', observacoes: 'Observação clínica sintética.', motivoReprovacao: 'Restrição temporária identificada na avaliação.' });
    expect((await c.p.get('/paciente/perfil').expect(200)).body.status).toBe('REPROVADO');
    expect(await db.notificacao.count({ where: { usuarioId: c.paciente.id, titulo: 'Orientação após a consulta' } })).toBe(1);
    const logs = await db.logAuditoria.findMany({ where: { entidadeId: c.consultaId }, select: { detalhes: true } });
    expect(JSON.stringify(logs)).not.toMatch(/Observação clínica sintética|Restrição temporária identificada/);
    await c.m.post(`/medico/consultas/${c.consultaId}/solicitar-exames`).send({ exames: ['Tipagem'] }).expect(409);
  });

  it('novo ciclo após reprovação preserva histórico sem misturar pedidos ou liberar ações antigas', async () => {
    const c = await cenario();
    const pedidoAntigo = await c.pedir('Pedido do ciclo anterior');
    await c.m.patch(`/medico/consultas/${c.consultaId}`).send({ status: 'REALIZADA', decisao: 'REPROVAR', motivoReprovacao: 'Nova avaliação necessária.' }).expect(200);
    const preTriagemId = await responderPreTriagemTeste(app, c.tokenPaciente);
    const inicio = new Date(Date.now() + 72 * 3600000);
    const horario = await c.m.post('/medico/agenda').send({ hospitalId: c.hospital.id, inicio: inicio.toISOString(),
      fim: new Date(inicio.getTime() + 1800000).toISOString(), linkVideochamada: 'https://meet.teste.local/novo-ciclo' }).expect(201);
    const nova = await c.p.post('/paciente/agendamentos').send({ disponibilidadeId: horario.body.id, aceiteTelemedicina: true, preTriagemId }).expect(201);
    await c.p.post(`/paciente/exames/${pedidoAntigo}/envios`).attach('arquivo', pdf, 'antigo.pdf').expect(409);
    await c.m.patch(`/medico/consultas/${c.consultaId}`).send({ status: 'REALIZADA', observacoes: 'Não deve alterar histórico.' }).expect(409);
    await db.disponibilidadeMedico.update({ where: { id: horario.body.id }, data: { inicio: new Date(Date.now() - 1800000), fim: new Date(Date.now() - 60000) } });
    await c.m.patch(`/medico/consultas/${nova.body.id}`).send({ status: 'REALIZADA', observacoes: 'Novo atendimento sintético.' }).expect(200);
    const pedido = await c.m.post(`/medico/consultas/${nova.body.id}/solicitar-exames`).send({ exames: ['Tipagem do ciclo atual'] }).expect(201);
    const exame = await c.enviar(pedido.body.id);
    expect((await c.avaliar(exame, { situacao: 'VALIDADO', tipoSanguineoId: await tipoId(db, 'O+') }).expect(200)).body.situacaoPaciente).toBe('APROVADO');
    const lista = await c.p.get('/paciente/exames').expect(200);
    expect(lista.body.itens.find((p: { id: string }) => p.id === pedidoAntigo)).toMatchObject({ cicloAtual: false, podeEnviar: false });
    expect(await db.solicitacaoExame.count({ where: { id: pedidoAntigo } })).toBe(1);
    await c.p.get('/paciente/perfil').expect(200);
    await c.m.get('/medico/exames').expect(200);
    await c.p.get('/paciente/exames').expect(200);
    for (const [usuarioId, acao] of [[c.paciente.id, 'VISUALIZAR_PERFIL'], [c.paciente.id, 'LISTAR_MEUS_EXAMES'], [c.medico.id, 'LISTAR_EXAMES_CLINICOS']])
      expect(await db.logAuditoria.count({ where: { usuarioId, acao } })).toBeGreaterThan(0);
  });

});
