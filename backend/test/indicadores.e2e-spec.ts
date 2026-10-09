import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { hojeIso } from '../src/common/data.js';
import { somarDias } from '../src/common/elegibilidade.js';
import { entrar, prismaTeste, subirApp } from './apoio/app.js';
import {
  criarAdministrador,
  criarHospital,
  criarMedico,
  criarPaciente,
  criarRepresentante,
  registrarDoacao,
} from './apoio/fixtures.js';

// HEM-51, HEM-52 e HEM-53 – dashboards e relatórios (UC23, UC24; RN03, RN08).
describe('Indicadores e relatórios (integração)', () => {
  let app: INestApplication<App>;
  const prisma = prismaTeste();
  const hoje = hojeIso();
  let hospitalId: string;
  let rep: (u: string) => request.Test;
  let admin: (u: string) => request.Test;
  const get = (token: string) => (u: string) =>
    request(app.getHttpServer()).get(u).set('Authorization', `Bearer ${token}`);
  const binario = (req: request.Test) =>
    req.buffer(true).parse((res, cb) => {
      const partes: Buffer[] = [];
      res.on('data', (c: Buffer) => partes.push(c));
      res.on('end', () => cb(null, Buffer.concat(partes)));
    });

  beforeAll(async () => {
    app = await subirApp();
    hospitalId = (await criarHospital(prisma, { estado: 'RR' })).id;
    const r = await criarRepresentante(prisma, hospitalId);
    const medico = await criarMedico(prisma, hospitalId, r.id);
    const doador = await criarPaciente(prisma, { situacao: 'APROVADO', tipo: 'O-', medicoId: medico.id, estado: 'RR' });
    const doar = (tipo: string, dias: number, pacienteId?: string) =>
      registrarDoacao(prisma, { hospitalId, representanteId: r.id, tipo, dataColeta: somarDias(hoje, dias), pacienteId });
    await doar('O-', -5, doador.id);
    await doar('O-', -2);
    await doar('A+', 0);
    await doar('B+', -60); // fora do padrão de 30 dias

    const tokenRep = await entrar(app, r.email);
    rep = get(tokenRep);
    const put = (niveis: unknown) =>
      request(app.getHttpServer())
        .put('/representante/necessidades')
        .set('Authorization', `Bearer ${tokenRep}`)
        .send({ niveis })
        .expect(200);
    await put([
      { tipo: 'O-', nivel: 'BAIXO' },
      { tipo: 'A+', nivel: 'ESTAVEL' },
    ]);
    await put([{ tipo: 'O-', nivel: 'CRITICO' }]);
    admin = get(await entrar(app, (await criarAdministrador(prisma)).email));
  }, 120_000);
  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it('dashboard do hospital: últimos 30 dias, doações por tipo, situação e evolução (HEM-51)', async () => {
    const r = await rep('/representante/indicadores').expect(200);
    expect(r.body.periodo).toEqual({ de: somarDias(hoje, -29), ate: hoje });
    expect(r.body.totalDoacoes).toBe(3);
    const porTipo = Object.fromEntries(r.body.doacoesPorTipo.map((d: { tipo: string }) => [d.tipo, d]));
    expect(porTipo['O-']).toEqual({ tipo: 'O-', total: 2, vinculadas: 1, avulsas: 1 });
    expect(porTipo['A+'].total).toBe(1);
    expect(r.body.necessidadesAtuais.find((n: { tipo: string }) => n.tipo === 'O-').nivel).toBe('CRITICO');
    expect(r.body.tiposCriticos).toBe(1);
    expect(r.body.evolucao.criticosPorDia.at(-1)).toMatchObject({ data: hoje, tiposCriticos: 1, alteracoes: 3 });
    expect(r.body.evolucao.criticosPorDia[0].tiposCriticos).toBe(0);
    const oNeg = r.body.evolucao.porTipo.find((t: { tipo: string }) => t.tipo === 'O-');
    expect(oNeg.alteracoes.map((a: { para: string }) => a.para)).toEqual(['BAIXO', 'CRITICO']);
    expect(r.body.semDados).toBe(false);
  });

  it('período alterado e sem dados (FE01)', async () => {
    const r = await rep(`/representante/indicadores?de=${somarDias(hoje, -61)}&ate=${somarDias(hoje, -59)}`).expect(200);
    expect(r.body.totalDoacoes).toBe(1);
    const vazio = await rep('/representante/indicadores?de=2020-01-01&ate=2020-01-31').expect(200);
    expect(vazio.body).toMatchObject({ semDados: true, mensagem: expect.stringMatching(/não há dados/i) });
    await rep(`/representante/indicadores?de=${hoje}&ate=${somarDias(hoje, -1)}`).expect(400);
  });

  it('outro hospital não enxerga estes dados (RN08)', async () => {
    const outro = await criarRepresentante(prisma, (await criarHospital(prisma)).id);
    const r = await get(await entrar(app, outro.email))('/representante/indicadores').expect(200);
    expect(r.body.totalDoacoes).toBe(0);
  });

  it('dashboard geral: agregados, doadores aprovados e críticos por estado (HEM-52)', async () => {
    const r = await admin('/admin/indicadores').expect(200);
    expect(r.body.totalDoacoes).toBeGreaterThanOrEqual(3);
    expect(r.body.totalDoadoresAprovados).toBeGreaterThanOrEqual(1);
    expect(r.body.criticosPorEstado).toContainEqual(expect.objectContaining({ estado: 'RR' }));
    expect(r.body.necessidadesAtuais[0]).toHaveProperty('hospitaisPorNivel');
    // Nenhum conteúdo clínico no dashboard.
    expect(JSON.stringify(r.body)).not.toMatch(/exame|observac|consulta/i);
    await rep('/admin/indicadores').expect(403);
  });

  it('emite PDF de doações por tipo e de histórico para o representante (HEM-53)', async () => {
    for (const tipo of ['doacoes-por-tipo', 'historico-necessidades']) {
      const r = await binario(rep(`/representante/relatorios/${tipo}?de=${somarDias(hoje, -29)}&ate=${hoje}`)).expect(200);
      expect(r.headers['content-type']).toBe('application/pdf');
      expect(r.headers['content-disposition']).toContain(`hemobridge-${tipo}`);
      expect((r.body as Buffer).subarray(0, 5).toString()).toBe('%PDF-');
    }
  });

  it('valida período e ausência de dados no relatório (FE01, FE02)', async () => {
    await rep(`/representante/relatorios/doacoes-por-tipo?de=${somarDias(hoje, 1)}&ate=${somarDias(hoje, 2)}`).expect(400);
    await rep(`/representante/relatorios/doacoes-por-tipo?de=${hoje}`).expect(400);
    const vazio = await rep('/representante/relatorios/doacoes-por-tipo?de=2020-01-01&ate=2020-01-31').expect(422);
    expect(vazio.body.message).toMatch(/Não há dados/);
    await rep('/representante/relatorios/inexistente?de=2026-01-01&ate=2026-01-31').expect(400);
  });

  it('consolidado por hospital é só do administrador', async () => {
    await rep(`/representante/relatorios/consolidado-por-hospital?de=${somarDias(hoje, -29)}&ate=${hoje}`).expect(403);
    const r = await binario(
      admin(`/admin/relatorios/consolidado-por-hospital?de=${somarDias(hoje, -29)}&ate=${hoje}`),
    ).expect(200);
    expect((r.body as Buffer).subarray(0, 5).toString()).toBe('%PDF-');
    const emitidos = await prisma.logAuditoria.count({
      where: { acao: 'EMITIR_RELATORIO', entidadeId: 'consolidado-por-hospital' },
    });
    expect(emitidos).toBeGreaterThanOrEqual(1);
  });
});
