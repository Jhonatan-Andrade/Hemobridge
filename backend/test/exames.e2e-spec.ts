import type { INestApplication } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { sha256 } from '../src/armazenamento/arquivo-exame.js';
import { entrar, prismaTeste, subirApp } from './apoio/app.js';
import {
  agendarConsulta,
  criarDisponibilidade,
  criarHospital,
  criarMedico,
  criarPaciente,
  criarRepresentante,
} from './apoio/fixtures.js';

// HEM-44 (UC15) e HEM-45 (UC11): solicitação, envio, reenvio e acesso ao arquivo.
describe('Exames (integração)', () => {
  let app: INestApplication<App>;
  const prisma = prismaTeste();
  const pdf = Buffer.concat([Buffer.from('%PDF-1.7\n'), randomBytes(4096)]);
  let hospitalId: string;
  let rep: { id: string; email: string };

  beforeAll(async () => {
    app = await subirApp();
    hospitalId = (await criarHospital(prisma)).id;
    rep = await criarRepresentante(prisma, hospitalId);
  }, 60_000);
  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  const comToken = (token: string) => ({
    get: (url: string) => request(app.getHttpServer()).get(url).set('Authorization', `Bearer ${token}`),
    post: (url: string) => request(app.getHttpServer()).post(url).set('Authorization', `Bearer ${token}`),
  });

  /** Paciente com consulta que começou há 1 hora, e os tokens de paciente e médico. */
  async function cenario() {
    const medico = await criarMedico(prisma, hospitalId, rep.id);
    const paciente = await criarPaciente(prisma);
    const horario = await criarDisponibilidade(prisma, medico.id, -1);
    const consulta = await agendarConsulta(prisma, paciente.id, horario);
    return {
      medico,
      paciente,
      consulta,
      m: comToken(await entrar(app, medico.email)),
      p: comToken(await entrar(app, paciente.email)),
    };
  }

  async function comSolicitacao() {
    const c = await cenario();
    const r = await c.m
      .post(`/medico/consultas/${c.consulta.id}/solicitar-exames`)
      .send({ exames: ['Tipagem ABO/Rh'], orientacoes: 'Jejum não é necessário.' })
      .expect(201);
    return { ...c, solicitacaoId: r.body.id as string };
  }

  it('médico solicita exames: paciente vai a AGUARDANDO_EXAME e é notificado (UC15)', async () => {
    const { paciente, solicitacaoId, p } = await comSolicitacao();
    expect((await prisma.paciente.findUniqueOrThrow({ where: { usuarioId: paciente.id } })).situacao).toBe('AGUARDANDO_EXAME');
    expect(await prisma.notificacao.count({ where: { usuarioId: paciente.id, titulo: 'Exames solicitados' } })).toBe(1);

    const r = await p.get('/paciente/exames').expect(200);
    expect(r.body.itens[0]).toMatchObject({
      id: solicitacaoId,
      exames: ['Tipagem ABO/Rh'],
      orientacoes: 'Jejum não é necessário.',
      situacao: 'AGUARDANDO_RESULTADO',
      podeEnviar: true,
    });
  });

  it('exige ao menos um exame (FE01) e só o médico da consulta solicita', async () => {
    const { consulta, m } = await cenario();
    await m.post(`/medico/consultas/${consulta.id}/solicitar-exames`).send({ exames: [] }).expect(400);
    const outro = await cenario();
    await outro.m.post(`/medico/consultas/${consulta.id}/solicitar-exames`).send({ exames: ['X'] }).expect(404);
  });

  it('não solicita antes de a consulta começar', async () => {
    const medico = await criarMedico(prisma, hospitalId, rep.id);
    const paciente = await criarPaciente(prisma);
    const consulta = await agendarConsulta(prisma, paciente.id, await criarDisponibilidade(prisma, medico.id, 30));
    const m = comToken(await entrar(app, medico.email));
    await m.post(`/medico/consultas/${consulta.id}/solicitar-exames`).send({ exames: ['X'] }).expect(422);
  });

  it('recusa formato inválido e arquivo acima de 5 MB (PT07)', async () => {
    const { solicitacaoId, p } = await comSolicitacao();
    const zip = await p
      .post(`/paciente/exames/${solicitacaoId}/envios`)
      .attach('arquivo', Buffer.from('PK\x03\x04conteudo'), 'exame.pdf')
      .expect(400);
    expect(zip.body.message).toMatch(/PDF, JPG ou PNG/);

    const grande = Buffer.concat([pdf, Buffer.alloc(5 * 1024 * 1024)]);
    const r = await p.post(`/paciente/exames/${solicitacaoId}/envios`).attach('arquivo', grande, 'grande.pdf').expect(413);
    expect(r.body.message).toMatch(/até 5 MB/);
  });

  it('envia PDF válido: guarda metadados e hash, paciente vai a EM_ANALISE (PT07)', async () => {
    const { paciente, solicitacaoId, p } = await comSolicitacao();
    const r = await p
      .post(`/paciente/exames/${solicitacaoId}/envios`)
      .attach('arquivo', pdf, 'Resultado tipagem.pdf')
      .expect(201);
    expect(r.body.situacaoPaciente).toBe('EM_ANALISE');

    const exame = await prisma.exame.findUniqueOrThrow({ where: { id: r.body.exame.id } });
    expect(exame).toMatchObject({
      situacao: 'EM_ANALISE',
      mimeType: 'application/pdf',
      nomeOriginal: 'Resultado tipagem.pdf',
      tamanhoBytes: pdf.length,
      hashSha256: sha256(pdf),
    });
    expect((await prisma.paciente.findUniqueOrThrow({ where: { usuarioId: paciente.id } })).situacao).toBe('EM_ANALISE');

    // Em análise: não aceita outro envio.
    await p.post(`/paciente/exames/${solicitacaoId}/envios`).attach('arquivo', pdf, 'de-novo.pdf').expect(409);
  });

  it('reenvio após reprovação cria novo registro e mantém o reprovado (PT08)', async () => {
    const { medico, solicitacaoId, p } = await comSolicitacao();
    const primeiro = await p.post(`/paciente/exames/${solicitacaoId}/envios`).attach('arquivo', pdf, 'a.pdf').expect(201);
    // Reprovação pelo médico (UC16, HEM-46) simulada direto no banco.
    await prisma.exame.update({
      where: { id: primeiro.body.exame.id },
      data: { situacao: 'REPROVADO', motivoReprovacao: 'Imagem ilegível', medicoAvaliadorId: medico.id, avaliadoEm: new Date() },
    });

    const lista = await p.get('/paciente/exames').expect(200);
    expect(lista.body.itens[0]).toMatchObject({ situacao: 'REPROVADO', motivoReprovacao: 'Imagem ilegível', podeEnviar: true });

    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...randomBytes(500)]);
    await p.post(`/paciente/exames/${solicitacaoId}/envios`).attach('arquivo', png, 'b.png').expect(201);

    const envios = await prisma.exame.findMany({ where: { solicitacaoExameId: solicitacaoId }, orderBy: { enviadoEm: 'asc' } });
    expect(envios.map((e) => e.situacao)).toEqual(['REPROVADO', 'EM_ANALISE']);
  });

  it('arquivo só para o paciente e o médico da consulta (RN19, PT17)', async () => {
    const { solicitacaoId, p, m } = await comSolicitacao();
    const r = await p.post(`/paciente/exames/${solicitacaoId}/envios`).attach('arquivo', pdf, 'r.pdf').expect(201);
    const exameId = r.body.exame.id as string;
    const binario = (req: request.Test) =>
      req.buffer(true).parse((res, cb) => {
        const partes: Buffer[] = [];
        res.on('data', (c: Buffer) => partes.push(c));
        res.on('end', () => cb(null, Buffer.concat(partes)));
      });

    const doPaciente = await binario(p.get(`/paciente/exames/envios/${exameId}/arquivo`)).expect(200);
    expect(Buffer.compare(doPaciente.body as Buffer, pdf)).toBe(0);
    expect(doPaciente.headers['content-type']).toBe('application/pdf');
    await binario(m.get(`/medico/exames/${exameId}/arquivo`)).expect(200);

    const outroMedico = (await cenario()).m;
    await outroMedico.get(`/medico/exames/${exameId}/arquivo`).expect(404);
    const outroPaciente = (await cenario()).p;
    await outroPaciente.get(`/paciente/exames/envios/${exameId}/arquivo`).expect(404);
    const representante = comToken(await entrar(app, rep.email));
    await representante.get(`/medico/exames/${exameId}/arquivo`).expect(403);
    await representante.get(`/paciente/exames/envios/${exameId}/arquivo`).expect(403);

    expect(await prisma.logAuditoria.count({ where: { acao: 'VISUALIZAR_EXAME', entidadeId: exameId } })).toBe(2);
  });
});
