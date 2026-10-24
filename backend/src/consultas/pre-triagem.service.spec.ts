import { BadRequestException, ConflictException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { AuditoriaService } from '../auditoria/auditoria.service.js';
import { PreTriagemService } from './pre-triagem.service.js';
import { VERSAO_PRE_TRIAGEM } from './pre-triagem.dto.js';

const agora = new Date('2026-10-23T15:00:00Z');
const respostas = { versao: VERSAO_PRE_TRIAGEM, pesoKg: 70, doouAntes: false, condicaoSaudeRequerAvaliacao: false };
function cenario() {
  const tx = { $queryRaw: vi.fn().mockResolvedValue([{ usuario_id: 'p', status: 'ATIVO' }]),
    paciente: { findUniqueOrThrow: vi.fn().mockResolvedValue({ situacao: 'PRE_CADASTRADO', dataNascimento: new Date('1995-01-01'), sexo: 'MASCULINO', doacoes: [] }) },
    preTriagem: { findFirst: vi.fn().mockResolvedValue(null), create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'triagem', resultado: data.resultado, respondidaEm: data.respondidaEm, proximaDataPossivel: data.proximaDataPossivel })) } };
  const prisma = { $transaction: vi.fn(async (run) => run(tx)) };
  const auditoria = { registrarEm: vi.fn() };
  return { tx, auditoria, service: new PreTriagemService(prisma as unknown as PrismaService, auditoria as unknown as AuditoriaService) };
}
describe('Pré-triagem persistida e orientativa', () => {
  it('grava a versão e somente as respostas efetivamente informadas', async () => {
    const { service, tx, auditoria } = cenario();
    const r = await service.responder('p', respostas, agora);
    expect(r).toMatchObject({ resultado: 'APTO_CRITERIOS_BASICOS', permiteAgendarConsulta: true, versao: VERSAO_PRE_TRIAGEM });
    expect(tx.preTriagem.create.mock.calls[0][0].data.respostas.create).toHaveLength(3);
    expect(tx.preTriagem.create.mock.calls[0][0].data.versaoQuestionario).toBe(VERSAO_PRE_TRIAGEM);
    expect(auditoria.registrarEm.mock.calls[0][1].detalhes).toEqual({ versao: VERSAO_PRE_TRIAGEM });
  });
  it('intervalo insuficiente preserva próxima data e a alternativa de consulta médica', async () => {
    const { service } = cenario();
    const r = await service.responder('p', { ...respostas, doouAntes: true, dataUltimaDoacao: '2026-10-22' }, agora);
    expect(r.resultado).toBe('AGUARDAR_INTERVALO');
    expect(r.proximaDataPossivel).toEqual(new Date('2026-12-21T00:00:00Z'));
    expect(r.permiteAgendarConsulta).toBe(true);
  });
  it('condição de saúde exige confirmação sem constituir aprovação clínica', async () => {
    const { service } = cenario();
    expect(await service.responder('p', { ...respostas, condicaoSaudeRequerAvaliacao: true }, agora))
      .toMatchObject({ resultado: 'REQUER_CONFIRMACAO', permiteAgendarConsulta: true });
  });
  it('ordena respostas concorrentes após a trava sem desempatar por UUID aleatório', async () => {
    const { service, tx } = cenario();
    tx.preTriagem.findFirst.mockResolvedValue({ respondidaEm: agora } as never);
    const r = await service.responder('p', respostas, agora);
    expect(r.respondidaEm.getTime()).toBe(agora.getTime() + 1);
  });
  it('nega usuário encerrado depois de obter a trava e não grava uma resposta antiga', async () => {
    const { service, tx } = cenario();
    tx.$queryRaw.mockResolvedValue([{ status: 'INATIVO' }] as never);
    await expect(service.responder('p', respostas, agora)).rejects.toBeInstanceOf(ConflictException);
    expect(tx.preTriagem.create).not.toHaveBeenCalled();
    expect(tx.paciente.findUniqueOrThrow).not.toHaveBeenCalled();
  });
  for (const dados of [ { versao: 'antiga' }, { doouAntes: true },
    { doouAntes: true, dataUltimaDoacao: '2026-10-24' }, { dataUltimaDoacao: '2026-10-01' }, { doouAntesDos60: true } ]) {
    it(`rejeita respostas inconsistentes sem gravar: ${JSON.stringify(dados)}`, async () => {
      const { service, tx } = cenario();
      await expect(service.responder('p', { ...respostas, ...dados }, agora)).rejects.toBeInstanceOf(BadRequestException);
      expect(tx.preTriagem.create).not.toHaveBeenCalled();
    });
  }
  it('impede nova triagem durante uma jornada em andamento', async () => {
    const { service, tx } = cenario();
    tx.paciente.findUniqueOrThrow.mockResolvedValue({ situacao: 'CONSULTA_AGENDADA' } as never);
    await expect(service.responder('p', respostas, agora)).rejects.toBeInstanceOf(ConflictException);
    expect(tx.preTriagem.create).not.toHaveBeenCalled();
  });
});
