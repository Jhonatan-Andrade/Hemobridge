# Armazenamento de arquivos de exame (HEM-17)

Os arquivos de exame **não ficam no banco** (Seção 9.1.6). A API grava o arquivo num
serviço compatível com S3 e o banco guarda só chave, nome original, MIME, tamanho e SHA-256.

| Ambiente | Serviço S3 |
| --- | --- |
| Local | SeaweedFS do `docker-compose.yml` (porta 8333) |
| VM da equipe | SeaweedFS da VM, pelo túnel SSH (ver `infra/vm/README.md`) |
| Produção | Qualquer S3 (AWS S3, MinIO, SeaweedFS) via `S3_ENDPOINT` |

O bucket é criado na primeira execução da API, se não existir.

## Criptografia em repouso

A API cifra cada arquivo com **AES-256-GCM** antes de enviar (`ARMAZENAMENTO_CHAVE`), então
o conteúdo fica protegido mesmo que o bucket vaze, e qualquer adulteração é detectada ao ler.
Gere a chave com `openssl rand -base64 32`. **Se a chave for perdida, os arquivos ficam ilegíveis.**

## Como usar

```ts
import { ArmazenamentoService } from '../armazenamento/armazenamento.service.js';
import { MENSAGEM_ARQUIVO_INVALIDO, validarArquivoExame } from '../armazenamento/arquivo-exame.js';

const tipo = validarArquivoExame(arquivo.buffer);          // RN19: PDF/JPG/PNG até 5 MB, pelo conteúdo
if (!tipo) throw new BadRequestException(MENSAGEM_ARQUIVO_INVALIDO);
const { chave, hashSha256, tamanhoBytes } = await this.armazenamento.enviar(arquivo.buffer, {
  prefixo: `exames/${pacienteId}`,
  mimeType: tipo,
});
// ...grava chave/hash/tamanho em `exame`
const conteudo = await this.armazenamento.obter(chave);   // só depois de checar a autorização
```

O tipo vem dos primeiros bytes do arquivo, não da extensão nem do `Content-Type` enviado pelo navegador.
O nome original nunca entra na chave do objeto (pode conter dados pessoais).
