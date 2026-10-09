import { GetObjectCommand, PutObjectCommand, type S3Client } from '@aws-sdk/client-s3';
import type { ConfigService } from '@nestjs/config';
import { randomBytes } from 'node:crypto';
import { TAMANHO_MAXIMO_EXAME, detectarTipoExame, sha256, validarArquivoExame } from './arquivo-exame.js';
import { cifrar, decifrar, lerChave } from './cifra.js';
import { S3ArmazenamentoService } from './s3-armazenamento.service.js';

const CHAVE_B64 = randomBytes(32).toString('base64');
const PDF = Buffer.concat([Buffer.from('%PDF-1.7\n'), randomBytes(100)]);
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
const JPG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]);

describe('cifra (criptografia em repouso)', () => {
  const chave = lerChave(CHAVE_B64);

  it('decifra o que cifrou, sem guardar o conteúdo em claro', () => {
    const gravado = cifrar(PDF, chave);
    expect(gravado.includes(PDF)).toBe(false);
    expect(decifrar(gravado, chave).equals(PDF)).toBe(true);
  });

  it('detecta conteúdo adulterado', () => {
    const gravado = cifrar(PDF, chave);
    gravado[gravado.length - 1] ^= 0xff;
    expect(() => decifrar(gravado, chave)).toThrow();
  });

  it('recusa chave com tamanho errado', () => {
    expect(() => lerChave(Buffer.from('curta').toString('base64'))).toThrow(/32 bytes/);
  });
});

describe('arquivo de exame (RN19)', () => {
  it.each([
    [PDF, 'application/pdf'],
    [PNG, 'image/png'],
    [JPG, 'image/jpeg'],
  ])('reconhece pelo conteúdo', (conteudo, tipo) => {
    expect(detectarTipoExame(conteudo)).toBe(tipo);
  });

  it('recusa outro formato mesmo com extensão de PDF (PT07)', () => {
    expect(validarArquivoExame(Buffer.from('PK\x03\x04zip disfarçado'))).toBeNull();
  });

  it('aceita até 5 MB e recusa acima ou vazio (PT07)', () => {
    const limite = Buffer.concat([PDF, Buffer.alloc(TAMANHO_MAXIMO_EXAME - PDF.length)]);
    expect(validarArquivoExame(limite)).toBe('application/pdf');
    expect(validarArquivoExame(Buffer.concat([limite, Buffer.from([0])]))).toBeNull();
    expect(validarArquivoExame(Buffer.alloc(0))).toBeNull();
  });

  it('calcula SHA-256 em hexadecimal', () => {
    expect(sha256(Buffer.from('abc'))).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });
});

describe('S3ArmazenamentoService', () => {
  function montar() {
    const objetos = new Map<string, Buffer>();
    const send = vi.fn(async (cmd: unknown) => {
      if (cmd instanceof PutObjectCommand) objetos.set(cmd.input.Key!, cmd.input.Body as Buffer);
      if (cmd instanceof GetObjectCommand) {
        const corpo = objetos.get(cmd.input.Key!)!;
        return { Body: { transformToByteArray: async () => new Uint8Array(corpo) } };
      }
      return {};
    });
    const config = {
      get: (k: string, padrao?: string) => ({ S3_BUCKET: 'bucket-teste' })[k] ?? padrao,
      getOrThrow: (k: string) => ({ ARMAZENAMENTO_CHAVE: CHAVE_B64 })[k],
    } as unknown as ConfigService;
    const service = new S3ArmazenamentoService(config, { send } as unknown as S3Client);
    return { service, send, objetos };
  }

  it('grava cifrado sob o prefixo, sem o nome original, e devolve hash e tamanho', async () => {
    const { service, objetos } = montar();
    const r = await service.enviar(PDF, { prefixo: 'exames/p1/', mimeType: 'application/pdf' });

    expect(r.chave).toMatch(/^exames\/p1\/[0-9a-f-]{36}$/);
    expect(r.hashSha256).toBe(sha256(PDF));
    expect(r.tamanhoBytes).toBe(PDF.length);
    expect(objetos.get(r.chave)!.includes(PDF)).toBe(false);
  });

  it('devolve o conteúdo original no download (upload/download de teste)', async () => {
    const { service } = montar();
    const { chave } = await service.enviar(PNG, { prefixo: 'exames/p1', mimeType: 'image/png' });
    expect((await service.obter(chave)).equals(PNG)).toBe(true);
  });
});
