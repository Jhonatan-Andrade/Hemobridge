import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';
import type { UsuarioAutenticado } from '../auth/auth.types.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  CriarComentarioDto,
  CriarPublicacaoDto,
  VERSAO_NORMAS,
} from './comunidade.dto.js';

const autorSelection = {
  id: true,
  nome: true,
  perfil: true,
  medico: {
    select: { crmConferidoEm: true, hospital: { select: { ativo: true } } },
  },
  representante: {
    select: { hospital: { select: { ativo: true, verificadoEm: true } } },
  },
} as const;
const includePublicacao = {
  autor: { select: autorSelection },
  comentarios: {
    where: {
      status: 'PUBLICADO' as const,
      autor: { status: 'ATIVO' as const },
    },
    orderBy: [{ criadoEm: 'asc' as const }, { id: 'asc' as const }],
    take: 10,
    include: { autor: { select: autorSelection } },
  },
  _count: {
    select: {
      reacoes: true,
      comentarios: {
        where: {
          status: 'PUBLICADO' as const,
          autor: { status: 'ATIVO' as const },
        },
      },
    },
  },
} satisfies Prisma.PublicacaoInclude;
type Autor = Prisma.UsuarioGetPayload<{ select: typeof autorSelection }>;
type Post = Prisma.PublicacaoGetPayload<{ include: typeof includePublicacao }>;

export function perfilVerificado(autor: Autor): boolean {
  return autor.perfil === 'MEDICO'
    ? !!autor.medico?.crmConferidoEm && autor.medico.hospital.ativo
    : autor.perfil === 'REPRESENTANTE' &&
        !!autor.representante?.hospital.ativo &&
        !!autor.representante.hospital.verificadoEm;
}
const papeis = {
  PACIENTE: 'patient',
  MEDICO: 'doctor',
  REPRESENTANTE: 'representative',
  ADMINISTRADOR: 'administrator',
} as const;
const comentarioView = (c: {
  id: string;
  texto: string;
  criadoEm: Date;
  autor: Autor;
}) => ({
  id: c.id,
  text: c.texto,
  date: c.criadoEm.toISOString(),
  author: c.autor.nome,
  role: papeis[c.autor.perfil],
  verified: perfilVerificado(c.autor),
});
const postView = (p: Post) => ({
  id: p.id,
  author: p.autor.nome,
  role: papeis[p.autor.perfil],
  verified: perfilVerificado(p.autor),
  date: p.criadoEm.toISOString(),
  title: p.titulo,
  content: p.texto,
  topic: p.tema,
  pinned:
    p.autor.perfil === 'REPRESENTANTE' &&
    perfilVerificado(p.autor) &&
    p.tipo === 'AVISO_CRITICO' &&
    !!p.fixadaAte &&
    p.fixadaAte > new Date(),
  pinnedUntil: p.fixadaAte?.toISOString(),
  likes: p._count.reacoes,
  liked: false,
  commentsTotal: p._count.comentarios,
  comments: p.comentarios.map(comentarioView),
});

