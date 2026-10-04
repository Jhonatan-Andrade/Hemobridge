import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SenhaProvisoriaService } from '../contas/senha-provisoria.service.js';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  AtualizarHospitalDto,
  CriarHospitalDto,
  ListarHospitaisAdminDto,
  NovoRepresentanteDto,
} from './dto/hospital.dto.js';

// UC25 – Gerenciar Bancos de Sangue e Representantes
@Injectable()
export class HospitaisAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly senhaProvisoria: SenhaProvisoriaService,
  ) {}

  // Passo 2: todos os bancos, inclusive desativados, com a situação de cada um.
  async listar({ busca, estado, ativo, pagina, tamanhoPagina }: ListarHospitaisAdminDto) {
    const digitos = busca?.replace(/\D/g, '');
    const where: Prisma.HospitalWhereInput = {
      ativo,
      estado,
      OR: busca
        ? [
            { nome: { contains: busca, mode: 'insensitive' } },
            { cidade: { contains: busca, mode: 'insensitive' } },
            ...(digitos ? [{ cnpj: { contains: digitos } }] : []),
          ]
        : undefined,
    };

    const [itens, total] = await Promise.all([
      this.prisma.hospital.findMany({
        where,
        select: {
          id: true,
          nome: true,
          cnpj: true,
          cidade: true,
          estado: true,
          ativo: true,
          criadoEm: true,
          _count: { select: { representantes: true, medicos: true } },
        },
        orderBy: [{ ativo: 'desc' }, { nome: 'asc' }],
        skip: (pagina - 1) * tamanhoPagina,
        take: tamanhoPagina,
      }),
      this.prisma.hospital.count({ where }),
    ]);

    return {
      itens: itens.map(({ _count, ...h }) => ({
        ...h,
        totalRepresentantes: _count.representantes,
        totalMedicos: _count.medicos,
      })),
      total,
      pagina,
      tamanhoPagina,
    };
  }

  async detalhar(id: string) {
    const hospital = await this.prisma.hospital.findUnique({
      where: { id },
      select: {
        id: true,
        nome: true,
        cnpj: true,
        endereco: true,
        cidade: true,
        estado: true,
        cep: true,
        telefone: true,
        horarioFuncionamento: true,
        latitude: true,
        longitude: true,
        ativo: true,
        criadoEm: true,
        atualizadoEm: true,
        representantes: {
          select: {
            cargo: true,
            usuario: {
              select: {
                id: true,
                nome: true,
                email: true,
                telefone: true,
                status: true,
                senhaProvisoria: true,
                senhaProvisoriaExpiraEm: true,
              },
            },
          },
          orderBy: { usuario: { nome: 'asc' } },
        },
        _count: { select: { medicos: true } },
      },
    });
    if (!hospital) throw new NotFoundException('Banco de sangue não encontrado.');

    const { representantes, _count, ...dados } = hospital;
    return {
      ...dados,
      latitude: dados.latitude.toNumber(),
      longitude: dados.longitude.toNumber(),
      totalMedicos: _count.medicos,
      representantes: representantes.map(({ cargo, usuario }) => ({
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        telefone: usuario.telefone,
        cargo,
        status: usuario.status,
        // Ainda não fez o primeiro acesso (UC07).
        primeiroAcessoPendente: usuario.senhaProvisoria,
        senhaProvisoriaExpiraEm: usuario.senhaProvisoriaExpiraEm,
      })),
    };
  }

  // Passos 5–7: banco ativo + conta do representante + senha provisória.
  async criar({ representante, ...dadosHospital }: CriarHospitalDto) {
    await this.verificarConflitos({
      cnpj: dadosHospital.cnpj,
      cpf: representante.cpf,
      email: representante.email,
    });
    const { senha, dados: credenciais } = await this.senhaProvisoria.gerar();

    const { hospital, usuario } = await this.comConflitoTratado(() =>
      this.prisma.$transaction(async (tx) => {
        const hospital = await tx.hospital.create({
          data: dadosHospital,
          select: { id: true, nome: true, cnpj: true, cidade: true, estado: true, ativo: true },
        });
        const usuario = await tx.usuario.create({
          data: this.dadosRepresentante(representante, hospital.id, credenciais),
          select: { id: true, nome: true, email: true, perfil: true },
        });
        return { hospital, usuario };
      }),
    );

    return {
      hospital,
      representante: { id: usuario.id, nome: usuario.nome, email: usuario.email },
      senhaProvisoriaEnviada: await this.senhaProvisoria.enviar(usuario, senha),
    };
  }

  // FA01
  async atualizar(id: string, dto: AtualizarHospitalDto) {
    const atual = await this.prisma.hospital.findUnique({ where: { id }, select: { cnpj: true } });
    if (!atual) throw new NotFoundException('Banco de sangue não encontrado.');
    if (dto.cnpj && dto.cnpj !== atual.cnpj) await this.verificarConflitos({ cnpj: dto.cnpj });

    await this.comConflitoTratado(() => this.prisma.hospital.update({ where: { id }, data: dto }));
    return this.detalhar(id);
  }

  /**
   * FA02 / RN09: o banco some das consultas públicas e seus representantes e
   * médicos perdem o acesso (o guard confere a instituição a cada requisição;
   * as sessões abertas são encerradas aqui).
   * TODO(etapa 8): cancelar as consultas futuras e notificar os pacientes.
   */
  async desativar(id: string) {
    await this.alterarSituacao(id, false);
    await this.prisma.usuario.updateMany({
      where: { OR: [{ medico: { hospitalId: id } }, { representante: { hospitalId: id } }] },
      data: { versaoSessao: { increment: 1 } },
    });
    return { id, ativo: false };
  }

  async ativar(id: string) {
    await this.alterarSituacao(id, true);
    return { id, ativo: true };
  }

  // FA03
  async adicionarRepresentante(hospitalId: string, dto: NovoRepresentanteDto) {
    const hospital = await this.prisma.hospital.findUnique({
      where: { id: hospitalId },
      select: { ativo: true },
    });
    if (!hospital) throw new NotFoundException('Banco de sangue não encontrado.');
    if (!hospital.ativo) {
      throw new BadRequestException('Reative o banco de sangue antes de cadastrar representantes.');
    }
    await this.verificarConflitos({ cpf: dto.cpf, email: dto.email });

    const { senha, dados: credenciais } = await this.senhaProvisoria.gerar();
    const usuario = await this.comConflitoTratado(() =>
      this.prisma.usuario.create({
        data: this.dadosRepresentante(dto, hospitalId, credenciais),
        select: { id: true, nome: true, email: true, perfil: true },
      }),
    );

    return {
      representante: { id: usuario.id, nome: usuario.nome, email: usuario.email },
      senhaProvisoriaEnviada: await this.senhaProvisoria.enviar(usuario, senha),
    };
  }

  private dadosRepresentante(
    { cargo, ...dto }: NovoRepresentanteDto,
    hospitalId: string,
    credenciais: Awaited<ReturnType<SenhaProvisoriaService['gerar']>>['dados'],
  ): Prisma.UsuarioCreateInput {
    return {
      ...dto,
      ...credenciais,
      perfil: 'REPRESENTANTE',
      representante: { create: { hospital: { connect: { id: hospitalId } }, cargo } },
    };
  }

  private async alterarSituacao(id: string, ativo: boolean) {
    const { count } = await this.prisma.hospital.updateMany({ where: { id }, data: { ativo } });
    if (!count) throw new NotFoundException('Banco de sangue não encontrado.');
  }

  // FE01: informa exatamente qual dado já está cadastrado.
  private async verificarConflitos({ cnpj, cpf, email }: { cnpj?: string; cpf?: string; email?: string }) {
    const [hospital, usuarios] = await Promise.all([
      cnpj ? this.prisma.hospital.findUnique({ where: { cnpj }, select: { id: true } }) : null,
      cpf || email
        ? this.prisma.usuario.findMany({
            where: { OR: [...(cpf ? [{ cpf }] : []), ...(email ? [{ email }] : [])] },
            select: { cpf: true, email: true },
          })
        : [],
    ]);

    const conflitos: string[] = [];
    if (hospital) conflitos.push('Já existe um banco de sangue com este CNPJ.');
    if (usuarios.some((u) => u.cpf === cpf)) conflitos.push('Já existe um usuário com este CPF.');
    if (usuarios.some((u) => u.email === email)) conflitos.push('Já existe um usuário com este e-mail.');
    if (conflitos.length) throw new ConflictException(conflitos);
  }

  /** Cobre a corrida entre a verificação de conflitos e a gravação. */
  private async comConflitoTratado<T>(operacao: () => Promise<T>): Promise<T> {
    try {
      return await operacao();
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('CNPJ, CPF ou e-mail já cadastrado.');
      }
      throw e;
    }
  }
}
