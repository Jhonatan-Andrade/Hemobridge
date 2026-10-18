import type { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { entrar, prismaTeste, subirApp } from './apoio/app.js';
import { criarHospital, criarMedico, criarPaciente, criarRepresentante, definirNivel } from './apoio/fixtures.js';

// HEM-33 / UC03 – filtros por estado, cidade e tipo sanguíneo.
describe('Filtros de bancos de sangue (integração)', () => {
  let app: INestApplication<App>;
  const prisma = prismaTeste();
  const cidade = `Cidade E2E ${randomUUID().slice(0, 6)}`;
  const ids: Record<string, string> = {};

  beforeAll(async () => {
    app = await subirApp();
    // Três bancos numa cidade exclusiva desta execução.
    const critico = await criarHospital(prisma, { estado: 'AC', cidade, nome: 'B Crítico' });
    const baixo = await criarHospital(prisma, { estado: 'AC', cidade, nome: 'A Baixo' });
    const semO = await criarHospital(prisma, { estado: 'AC', cidade, nome: 'C Sem O-' });
    const rep = await criarRepresentante(prisma, critico.id);
    await definirNivel(prisma, critico.id, 'O-', 'CRITICO', rep.id);
    await definirNivel(prisma, baixo.id, 'O-', 'BAIXO', rep.id);
    await definirNivel(prisma, semO.id, 'A+', 'CRITICO', rep.id);
    Object.assign(ids, { critico: critico.id, baixo: baixo.id, semO: semO.id, rep: rep.id });
  }, 60_000);
  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  const listar = (query: Record<string, string>) =>
    request(app.getHttpServer()).get('/hospitais').query(query).expect(200);

  it('filtra por estado e cidade, sem distinguir acentos e maiúsculas', async () => {
    const r = await listar({ estado: 'ac', cidade: cidade.toUpperCase() });
    expect(r.body.total).toBe(3);
  });

  it('com tipo, mostra só quem informou o nível e ordena pela necessidade (RN02)', async () => {
    const r = await listar({ estado: 'AC', cidade, tipos: 'O-' });
    expect(r.body.itens.map((h: { id: string }) => h.id)).toEqual([ids.critico, ids.baixo]);
  });

  it('aceita vários tipos', async () => {
    const r = await listar({ estado: 'AC', cidade, tipos: 'O-,A+' });
    expect(r.body.total).toBe(3);
  });

  it('sem resultados, sugere ampliar a busca (FE01)', async () => {
    const r = await listar({ estado: 'AC', cidade, tipos: 'AB-' });
    expect(r.body.total).toBe(0);
    expect(r.body.mensagem).toMatch(/ampliar a busca/);
  });

  it('pré-preenche cidade, estado e o tipo do Doador (FA01)', async () => {
    const medico = await criarMedico(prisma, ids.critico, ids.rep);
    const doador = await criarPaciente(prisma, { situacao: 'APROVADO', tipo: 'B-', medicoId: medico.id, cidade: 'Londrina' });
    const token = await entrar(app, doador.email);
    const r = await request(app.getHttpServer())
      .get('/hospitais/filtros-padrao')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(r.body).toEqual({ estado: 'PR', cidade: 'Londrina', tipos: ['B-'] });
  });

  it('filtros padrão exigem login', async () => {
    await request(app.getHttpServer()).get('/hospitais/filtros-padrao').expect(401);
  });
});
