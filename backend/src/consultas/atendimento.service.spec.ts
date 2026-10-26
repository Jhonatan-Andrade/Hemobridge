import { BadRequestException, ConflictException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { AuditoriaService } from '../auditoria/auditoria.service.js';
import type { NotificacoesService } from '../notificacoes/notificacoes.service.js';
import { AtendimentoService } from './atendimento.service.js';

const agora = new Date('2026-10-23T15:00:00Z');
function cenario() {
  const tx = { $queryRaw: vi.fn().mockResolvedValue([{ usuario_id: 'p', status: 'ATIVO' }]),
    consulta: { findFirst: vi.fn().mockResolvedValueOnce({ pacienteId: 'p' }).mockResolvedValueOnce({ id: 'c' }).mockResolvedValue({ status: 'AGENDADA', motivoReprovacao: null, disponibilidade: { inicio: new Date('2026-10-23T14:00:00Z') }, paciente: { situacao: 'CONSULTA_AGENDADA' } }), update: vi.fn(), updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    paciente: { update: vi.fn(), updateMany: vi.fn() }, disponibilidadeMedico: { update: vi.fn() } };
  const prisma = { $transaction: vi.fn(async (run) => run(tx)) };
  const auditoria = { registrarEm: vi.fn() };
  const notificacoes = { registrarEm: vi.fn().mockResolvedValue(['n']), despacharEmails: vi.fn().mockResolvedValue({}) };
  return { tx, notificacoes, auditoria, service: new AtendimentoService(prisma as unknown as PrismaService,
    notificacoes as unknown as NotificacoesService, auditoria as unknown as AuditoriaService) };
}
describe('Desfechos do atendimento e ciclo atual', () => {
  it('preserva observações e registra inaptidão com motivo, notificação e trilha sem dados clínicos no log', async () => {
    const { service, tx, notificacoes, auditoria } = cenario();
    await service.registrar('m', 'c', { status: 'REALIZADA', observacoes: ' Avaliação clínica. ', decisao: 'REPROVAR', motivoReprovacao: 'Restrição clínica temporária.' }, agora);
    expect(tx.consulta.update).toHaveBeenCalledWith({ where: { id: 'c' }, data: { status: 'REALIZADA', observacoes: 'Avaliação clínica.', motivoReprovacao: 'Restrição clínica temporária.' } });
    expect(tx.paciente.update.mock.calls[0][0].data.situacao).toBe('REPROVADO');
    expect(notificacoes.registrarEm.mock.calls[0][1].usuarioId).toBe('p');
    expect(auditoria.registrarEm.mock.calls[0][1].detalhes).toEqual({ status: 'REALIZADA', decisao: 'REPROVAR' });
    expect(notificacoes.despacharEmails).toHaveBeenCalledWith(['n']);
  });
  it('registra falta, retorna ao pré-cadastro e orienta novo agendamento', async () => {
    const { service, tx, notificacoes } = cenario();
    await service.registrar('m', 'c', { status: 'NAO_COMPARECEU' }, agora);
    expect(tx.paciente.update.mock.calls[0][0].data.situacao).toBe('PRE_CADASTRADO');
    expect(notificacoes.registrarEm.mock.calls[0][1].mensagem).toMatch(/nova pré-triagem/);
  });
  it('bloqueia qualquer decisão antes do horário sem gravar', async () => {
    const { service, tx } = cenario();
    await expect(service.registrar('m', 'c', { status: 'REALIZADA' }, new Date('2026-10-23T13:00:00Z'))).rejects.toBeInstanceOf(ConflictException);
    expect(tx.consulta.update).not.toHaveBeenCalled();
  });
  it('bloqueia alterações clínicas de uma consulta anterior', async () => {
    const { service, tx } = cenario();
    tx.consulta.findFirst.mockReset().mockResolvedValueOnce({ pacienteId: 'p' }).mockResolvedValueOnce({ id: 'outra' });
    await expect(service.registrar('m', 'c', { status: 'REALIZADA' }, agora)).rejects.toBeInstanceOf(ConflictException);
    expect(tx.consulta.update).not.toHaveBeenCalled();
  });
  it('não mistura falta com decisão clínica nem permite inaptidão sem motivo', async () => {
    const { service, tx } = cenario();
    await expect(service.registrar('m', 'c', { status: 'NAO_COMPARECEU', decisao: 'REPROVAR', motivoReprovacao: 'Motivo clínico.' }, agora)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.registrar('m', 'c', { status: 'REALIZADA', decisao: 'REPROVAR' }, agora)).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.consulta.update).not.toHaveBeenCalled();
  });
  it('cancelamento médico retira o horário reservável e notifica apenas após transação', async () => {
    const { service, tx, notificacoes } = cenario();
    tx.consulta.findFirst.mockReset().mockResolvedValueOnce({ pacienteId: 'p', disponibilidadeId: 'h' }).mockResolvedValueOnce({ id: 'c' });
    await service.cancelar('m', 'c', 'Indisponibilidade do profissional.', agora);
    expect(tx.disponibilidadeMedico.update).toHaveBeenCalledWith({ where: { id: 'h' }, data: { canceladaEm: agora } });
    expect(tx.paciente.updateMany.mock.calls[0][0].data.situacao).toBe('PRE_CADASTRADO');
    expect(notificacoes.despacharEmails).toHaveBeenCalledWith(['n']);
  });
});
