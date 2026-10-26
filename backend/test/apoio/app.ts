import 'reflect-metadata';
import 'dotenv/config';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerStorage } from '@nestjs/throttler';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../../src/app.module.js';
import { PrismaClient } from '../../src/generated/prisma/client.js';
import { criarAdapterPg } from '../../src/prisma/adapter.js';
import { SENHA_TESTE } from './fixtures.js';

function exigirBancoDescartavel() {
  const name = new URL(
    process.env.DATABASE_URL ?? 'postgresql://invalid/blocked',
  ).pathname;
  if (!/_(validation|test|teste)$/.test(name))
    throw new Error(
      'Testes de integração exigem banco descartável com sufixo _validation, _test ou _teste.',
    );
}

// Sobe a API completa (mesmos pipes do main.ts) contra um banco descartável.
// O limite de requisições fica desligado para os testes não esperarem.
export async function subirApp(): Promise<INestApplication<App>> {
  exigirBancoDescartavel();
  process.env['NOTIFICACOES_REENVIO_MINUTOS'] = '0';
  const modulo = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(ThrottlerStorage)
    .useValue({
      increment: async () => ({
        totalHits: 1,
        timeToExpire: 60,
        isBlocked: false,
        timeToBlockExpire: 0,
      }),
    })
    .compile();
  const app = modulo.createNestApplication<INestApplication<App>>();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.init();
  return app;
}

export const prismaTeste = () => {
  exigirBancoDescartavel();
  return new PrismaClient({
    adapter: criarAdapterPg(process.env['DATABASE_URL']!),
  });
};

export async function entrar(
  app: INestApplication<App>,
  email: string,
): Promise<string> {
  const r = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email, senha: SENHA_TESTE })
    .expect(200);
  return r.body.accessToken as string;
}

/** Mensagens recebidas no Mailpit (via túnel ou docker local). */
export async function emailsPara(
  destinatario: string,
): Promise<{ Subject: string; ID: string }[]> {
  const base = process.env['MAILPIT_URL'] ?? 'http://localhost:8025';
  const r = await fetch(
    `${base}/api/v1/search?query=${encodeURIComponent(`to:${destinatario}`)}`,
  );
  if (!r.ok) return [];
  return ((await r.json()) as { messages: { Subject: string; ID: string }[] })
    .messages;
}
