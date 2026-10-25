/**
 * Armazenamento dos arquivos clínicos (RN19, RNF07). Os módulos dependem desta
 * abstração; a implementação (disco local, armazenamento de objetos) é
 * escolhida no ArmazenamentoModule. O banco guarda só a chave e os metadados.
 */
export abstract class ArmazenamentoService {
  abstract salvar(chave: string, conteudo: Buffer): Promise<void>;
  abstract ler(chave: string): Promise<Buffer>;
  abstract remover(chave: string): Promise<void>;
}
