import { BadRequestException, ConflictException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AtendimentoService } from './atendimento.service.js';

const AGORA = new Date('2026-11-10T12:00:00Z');
const JA_COMECOU = new Date('2026-11-10T11:50:00Z');
const AINDA_NAO = new Date('2026-11-10T14:00:00Z');

const detalheDb = {
  id: 'c1',
  situacao: 'REALIZADA',
  observacoes: null,
  motivoReprovacao: null,
  canceladaPor: null,
  motivoCancelamento: null,
  encerradaEm: AGORA,
  consultaOrigemId: null,
  disponibilidade: { inicio: JA_COMECOU, fim: AGORA, linkSala: 'https://meet.exemplo.com/sala' },
  paciente: {
    dataNascimento: new Date('2000-05-20T00:00:00Z'),
    sexo: 'FEMININO',
    pesoKg: '62.50',
    cidade: 'Curitiba',
    estado: 'PR',
    situacao: 'AGUARDANDO_EXAME',
    usuario: { id: 'p1', nome: 'Maria' },
  },
  solicitacaoExame: null,
};

function montar(consulta: object | null) {
  const prisma = {
    consulta: {
      findFirst: vi.fn().mockResolvedValueOnce(consulta).mockResolvedValue(detalheDb),
      update: vi.fn().mockResolvedValue({}),
    },
    solicitacaoExame: { create: vi.fn().mockResolvedValue({}) },
    paciente: { update: vi.fn().mockResolvedValue({}) },
    disponibilidadeMedico: { update: vi.fn().mockResolvedValue({}) },
    $transaction: vi.fn(),
  };
  prisma.$transaction.mockImplementation((op: unknown) =>
    typeof op === 'function' ? (op as (tx: unknown) => unknown)(prisma) : Promise.all(op as unknown[]),
  );
  return { service: new AtendimentoService(prisma as unknown as PrismaService), prisma };
}

const agendada = (inicio: Date) => ({
  situacao: 'AGENDADA',
  pacienteId: 'p1',
  disponibilidadeId: 'd1',
  disponibilidade: { inicio },
});

describe('AtendimentoService', () => {
  beforeEach(() => vi.useFakeTimers({ now: AGORA }));
  afterEach(() => vi.useRealTimers());

  it('registra a consulta realizada com exames e passa o paciente a Aguardando exame (UC15, RN10)', async () => {
    const { service, prisma } = montar(agendada(JA_COMECOU));

    await service.registrarRealizada('m1', 'c1', { observacoes: 'Ok', exames: ['Hemograma'], orientacoes: 'Jejum' });

    expect(prisma.consulta.update.mock.calls[0][0].data).toMatchObject({ situacao: 'REALIZADA', observacoes: 'Ok' });
    expect(prisma.solicitacaoExame.create.mock.calls[0][0].data).toEqual({
      consultaId: 'c1',
      pacienteId: 'p1',
      medicoId: 'm1',
      exames: ['Hemograma'],
      orientacoes: 'Jejum',
    });
    expect(prisma.paciente.update.mock.calls[0][0].data).toEqual({ situacao: 'AGUARDANDO_EXAME' });
  });

  it('registra paciente inapto com motivo e o reprova (FA01)', async () => {
    const { service, prisma } = montar(agendada(JA_COMECOU));

    await service.registrarRealizada('m1', 'c1', { motivoReprovacao: 'Peso abaixo do mínimo' });

    expect(prisma.solicitacaoExame.create).not.toHaveBeenCalled();
    expect(prisma.consulta.update.mock.calls[0][0].data.motivoReprovacao).toBe('Peso abaixo do mínimo');
    expect(prisma.paciente.update.mock.calls[0][0].data).toEqual({ situacao: 'REPROVADO' });
  });

  it('exige exames ou motivo, nunca os dois nem nenhum (UC15 FE01)', async () => {
    await expect(montar(agendada(JA_COMECOU)).service.registrarRealizada('m1', 'c1', {})).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(
      montar(agendada(JA_COMECOU)).service.registrarRealizada('m1', 'c1', { exames: ['X'], motivoReprovacao: 'Motivo' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('não registra realizada nem não comparecimento antes do horário (FE01)', async () => {
    await expect(
      montar(agendada(AINDA_NAO)).service.registrarRealizada('m1', 'c1', { exames: ['Hemograma'] }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
    await expect(montar(agendada(AINDA_NAO)).service.registrarNaoComparecimento('m1', 'c1')).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
  });

  it('registra não comparecimento e devolve o paciente a Pré-cadastrado (FA02)', async () => {
    const { service, prisma } = montar(agendada(JA_COMECOU));

    await service.registrarNaoComparecimento('m1', 'c1');

    expect(prisma.consulta.update.mock.calls[0][0].data.situacao).toBe('NAO_COMPARECEU');
    expect(prisma.paciente.update.mock.calls[0][0].data).toEqual({ situacao: 'PRE_CADASTRADO' });
  });

  it('cancela antes do horário, retira o horário da agenda e registra o motivo (FA03)', async () => {
    const { service, prisma } = montar(agendada(AINDA_NAO));

    await service.cancelar('m1', 'c1', { motivo: 'Imprevisto' });

    expect(prisma.consulta.update.mock.calls[0][0].data).toMatchObject({
      situacao: 'CANCELADA',
      canceladaPor: 'MEDICO',
      motivoCancelamento: 'Imprevisto',
    });
    expect(prisma.disponibilidadeMedico.update.mock.calls[0][0]).toMatchObject({ where: { id: 'd1' } });
    expect(prisma.paciente.update.mock.calls[0][0].data).toEqual({ situacao: 'PRE_CADASTRADO' });
  });

  it('não cancela consulta que já começou', async () => {
    await expect(montar(agendada(JA_COMECOU)).service.cancelar('m1', 'c1', { motivo: 'Imprevisto' })).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
  });

  it('recusa registrar duas vezes e trata consulta de outro médico como inexistente', async () => {
    await expect(
      montar({ ...agendada(JA_COMECOU), situacao: 'REALIZADA' }).service.registrarNaoComparecimento('m1', 'c1'),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(montar(null).service.registrarNaoComparecimento('m1', 'c1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('mostra idade, sexo e peso do paciente no detalhe (passo 2)', async () => {
    const { service } = montar(detalheDb);

    const r = await service.detalhar('m1', 'c1');

    expect(r.paciente).toMatchObject({ nome: 'Maria', idade: 26, sexo: 'FEMININO', pesoKg: 62.5 });
    expect(r.linkSala).toBe('https://meet.exemplo.com/sala');
  });
});
