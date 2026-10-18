import type { INestApplication } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { ArmazenamentoService } from '../src/armazenamento/armazenamento.service.js';
import { sha256 } from '../src/armazenamento/arquivo-exame.js';
import { EmailService } from '../src/email/email.service.js';
import { emailsPara, entrar, prismaTeste, subirApp } from './apoio/app.js';
import { criarHospital, criarMedico, criarPaciente, criarRepresentante, definirNivel } from './apoio/fixtures.js';

// Integração com banco, S3 e Mailpit reais (HEM-17, HEM-36, HEM-37, HEM-38).
// Requer o .env apontando para a VM (túnel SSH) ou para o docker-compose local.
describe('Notificações e armazenamento (integração)', () => {
  let app: INestApplication<App>;
  const prisma = prismaTeste();

  beforeAll(async () => {
    app = await subirApp();
  }, 60_000);
  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it('HEM-17: envia e lê um arquivo do S3 cifrado, com hash SHA-256', async () => {
    const armazenamento = app.get(ArmazenamentoService);
    const pdf = Buffer.concat([Buffer.from('%PDF-1.7\n'), randomBytes(2048)]);
    const r = await armazenamento.enviar(pdf, { prefixo: 'e2e', mimeType: 'application/pdf' });
    expect(r.hashSha256).toBe(sha256(pdf));
    expect((await armazenamento.obter(r.chave)).equals(pdf)).toBe(true);
    await armazenamento.remover(r.chave);
  });

  it('HEM-17: a função de e-mail entrega uma mensagem real no Mailpit', async () => {
    const destino = `e2e.email.${Date.now()}@teste.local`;
    await app.get(EmailService).enviar({ para: destino, assunto: 'Teste HEM-17', texto: 'Envio real de teste.' });
    await expect.poll(async () => (await emailsPara(destino)).map((m) => m.Subject)).toContain('Teste HEM-17');
  });

  it('HEM-38/37: necessidade crítica avisa doadores compatíveis do estado, uma vez por banco', async () => {
    const hospital = await criarHospital(prisma, { estado: 'PR' });
    const rep = await criarRepresentante(prisma, hospital.id);
    const medico = await criarMedico(prisma, hospital.id, rep.id);
    const compativel = await criarPaciente(prisma, { situacao: 'APROVADO', tipo: 'O-', medicoId: medico.id });
    const incompativel = await criarPaciente(prisma, { situacao: 'APROVADO', tipo: 'A+', medicoId: medico.id });
    const outroEstado = await criarPaciente(prisma, { situacao: 'APROVADO', tipo: 'O-', medicoId: medico.id, estado: 'SP' });
    const naoAprovado = await criarPaciente(prisma);
    await definirNivel(prisma, hospital.id, 'O+', 'BAIXO', rep.id);

    const token = await entrar(app, rep.email);
    const atualizar = (nivel: string) =>
      request(app.getHttpServer())
        .put('/representante/necessidades')
        .set('Authorization', `Bearer ${token}`)
        .send({ niveis: [{ tipo: 'O+', nivel }] })
        .expect(200);

    const r = await atualizar('CRITICO');
    expect(r.body.passaramACritico).toEqual(['O+']);
    // O banco de desenvolvimento pode ter doadores compatíveis de execuções anteriores.
    expect(r.body.doadoresNotificados).toBeGreaterThanOrEqual(1);

    const recebidas = await prisma.notificacao.findMany({
      where: { usuarioId: { in: [compativel.id, incompativel.id, outroEstado.id, naoAprovado.id] } },
    });
    expect(recebidas.map((n) => n.usuarioId)).toEqual([compativel.id]);
    expect(recebidas[0].mensagem).toContain(hospital.nome);
    await expect
      .poll(async () => (await prisma.notificacao.findUniqueOrThrow({ where: { id: recebidas[0].id } })).emailEnviadoEm)
      .not.toBeNull();
    await expect.poll(async () => (await emailsPara(compativel.email)).length).toBe(1);

    // RN20: voltar a CRITICO no mesmo banco em menos de 7 dias não repete o aviso.
    await atualizar('BAIXO');
    expect((await atualizar('CRITICO')).body.doadoresNotificados).toBe(0);

    // UC12: o doador vê, abre (marca como lida) e o contador zera.
    const tokenDoador = await entrar(app, compativel.email);
    const api = () => request(app.getHttpServer());
    const lista = await api().get('/notificacoes').set('Authorization', `Bearer ${tokenDoador}`).expect(200);
    expect(lista.body).toMatchObject({ total: 1, naoLidas: 1 });
    const id = lista.body.itens[0].id;
    await api().get(`/notificacoes/${id}`).set('Authorization', `Bearer ${tokenDoador}`).expect(200);
    const contador = await api().get('/notificacoes/nao-lidas').set('Authorization', `Bearer ${tokenDoador}`);
    expect(contador.body).toEqual({ naoLidas: 0 });

    // Outro usuário não acessa a notificação.
    const tokenOutro = await entrar(app, incompativel.email);
    await api().get(`/notificacoes/${id}`).set('Authorization', `Bearer ${tokenOutro}`).expect(404);
  }, 60_000);
});
