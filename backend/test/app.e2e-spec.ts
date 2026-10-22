import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { subirApp } from './apoio/app.js';

describe('disponibilidade da API', () => {
  let app: INestApplication<App>;

  beforeAll(async () => { app = await subirApp(); });

  it('expõe prontidão do banco sem informações privadas', async () => {
    await request(app.getHttpServer()).get('/health/ready').expect(200);
    const response = await request(app.getHttpServer()).get('/').expect(200);
    expect(response.body.service).toBe('HemoBridge');
  });
  it('encerra a rota antiga de publicações locais', async () => {
    await request(app.getHttpServer()).get('/post').expect(410);
  });
  afterAll(async () => { await app?.close(); });
});
