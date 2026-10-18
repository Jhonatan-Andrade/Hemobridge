import { createHash } from 'node:crypto';

// RN19: PDF, JPG ou PNG com até 5 MB.
export const TAMANHO_MAXIMO_EXAME = 5 * 1024 * 1024;
export const TIPOS_EXAME = ['application/pdf', 'image/jpeg', 'image/png'] as const;
export type TipoExame = (typeof TIPOS_EXAME)[number];

export const MENSAGEM_ARQUIVO_INVALIDO = 'Envie um arquivo PDF, JPG ou PNG de até 5 MB.';

// Assinatura dos primeiros bytes: a extensão e o Content-Type enviados pelo
// navegador não são confiáveis.
const ASSINATURAS: [TipoExame, number[]][] = [
  ['application/pdf', [0x25, 0x50, 0x44, 0x46, 0x2d]], // %PDF-
  ['image/png', [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  ['image/jpeg', [0xff, 0xd8, 0xff]],
];

/** Tipo real do arquivo pelo conteúdo, ou null se não for PDF/JPG/PNG. */
export function detectarTipoExame(conteudo: Buffer): TipoExame | null {
  for (const [tipo, assinatura] of ASSINATURAS) {
    if (conteudo.length >= assinatura.length && assinatura.every((b, i) => conteudo[i] === b)) return tipo;
  }
  return null;
}

/** Valida o arquivo pela RN19 e devolve o tipo real, ou null se inválido. */
export function validarArquivoExame(conteudo: Buffer): TipoExame | null {
  if (conteudo.length === 0 || conteudo.length > TAMANHO_MAXIMO_EXAME) return null;
  return detectarTipoExame(conteudo);
}

export function sha256(conteudo: Buffer): string {
  return createHash('sha256').update(conteudo).digest('hex');
}
