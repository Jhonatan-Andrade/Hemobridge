import { CallHandler, ExecutionContext, Injectable, PayloadTooLargeException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Observable } from 'rxjs';

// RN19: PDF, JPG ou PNG com até 5 MB.
export const LIMITE_ARQUIVO_EXAME = 5 * 1024 * 1024;
export const MENSAGEM_ARQUIVO_INVALIDO = 'Envie um arquivo PDF, JPG ou PNG com até 5 MB.';

/** Arquivo recebido pelo multer (memória). */
export interface ArquivoRecebido {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

const ASSINATURAS = [
  { mimeType: 'application/pdf', extensao: 'pdf', bytes: [0x25, 0x50, 0x44, 0x46, 0x2d] }, // %PDF-
  { mimeType: 'image/png', extensao: 'png', bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { mimeType: 'image/jpeg', extensao: 'jpg', bytes: [0xff, 0xd8, 0xff] },
] as const;

/** Tipo real do arquivo pelos primeiros bytes; o tipo declarado pelo navegador não é confiável. */
export function detectarTipoExame(conteudo: Buffer) {
  return ASSINATURAS.find((a) => a.bytes.every((b, i) => conteudo[i] === b)) ?? null;
}

/** O multer entrega o nome em latin1; corrige a codificação e remove caracteres problemáticos. */
export function nomeArquivoSeguro(original: string, extensao: string): string {
  const nome = Buffer.from(original, 'latin1')
    .toString('utf8')
    .replace(/[\\/:*?"<>|]|\p{Cc}/gu, '_')
    .trim()
    .slice(0, 200);
  return nome || `exame.${extensao}`;
}

/** Content-Disposition para exibir o arquivo no navegador, com nome UTF-8. */
export function disposicaoInline(nome: string): string {
  const ascii = nome.normalize('NFD').replace(/[^\x20-\x7e]/g, '').replace(/"/g, '');
  return `inline; filename="${ascii || 'exame'}"; filename*=UTF-8''${encodeURIComponent(nome)}`;
}

/** Recebe o campo "arquivo" em memória e traduz o erro de tamanho do multer (FE01 de UC11). */
@Injectable()
export class ArquivoExameInterceptor extends FileInterceptor('arquivo', {
  limits: { fileSize: LIMITE_ARQUIVO_EXAME, files: 1 },
}) {
  async intercept(ctx: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    try {
      return await super.intercept(ctx, next);
    } catch (e) {
      if (e instanceof PayloadTooLargeException) throw new PayloadTooLargeException(MENSAGEM_ARQUIVO_INVALIDO);
      throw e;
    }
  }
}
