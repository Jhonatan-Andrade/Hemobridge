import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { calcularIdade, dataIsoParaDate } from '../common/data.js';
import { gerarHashSenha } from '../common/senha.js';
import { TERMO_CONSENTIMENTO } from '../lgpd/termo-consentimento.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { PreCadastroDto } from './dto/pre-cadastro.dto.js';

// RN17
export const IDADE_MINIMA = 16;
export const IDADE_MAXIMA = 69;
export const IDADE_LIMITE_PRIMEIRA_DOACAO = 60;
export const PESO_MINIMO_KG = 50;

const MENSAGEM_CONTA_EXISTENTE =
  'Já existe uma conta com o e-mail ou CPF informado. Acesse sua conta ou recupere sua senha.';

@Injectable()
export class PacientesService {
  constructor(private readonly prisma: PrismaService) {}

  // UC01 – Realizar Pré-cadastro
  async preCadastrar(dto: PreCadastroDto, ipOrigem?: string) {
    if (dto.versaoTermo !== TERMO_CONSENTIMENTO.versao) {
      throw new BadRequestException(
        'A versão do termo de consentimento aceita não é a vigente. Recarregue a página e aceite o termo atual.',
      );
    }
    this.verificarCriteriosBasicos(dto);

    // FE02: verificação antecipada; a unicidade é garantida no banco (P2002 abaixo).
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
          paciente: {
            create: {
              dataNascimento: dataIsoParaDate(dto.dataNascimento),
              sexo: dto.sexo,
              pesoKg: dto.pesoKg,
              cidade: dto.cidade,
              estado: dto.estado,
            },
          },
          consentimentos: {
            create: {
              versaoTermo: TERMO_CONSENTIMENTO.versao,
              finalidade: TERMO_CONSENTIMENTO.finalidade,
              ipOrigem,
            },
          },
        },
        select: {
          id: true,
          nome: true,
          email: true,
          paciente: { select: { situacao: true } },
        },
      });

      return {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        situacao: usuario.paciente!.situacao,
        proximoPasso: 'AGENDAR_CONSULTA',
      };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException(MENSAGEM_CONTA_EXISTENTE);
      }
      throw e;
    }
  }

  // RN17 / FE04 e FA01
  private verificarCriteriosBasicos(dto: PreCadastroDto) {
    const idade = calcularIdade(dto.dataNascimento);

    if (idade < IDADE_MINIMA || idade > IDADE_MAXIMA || dto.pesoKg < PESO_MINIMO_KG) {
      throw new UnprocessableEntityException(
        `Para doar sangue é preciso ter entre ${IDADE_MINIMA} e ${IDADE_MAXIMA} anos e pesar no mínimo ${PESO_MINIMO_KG} kg.`,
      );
    }
    if (idade > IDADE_LIMITE_PRIMEIRA_DOACAO && dto.cienteRegraAcimaDe60 !== true) {
      throw new UnprocessableEntityException(
        `Acima de ${IDADE_LIMITE_PRIMEIRA_DOACAO} anos, só pode doar quem já doou antes dessa idade. Confirme a ciência dessa regra para prosseguir.`,
      );
    }
  }
}
