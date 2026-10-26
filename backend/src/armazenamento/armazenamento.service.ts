export interface ArquivoArmazenado {
  /** Chave do objeto no armazenamento (guardada em exame.chave_armazenamento). */
  chave: string;
  /** SHA-256 do conteúdo original, em hexadecimal. */
  hashSha256: string;
  tamanhoBytes: number;
}

/**
 * Armazenamento de objetos para arquivos clínicos (HEM-17, Seção 9.1.6).
 * Os módulos dependem desta abstração; a implementação (S3, fake em testes)
 * é escolhida no ArmazenamentoModule. O conteúdo nunca vai para o banco.
 */
export abstract class ArmazenamentoService {
  /** Grava o arquivo sob o prefixo informado (ex.: "exames/<paciente>"). */
  abstract enviar(conteudo: Buffer, opcoes: { prefixo: string; mimeType: string }): Promise<ArquivoArmazenado>;

  /** Lê o conteúdo original. Chame só depois de checar a autorização do usuário. */
  abstract obter(chave: string): Promise<Buffer>;

  abstract remover(chave: string): Promise<void>;
}
