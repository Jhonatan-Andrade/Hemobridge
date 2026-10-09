import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

// Arquivos clínicos são cifrados pela API antes de chegar ao armazenamento de
// objetos (Seção 9.1.6: criptografia em repouso), independente do provedor S3.
// Formato gravado: [versão 1 byte][IV 12 bytes][tag 16 bytes][conteúdo cifrado].
const VERSAO = 1;
const TAM_IV = 12;
const TAM_TAG = 16;
const CABECALHO = 1 + TAM_IV + TAM_TAG;

/** Lê a chave AES-256 (32 bytes em base64) e falha cedo se estiver errada. */
export function lerChave(base64: string): Buffer {
  const chave = Buffer.from(base64, 'base64');
  if (chave.length !== 32) {
    throw new Error('ARMAZENAMENTO_CHAVE deve ter 32 bytes em base64 (gere com: openssl rand -base64 32).');
  }
  return chave;
}

export function cifrar(conteudo: Buffer, chave: Buffer): Buffer {
  const iv = randomBytes(TAM_IV);
  const cifra = createCipheriv('aes-256-gcm', chave, iv);
  const dados = Buffer.concat([cifra.update(conteudo), cifra.final()]);
  return Buffer.concat([Buffer.from([VERSAO]), iv, cifra.getAuthTag(), dados]);
}

/** Decifra e verifica a integridade (GCM): conteúdo adulterado gera erro. */
export function decifrar(gravado: Buffer, chave: Buffer): Buffer {
  if (gravado.length < CABECALHO || gravado[0] !== VERSAO) {
    throw new Error('Arquivo armazenado em formato desconhecido.');
  }
  const iv = gravado.subarray(1, 1 + TAM_IV);
  const tag = gravado.subarray(1 + TAM_IV, CABECALHO);
  const decifra = createDecipheriv('aes-256-gcm', chave, iv);
  decifra.setAuthTag(tag);
  return Buffer.concat([decifra.update(gravado.subarray(CABECALHO)), decifra.final()]);
}