@Injectable()
export class ComunidadeService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(pagina: number) {
    const ids = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT p.id FROM publicacao p JOIN usuario u ON u.id=p.autor_id
      WHERE p.status='PUBLICADO' AND u.status='ATIVO'
      ORDER BY (p.tipo='AVISO_CRITICO' AND p.fixada_ate>now() AND u.perfil='REPRESENTANTE' AND EXISTS(SELECT 1 FROM representante_hospital r JOIN hospital h ON h.id=r.hospital_id WHERE r.usuario_id=u.id AND h.ativo AND h.verificado_em IS NOT NULL)) DESC, p.criado_em DESC, p.id DESC
      LIMIT 21 OFFSET ${(pagina - 1) * 20}`;
    const posts = await this.prisma.publicacao.findMany({
      where: { id: { in: ids.slice(0, 20).map((p) => p.id) } },
      include: includePublicacao,
    });
    const byId = new Map(posts.map((p) => [p.id, p]));
    return {
      items: ids.slice(0, 20).flatMap((p) => {
        const post = byId.get(p.id);
        return post ? [postView(post)] : [];
      }),
      hasMore: ids.length > 20,
      page: pagina,
    };
  }

  async detalhe(id: string) {
    const post = await this.prisma.publicacao.findFirst({
      where: { id, status: 'PUBLICADO', autor: { status: 'ATIVO' } },
      include: includePublicacao,
    });
    if (!post) throw new NotFoundException('Publicação indisponível.');
    return postView(post);
  }

  async comentarios(id: string, pagina: number) {
    await this.detalhe(id);
    const items = await this.prisma.comentario.findMany({
      where: {
        publicacaoId: id,
        status: 'PUBLICADO',
        autor: { status: 'ATIVO' },
      },
      orderBy: [{ criadoEm: 'asc' }, { id: 'asc' }],
      take: 11,
      skip: (pagina - 1) * 10,
      include: { autor: { select: autorSelection } },
    });
    return {
      items: items.slice(0, 10).map(comentarioView),
      hasMore: items.length > 10,
      page: pagina,
    };
  }

  async criar(usuario: UsuarioAutenticado, dto: CriarPublicacaoDto) {
    const autor = await this.prisma.usuario.findUniqueOrThrow({
      where: { id: usuario.id },
      select: autorSelection,
    });
    const fixadaAte = dto.fixadaAte ? new Date(dto.fixadaAte) : null;
    if (dto.tipo === 'AVISO_CRITICO') {
      if (usuario.perfil !== 'REPRESENTANTE' || !perfilVerificado(autor))
        throw new ForbiddenException(
          'Avisos críticos são exclusivos de instituições verificadas.',
        );
      if (
        dto.tema !== 'AVISO_INSTITUCIONAL' ||
        !fixadaAte ||
        fixadaAte <= new Date() ||
        fixadaAte.getTime() > Date.now() + 7 * 86400000
      )
        throw new BadRequestException(
          'Defina um aviso institucional com validade de até sete dias.',
        );
    } else if (fixadaAte)
      throw new BadRequestException(
        'Somente avisos críticos podem ser fixados.',
      );
    const post = await this.prisma.$transaction(async (tx) => {
      await this.aceitarNormas(tx, usuario.id);
      return tx.publicacao.create({
        data: {
          autorId: usuario.id,
          titulo: dto.titulo.trim(),
          texto: dto.texto.trim(),
          tema: dto.tema,
          tipo: dto.tipo,
          fixadaAte,
        },
        include: includePublicacao,
      });
    });
    return postView(post);
  }

  async comentar(
    usuarioId: string,
    publicacaoId: string,
    dto: CriarComentarioDto,
  ) {
    await this.detalhe(publicacaoId);
    return this.prisma.$transaction(async (tx) => {
      await this.aceitarNormas(tx, usuarioId);
      const c = await tx.comentario.create({
        data: { autorId: usuarioId, publicacaoId, texto: dto.texto.trim() },
        include: { autor: { select: autorSelection } },
      });
      return comentarioView(c);
    });
  }

  async reagir(usuarioId: string, publicacaoId: string, curtir: boolean) {
    await this.detalhe(publicacaoId);
    if (curtir)
      await this.prisma.reacaoPublicacao.upsert({
        where: { publicacaoId_usuarioId: { publicacaoId, usuarioId } },
        create: { publicacaoId, usuarioId },
        update: {},
      });
    else
      await this.prisma.reacaoPublicacao.deleteMany({
        where: { publicacaoId, usuarioId },
      });
    return {
      liked: curtir,
      likes: await this.prisma.reacaoPublicacao.count({
        where: { publicacaoId },
      }),
    };
  }

  minhasReacoes(usuarioId: string) {
    return this.prisma.reacaoPublicacao.findMany({
      where: { usuarioId },
      select: { publicacaoId: true },
      take: 1000,
    });
  }
  private aceitarNormas(tx: Prisma.TransactionClient, id: string) {
    return tx.usuario.update({
      where: { id },
      data: {
        normasComunidadeVersao: VERSAO_NORMAS,
        normasComunidadeAceitasEm: new Date(),
      },
    });
  }
}
