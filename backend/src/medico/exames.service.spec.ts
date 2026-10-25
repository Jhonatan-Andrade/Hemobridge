import { ConflictException, NotFoundException } from '@nestjs/common';
import { ArmazenamentoService } from '../armazenamento/armazenamento.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ExamesMedicoService } from './exames.service.js';

const emAnalise = {
  situacao: 'EM_ANALISE',
  pacienteId: 'p1',
  paciente: { situacao: 'EM_ANALISE' },
  envios: [{ id: 'e2', situacao: 'EM_ANALISE' }],
};

const detalheDb = {
  id: 's1',
  exames: ['Hemograma'],
  orientacoes: null,
  situacao: 'VALIDADO',
  criadoEm: new Date(),
  consulta: { id: 'c1', disponibilidade: { inicio: new Date() } },
  paciente: {
    dataNascimento: new Date('1990-01-01T00:00:00Z'),
    sexo: 'MASCULINO',
    pesoKg: '80.00',
    situacao: 'APROVADO',
    tipoSanguineo: { sigla: 'O+' },
    usuario: { id: 'p1', nome: 'João' },
  },
  envios: [],
};

function montar(solicitacao: object | null = emAnalise) {
  const prisma = {
    solicitacaoExame: {
      findFirst: vi.fn().mockResolvedValueOnce(solicitacao).mockResolvedValue(detalheDb),
      update: vi.fn().mockReturnValue('upd'),
    },
    exame: { update: vi.fn().mockReturnValue('upd'), findFirst: vi.fn().mockResolvedValue(null) },
    paciente: { update: vi.fn().mockReturnValue('upd') },
    tipoSanguineo: { findUniqueOrThrow: vi.fn().mockResolvedValue({ id: 7 }) },
    $transaction: vi.fn().mockResolvedValue([]),
  };
  const service = new ExamesMedicoService(
    prisma as unknown as PrismaService,
    { ler: vi.fn() } as unknown as ArmazenamentoService,
  );
  return { service, prisma };
}

describe('ExamesMedicoService', () => {
  it('aprova registrando o tipo sanguíneo, o médico validador e o instante (UC16, RN01)', async () => {
    const { service, prisma } = montar();

    const r = await service.aprovar('m1', 's1', { tipoSanguineo: 'O+' });

    expect(prisma.tipoSanguineo.findUniqueOrThrow.mock.calls[0][0].where).toEqual({ sigla: 'O+' });
    expect(prisma.exame.update.mock.calls[0][0]).toMatchObject({ where: { id: 'e2' }, data: { situacao: 'VALIDADO', avaliadoPorId: 'm1' } });
    expect(prisma.paciente.update.mock.calls[0][0].data).toMatchObject({
      situacao: 'APROVADO',
      tipoSanguineoId: 7,
      medicoValidadorId: 'm1',
    });
    expect(prisma.paciente.update.mock.calls[0][0].data.validadoEm).toBeInstanceOf(Date);
    expect(r.solicitacao.paciente).toMatchObject({ idade: expect.any(Number), tipoSanguineo: 'O+' });
  });

  it('reprova com motivo no envio e deixa o paciente reenviar (FA01)', async () => {
    const { service, prisma } = montar();

    await service.reprovar('m1', 's1', { motivo: 'Arquivo ilegível' });

    expect(prisma.exame.update.mock.calls[0][0].data).toMatchObject({ situacao: 'REPROVADO', motivoReprovacao: 'Arquivo ilegível' });
    expect(prisma.solicitacaoExame.update.mock.calls[0][0].data).toEqual({ situacao: 'REPROVADO' });
    expect(prisma.paciente.update.mock.calls[0][0].data).toEqual({ situacao: 'REPROVADO' });
  });

  it('só avalia exame em análise', async () => {
    const { service, prisma } = montar({ ...emAnalise, situacao: 'AGUARDANDO_RESULTADO', envios: [] });

    await expect(service.aprovar('m1', 's1', { tipoSanguineo: 'A+' })).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('restringe solicitações e arquivos ao médico que pediu o exame (RN19)', async () => {
    const { service, prisma } = montar(null);

    await expect(service.reprovar('m2', 's1', { motivo: 'Motivo' })).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.solicitacaoExame.findFirst.mock.calls[0][0].where).toEqual({ id: 's1', medicoId: 'm2' });

    await expect(service.arquivo('m2', 's1', 'e1')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.exame.findFirst.mock.calls[0][0].where).toEqual({ id: 'e1', solicitacao: { id: 's1', medicoId: 'm2' } });
  });
});
