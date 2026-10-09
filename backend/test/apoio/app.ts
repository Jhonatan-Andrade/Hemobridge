import 'reflect-metadata';
import 'dotenv/config';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../../src/app.module.js';
import { PrismaClient } from '../../src/generated/prisma/client.js';
import { criarAdapterPg } from '../../src/prisma/adapter.js';
import { SENHA_TESTE } from './fixtures.js';

// Sobe a API completa (mesmos pipes do main.ts) contra o banco do .env.
// O limite de requisições fica desligado para os testes não esperarem.
export async function subirApp(): Promise<INestApplication<App>> {
  process.env['NOTIFICACOES_REENVIO_MINUTOS'] = '0';
  const modulo = await Test.createTestingModule({ imports: [AppModule] })
    .overrideGuard(ThrottlerGuard)
    .useValue({ canActivate: () => true })
    .compile();
  const app = modulo.createNestApplication<INestApplication<App>>();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  await app.init();
  return app;
}

export const prismaTeste = () => new PrismaClient({ adapter: criarAdapterPg(process.env['DATABASE_URL']!) });

export async function entrar(app: INestApplication<App>, email: string): Promise<string> {
  const r = await request(app.getHttpServer()).post('/auth/login').send({ email, senha: SENHA_TESTE }).expect(200);
  return r.body.accessToken as string;
}

/** Mensagens recebidas no Mailpit (via túnel ou docker local). */
export async function emailsPara(destinatario: string): Promise<{ Subject: string; ID: string }[]> {
  const base = process.env['MAILPIT_URL'] ?? 'http://localhost:8025';
  const r = await fetch(`${base}/api/v1/search?query=${encodeURIComponent(`to:${destinatario}`)}`);
  if (!r.ok) return [];
  return ((await r.json()) as { messages: { Subject: string; ID: string }[] }).messages;
}
