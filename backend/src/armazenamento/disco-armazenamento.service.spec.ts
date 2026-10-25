import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { detectarTipoExame, disposicaoInline, nomeArquivoSeguro } from '../common/arquivo-exame.js';
import { DiscoArmazenamentoService } from './disco-armazenamento.service.js';

describe('DiscoArmazenamentoService', () => {
  let raiz: string;
  let service: DiscoArmazenamentoService;

  beforeEach(async () => {
    raiz = await mkdtemp(join(tmpdir(), 'hemobridge-'));
    service = new DiscoArmazenamentoService({ get: () => raiz } as unknown as ConfigService);
  });
  afterEach(() => rm(raiz, { recursive: true, force: true }));

  it('salva, lê e remove pela chave', async () => {
    await service.salvar('exames/s1/a.pdf', Buffer.from('%PDF-'));

    expect((await service.ler('exames/s1/a.pdf')).toString()).toBe('%PDF-');
    await service.remover('exames/s1/a.pdf');
    await expect(service.ler('exames/s1/a.pdf')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('nunca sobrescreve nem sai da pasta raiz', async () => {
    await service.salvar('x.pdf', Buffer.from('1'));

    await expect(service.salvar('x.pdf', Buffer.from('2'))).rejects.toThrow();
    await expect(service.ler('../fora.txt')).rejects.toThrow('Chave de armazenamento inválida');
  });
});

describe('arquivo de exame', () => {
  it('reconhece PDF, PNG e JPG pela assinatura', () => {
    expect(detectarTipoExame(Buffer.from('%PDF-1.4'))?.mimeType).toBe('application/pdf');
    expect(detectarTipoExame(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))?.extensao).toBe('jpg');
    expect(detectarTipoExame(Buffer.from('GIF89a'))).toBeNull();
  });

  it('corrige o nome vindo do multer em latin1 e remove caracteres de caminho', () => {
    const latin1 = Buffer.from('exame/maçã.pdf', 'utf8').toString('latin1');

    expect(nomeArquivoSeguro(latin1, 'pdf')).toBe('exame_maçã.pdf');
    expect(nomeArquivoSeguro('', 'png')).toBe('exame.png');
    expect(disposicaoInline('maçã.pdf')).toBe(`inline; filename="maca.pdf"; filename*=UTF-8''ma%C3%A7%C3%A3.pdf`);
  });
});
