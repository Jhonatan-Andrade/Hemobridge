import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import { ArmazenamentoService } from './armazenamento.service.js';

/**
 * Guarda os arquivos em uma pasta do servidor (ARQUIVOS_DIR), fora da pasta
 * pública. Adequado para desenvolvimento; em produção, troque por um
 * armazenamento de objetos com criptografia em repouso.
 */
@Injectable()
export class DiscoArmazenamentoService extends ArmazenamentoService {
  private readonly raiz: string;

  constructor(config: ConfigService) {
    super();
    this.raiz = resolve(config.get<string>('ARQUIVOS_DIR', 'armazenamento'));
  }

  async salvar(chave: string, conteudo: Buffer): Promise<void> {
    const caminho = this.caminho(chave);
    await mkdir(dirname(caminho), { recursive: true });
    // "wx": nunca sobrescreve um arquivo existente.
    await writeFile(caminho, conteudo, { flag: 'wx' });
  }

  async ler(chave: string): Promise<Buffer> {
    try {
      return await readFile(this.caminho(chave));
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') throw new NotFoundException('Arquivo não encontrado.');
      throw e;
    }
  }

  async remover(chave: string): Promise<void> {
    await rm(this.caminho(chave), { force: true });
  }

  /** As chaves são geradas pela aplicação, mas o caminho nunca sai da raiz. */
  private caminho(chave: string): string {
    const caminho = resolve(this.raiz, chave);
    if (!caminho.startsWith(this.raiz + sep)) throw new Error(`Chave de armazenamento inválida: ${chave}`);
    return caminho;
  }
}
