/** Imagem embutida na mensagem, usada no HTML como `cid:<cid>`. */
export interface ImagemEmail {
  nome: string;
  cid: string;
  conteudo: Buffer;
}

export interface MensagemEmail {
  para: string;
  assunto: string;
  texto: string;
  html?: string;
  imagens?: ImagemEmail[];
}

/**
 * Envio de e-mail. Os módulos dependem desta abstração; a implementação
 * (SMTP, provedor externo, fake em testes) é escolhida no EmailModule.
 */
export abstract class EmailService {
  abstract enviar(mensagem: MensagemEmail): Promise<void>;
}
