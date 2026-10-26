import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { VERSAO_PRE_TRIAGEM } from '../../src/consultas/pre-triagem.dto.js';

/** Respostas explícitas do cenário sintético; a API nunca as presume para usuários. */
export async function responderPreTriagemTeste(app: INestApplication<App>, token: string,
  respostas: { pesoKg?: number; doouAntes?: boolean; dataUltimaDoacao?: string;
    doouAntesDos60?: boolean; condicaoSaudeRequerAvaliacao?: boolean } = {}) {
  const r = await request(app.getHttpServer()).post('/paciente/pre-triagem').auth(token, { type: 'bearer' })
    .send({ versao: VERSAO_PRE_TRIAGEM, pesoKg: 70, doouAntes: false,
      condicaoSaudeRequerAvaliacao: false, ...respostas }).expect(201);
  return r.body.id as string;
}
