import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { dataIsoParaDate } from '../common/data.js';
import { gerarHashSenha } from '../common/senha.js';
import { Prisma } from '../generated/prisma/client.js';
import { TERMO_CONSENTIMENTO } from '../lgpd/termo-consentimento.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CadastroDto } from './dto/cadastro.dto.js';

const MENSAGEM_CONTA_EXISTENTE =
  'Já existe uma conta com o e-mail ou CPF informado. Acesse sua conta ou recupere sua senha.';

// RF01 – Cadastro do paciente. A conta nasce PENDENTE.
@Injectable()
export class CadastroService {
  constructor(private readonly prisma: PrismaService) {}

  async cadastrar(dto: CadastroDto, ipOrigem?: string) {
    if (dto.versaoTermo !== TERMO_CONSENTIMENTO.versao) {
      throw new BadRequestException(
        'A versão do termo de consentimento aceita não é a vigente. Recarregue a página e aceite o termo atual.',
      );
    }

    // Verificação antecipada; a unicidade é garantida no banco (P2002 abaixo).
    const existente = await this.prisma.usuario.findFirst({
      where: { OR: [{ email: dto.email }, { cpf: dto.cpf }] },
      select: { id: true },
    });
    if (existente) throw new ConflictException(MENSAGEM_CONTA_EXISTENTE);

    try {
      const usuario = await this.prisma.usuario.create({
        data: {
          nome: dto.nome,
          email: dto.email,
          cpf: dto.cpf,
          telefone: dto.telefone,
          senhaHash: await gerarHashSenha(dto.senha),
          perfil: 'PACIENTE',
          paciente: { create: { dataNascimento: dataIsoParaDate(dto.dataNascimento), sexo: dto.sexo } },
          consentimentos: {
            create: {
              versaoTermo: TERMO_CONSENTIMENTO.versao,
              finalidade: TERMO_CONSENTIMENTO.finalidade,
              ipOrigem,
            },
          },
        },
        select: { id: true, nome: true, email: true, paciente: { select: { situacao: true } } },
      });

      return {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        situacao: usuario.paciente!.situacao,
      };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException(MENSAGEM_CONTA_EXISTENTE);
      }
      throw e;
    }
  }
}
