import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Inject, Injectable, Logger, OnModuleInit, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { ArmazenamentoService, type ArquivoArmazenado } from './armazenamento.service.js';
import { sha256 } from './arquivo-exame.js';
import { cifrar, decifrar, lerChave } from './cifra.js';

/** Permite injetar um cliente S3 alternativo (testes). */
export const CLIENTE_S3 = Symbol('CLIENTE_S3');

// Qualquer serviço compatível com S3: SeaweedFS na VM, MinIO local ou AWS S3.
@Injectable()
export class S3ArmazenamentoService extends ArmazenamentoService implements OnModuleInit {
  private readonly logger = new Logger(S3ArmazenamentoService.name);
  private readonly bucket: string;
  private readonly chave: Buffer;
  private readonly s3: S3Client;

  constructor(config: ConfigService, @Optional() @Inject(CLIENTE_S3) s3?: S3Client) {
    super();
    this.s3 = s3 ?? criarCliente(config);
    this.bucket = config.get<string>('S3_BUCKET', 'hemobridge-exames');
    this.chave = lerChave(config.getOrThrow<string>('ARMAZENAMENTO_CHAVE'));
  }

  // Em desenvolvimento o bucket é criado na primeira execução.
  async onModuleInit() {
    try {
      await this.s3.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      try {
        await this.s3.send(new CreateBucketCommand({ Bucket: this.bucket }));
        this.logger.log(`Bucket ${this.bucket} criado.`);
      } catch (erro) {
        this.logger.warn(`Armazenamento de objetos indisponível: ${String(erro)}`);
      }
    }
  }

  async enviar(conteudo: Buffer, { prefixo, mimeType }: { prefixo: string; mimeType: string }): Promise<ArquivoArmazenado> {
    // O nome original nunca entra na chave (pode conter dados pessoais).
    const chave = `${prefixo.replace(/^\/+|\/+$/g, '')}/${randomUUID()}`;
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: chave,
        Body: cifrar(conteudo, this.chave),
        ContentType: 'application/octet-stream',
        Metadata: { 'tipo-original': mimeType },
      }),
    );
    return { chave, hashSha256: sha256(conteudo), tamanhoBytes: conteudo.length };
  }

  async obter(chave: string): Promise<Buffer> {
    const resposta = await this.s3.send(new GetObjectCommand({ Bucket: this.bucket, Key: chave }));
    if (!resposta.Body) throw new Error(`Objeto ${chave} sem conteúdo.`);
    return decifrar(Buffer.from(await resposta.Body.transformToByteArray()), this.chave);
  }

  async remover(chave: string): Promise<void> {
    await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: chave }));
  }
}

function criarCliente(config: ConfigService): S3Client {
  return new S3Client({
    endpoint: config.get<string>('S3_ENDPOINT'),
    region: config.get<string>('S3_REGIAO', 'us-east-1'),
    // SeaweedFS e MinIO usam endereço no estilo http://host/bucket/chave.
    forcePathStyle: config.get('S3_FORCE_PATH_STYLE', 'true') === 'true',
    credentials: {
      accessKeyId: config.getOrThrow<string>('S3_ACCESS_KEY'),
      secretAccessKey: config.getOrThrow<string>('S3_SECRET_KEY'),
    },
  });
}
