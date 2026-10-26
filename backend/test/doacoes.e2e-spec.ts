import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { hojeIso } from '../src/common/data.js';
import { somarDias } from '../src/common/elegibilidade.js';
import { entrar, prismaTeste, subirApp } from './apoio/app.js';
import {
  criarHospital,
  criarMedico,
  criarPaciente,
  criarRepresentante,
  definirNivel,
  gerarCpf,
  tipoId,
} from './apoio/fixtures.js';

// HEM-50 / UC20 FA01 – doação avulsa (RN08, RN11; PT14).
describe('Doações avulsas (integração)', () => {
  let app: INestApplication<App>;
  const prisma = prismaTeste();
  let hospitalId: string;
  let api: { get: (u: string) => request.Test; post: (u: string) => request.Test };
  let doadorCpf: string;

  beforeAll(async () => {
    app = await subirApp();
    hospitalId = (await criarHospital(prisma)).id;
    const rep = await criarRepresentante(prisma, hospitalId);
    const medico = await criarMedico(prisma, hospitalId, rep.id);
    const doador = await criarPaciente(prisma, { situacao: 'APROVADO', tipo: 'AB-', medicoId: medico.id });
    doadorCpf = doador.cpf;
    await definirNivel(prisma, hospitalId, 'O-', 'CRITICO', rep.id);
    const token = await entrar(app, rep.email);
    api = {
      get: (u) => request(app.getHttpServer()).get(u).set('Authorization', `Bearer ${token}`),
      post: (u) => request(app.getHttpServer()).post(u).set('Authorization', `Bearer ${token}`),
    };
  }, 60_000);
  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it('localiza doador aprovado pelo CPF, com máscara', async () => {
    const mascarado = `${doadorCpf.slice(0, 3)}.${doadorCpf.slice(3, 6)}.${doadorCpf.slice(6, 9)}-${doadorCpf.slice(9)}`;
    const r = await api.post('/representante/doacoes/buscar-doador').send({ cpf: mascarado }).expect(200);
    expect(r.body).toMatchObject({ encontrado: true, doador: { tipo: 'AB-' } });
  });

  it('CPF sem doador aprovado oferece a doação avulsa (FA01); CPF inválido é recusado (FE01)', async () => {
    const r = await api.post('/representante/doacoes/buscar-doador').send({ cpf: gerarCpf() }).expect(200);
    expect(r.body).toMatchObject({ encontrado: false, podeRegistrarAvulsa: true });
    await api.post('/representante/doacoes/buscar-doador').send({ cpf: '12345678900' }).expect(400);
  });

  it('registra avulsa sem paciente, no próprio hospital, sem mudar o nível (PT14)', async () => {
    const ontem = somarDias(hojeIso(), -1);
    const r = await api.post('/representante/doacoes/avulsa').send({ dataColeta: ontem, tipo: 'o-' }).expect(201);
    expect(r.body.doacao).toMatchObject({ avulsa: true, tipo: 'O-', dataColeta: ontem });
    expect(r.body.avisos.join(' ')).toMatch(/triagem do hemocentro/);

    const gravada = await prisma.doacao.findUniqueOrThrow({ where: { id: r.body.doacao.id } });
    expect(gravada).toMatchObject({ pacienteId: null, hospitalId, pesoAferido: null });
    const nivel = await prisma.necessidadeEstoque.findUniqueOrThrow({
      where: { hospitalId_tipoSanguineoId: { hospitalId, tipoSanguineoId: await tipoId(prisma, 'O-') } },
    });
    expect(nivel.nivel).toBe('CRITICO');

    const lista = await api.get('/representante/doacoes').expect(200);
    expect(lista.body.itens[0]).toMatchObject({ id: r.body.doacao.id, avulsa: true, doador: null });
  });

  it('recusa data de coleta futura (FE03) e tipo inválido', async () => {
    const amanha = somarDias(hojeIso(), 1);
    await api.post('/representante/doacoes/avulsa').send({ dataColeta: amanha, tipo: 'A+' }).expect(422);
    await api.post('/representante/doacoes/avulsa').send({ dataColeta: hojeIso(), tipo: 'C+' }).expect(400);
  });

  it('outro hospital não vê as doações deste (RN08)', async () => {
    const outroRep = await criarRepresentante(prisma, (await criarHospital(prisma)).id);
    const token = await entrar(app, outroRep.email);
    const r = await request(app.getHttpServer()).get('/representante/doacoes').set('Authorization', `Bearer ${token}`).expect(200);
    expect(r.body.total).toBe(0);
  });
});
