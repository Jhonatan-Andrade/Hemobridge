import type { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
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
  definirNivel,
  registrarDoacao,
} from './apoio/fixtures.js';

// O helper recusa bancos que não tenham o sufixo descartável _test/_teste/_validation.
describe('Recomendação autenticada de locais de doação', () => {
  const prisma = prismaTeste();
  let app: INestApplication<App>;
  const cidade = `Cidade recomendação ${randomUUID().slice(0, 6)}`;
  const hospitais: Record<string, string> = {};
  let pacienteId: string,
    token: string,
    medicoId: string,
    representanteId: string,
    hospitalId: string;
  let medicoEmail: string, representanteEmail: string;
  const api = () => request(app.getHttpServer());
  const consultar = (sessao = token) =>
    api().get('/paciente/locais-recomendados').auth(sessao, { type: 'bearer' });
  const desteCenario = (itens: { hospital: { id: string } }[]) =>
    itens.filter((item) => Object.values(hospitais).includes(item.hospital.id));

  beforeAll(async () => {
    app = await subirApp();
    const dados = [
      ['exatoCidade', 'CRITICO', 'O+', cidade, 'RS', -28],
      ['exatoEstado', 'CRITICO', 'O+', 'Outra cidade', 'RS', -29.99],
      ['exatoFora', 'CRITICO', 'O+', cidade, 'SC', -30],
      ['compativelCidade', 'CRITICO', 'A+', cidade, 'RS', -30],
      ['baixo', 'BAIXO', 'O+', cidade, 'RS', -30],
      ['estavel', 'ESTAVEL', 'O+', cidade, 'RS', -30],
      ['adequado', 'ADEQUADO', 'O+', cidade, 'RS', -30],
      ['incompativel', 'CRITICO', 'O-', cidade, 'RS', -30],
      ['inativo', 'CRITICO', 'O+', cidade, 'RS', -30],
    ] as const;
    for (const [chave, nivel, tipo, localidade, estado, latitude] of dados) {
      const hospital = await criarHospital(prisma, {
        nome: `Instituição ${chave}`,
        cidade: localidade,
        estado,
        latitude,
        longitude: -51,
      });
      const representante = await criarRepresentante(prisma, hospital.id);
      await definirNivel(prisma, hospital.id, tipo, nivel, representante.id);
      hospitais[chave] = hospital.id;
      if (chave === 'exatoCidade') {
        hospitalId = hospital.id;
        representanteId = representante.id;
        representanteEmail = representante.email;
        const medico = await criarMedico(prisma, hospital.id, representante.id);
        medicoId = medico.id;
        medicoEmail = medico.email;
      }
      if (chave === 'inativo')
        await prisma.hospital.update({
          where: { id: hospital.id },
          data: { ativo: false },
        });
    }
    const naoInformado = await criarHospital(prisma, { cidade, estado: 'RS' });
    hospitais.naoInformado = naoInformado.id;
    const paciente = await criarPaciente(prisma, {
      situacao: 'APROVADO',
      tipo: 'O+',
      medicoId,
      cidade,
      estado: 'RS',
    });
    pacienteId = paciente.id;
    token = await entrar(app, paciente.email);
  }, 60_000);

  afterAll(async () => {
    await app?.close();
    await prisma.$disconnect();
  });

  it('exige autenticação e impede os demais perfis', async () => {
    await api().get('/paciente/locais-recomendados').expect(401);
    const administrador = await criarAdministrador(prisma);
    for (const email of [
      medicoEmail,
      representanteEmail,
      administrador.email,
    ]) {
      await consultar(await entrar(app, email)).expect(403);
    }
  });

  it('recusa paciente ainda não aprovado sem bloquear a consulta pública', async () => {
    const paciente = await criarPaciente(prisma, { cidade, estado: 'RS' });
    const resposta = await consultar(await entrar(app, paciente.email)).expect(
      403,
    );
    expect(resposta.body.message).toMatch(/aprov[aã]ç|aprovação/);
    const publica = await api()
      .get('/hospitais')
      .query({ cidade, estado: 'RS' })
      .expect(200);
    expect(
      publica.body.itens.some((item: { id: string }) => item.id === hospitalId),
    ).toBe(true);
  });

  it('usa o tipo persistido e a relação RN05, exclui necessidades inadequadas e prioriza antes da distância', async () => {
    const resposta = await consultar()
      .query({ lat: -30, lng: -51 })
      .expect(200);
    expect(resposta.body.tipoDoador).toBe('O+');
    const itens = desteCenario(resposta.body.itens) as {
      id: string;
      tipoNecessitado: string;
      nivel: string;
      atualizadoEm: string;
      distanciaKm: number;
      hospital: { id: string; latitude: number; longitude: number };
    }[];
    expect(itens.map((item) => item.hospital.id)).toEqual([
      hospitais.exatoCidade,
      hospitais.exatoEstado,
      hospitais.exatoFora,
      hospitais.compativelCidade,
      hospitais.baixo,
      hospitais.estavel,
    ]);
    expect(itens.map((item) => item.tipoNecessitado)).toEqual([
      'O+',
      'O+',
      'O+',
      'A+',
      'O+',
      'O+',
    ]);
    expect(
      itens.every((item) =>
        ['CRITICO', 'BAIXO', 'ESTAVEL'].includes(item.nivel),
      ),
    ).toBe(true);
    expect(
      itens.every((item) => !Number.isNaN(Date.parse(item.atualizadoEm))),
    ).toBe(true);
    expect(itens[0].distanciaKm).toBeGreaterThan(itens[1].distanciaKm);
    expect(resposta.body).toMatchObject({
      referencia: { cidade, estado: 'RS' },
      dataEstimadaElegibilidade: hojeIso(),
    });
  });

  it('funciona sem GPS e não aceita tipo/localidade manipulados ou coordenadas inválidas', async () => {
    const resposta = await consultar().expect(200);
    expect(
      resposta.body.itens.every(
        (item: { distanciaKm: number | null }) => item.distanciaKm === null,
      ),
    ).toBe(true);
    for (const query of [
      { tipo: 'O-' },
      { cidade: 'Outra' },
      { estado: 'SC' },
      { lat: '91', lng: '0' },
      { lat: '-30' },
    ]) {
      await consultar().query(query).expect(400);
    }
  });

  it('registra o acesso no log de auditoria sem tipagem, elegibilidade ou coordenadas', async () => {
    await consultar().query({ lat: -30, lng: -51 }).expect(200);
    const registro = await prisma.logAuditoria.findFirst({
      where: { usuarioId: pacienteId, acao: 'CONSULTAR_LOCAIS_RECOMENDADOS' },
    });
    expect(registro).toMatchObject({
      usuarioId: pacienteId,
      entidade: 'paciente',
      entidadeId: pacienteId,
    });
    expect(registro!.detalhes).toBeNull();
  });

  it('consulta o histórico de doações do próprio paciente e retorna a data estimada sem liberar triagem automaticamente', async () => {
    const paciente = await criarPaciente(prisma, {
      situacao: 'APROVADO',
      tipo: 'O+',
      medicoId,
      cidade,
      estado: 'RS',
    });
    await registrarDoacao(prisma, {
      hospitalId,
      representanteId,
      pacienteId: paciente.id,
      tipo: 'O+',
      dataColeta: hojeIso(),
    });
    const resposta = await consultar(await entrar(app, paciente.email)).expect(
      200,
    );
    expect(resposta.body.elegibilidade).toMatchObject({
      elegivel: false,
      motivo: 'INTERVALO',
    });
    expect(resposta.body.dataEstimadaElegibilidade).toBe(
      somarDias(hojeIso(), 60),
    );
    expect(resposta.body.orientacao).toContain('triagem presencial');
    expect(desteCenario(resposta.body.itens).length).toBeGreaterThan(0);
  });
});
