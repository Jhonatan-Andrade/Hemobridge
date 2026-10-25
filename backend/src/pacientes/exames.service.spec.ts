import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ArmazenamentoService } from '../armazenamento/armazenamento.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ExamesPacienteService } from './exames.service.js';

const PDF = Buffer.from('%PDF-1.7\nconteudo');
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
const arquivo = (buffer: Buffer, nome = 'resultado.pdf') => ({ originalname: nome, mimetype: 'application/pdf', size: buffer.length, buffer });

function montar(solicitacao: object | null = { situacao: 'AGUARDANDO_RESULTADO', paciente: { situacao: 'AGUARDANDO_EXAME' } }) {
  const prisma = {
    solicitacaoExame: {
      findFirst: vi.fn().mockResolvedValue(solicitacao),
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockReturnValue('upd-solicitacao'),
    },
    exame: { create: vi.fn().mockReturnValue('create-exame'), findFirst: vi.fn().mockResolvedValue(null) },
    paciente: { update: vi.fn().mockReturnValue('upd-paciente') },
    $transaction: vi.fn().mockResolvedValue([]),
  };
  const armazenamento = { salvar: vi.fn(), ler: vi.fn(), remover: vi.fn() };
  const service = new ExamesPacienteService(
    prisma as unknown as PrismaService,
    armazenamento as unknown as ArmazenamentoService,
  );
  return { service, prisma, armazenamento };
}

describe('ExamesPacienteService', () => {
  it('guarda o arquivo, registra o envio e passa o paciente a Em análise (UC11, RN10)', async () => {
    const { service, prisma, armazenamento } = montar();

    await service.enviarResultado('p1', 's1', arquivo(PDF));

    const chave = armazenamento.salvar.mock.calls[0][0];
    expect(chave).toMatch(/^exames\/s1\/[0-9a-f-]{36}\.pdf$/);
    expect(prisma.exame.create.mock.calls[0][0].data).toMatchObject({
      solicitacaoId: 's1',
      mimeType: 'application/pdf',
      tamanhoBytes: PDF.length,
      chaveArmazenamento: chave,
      nomeArquivo: 'resultado.pdf',
    });
    expect(prisma.exame.create.mock.calls[0][0].data.hashSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(prisma.solicitacaoExame.update.mock.calls[0][0].data).toEqual({ situacao: 'EM_ANALISE' });
    expect(prisma.paciente.update.mock.calls[0][0].data).toEqual({ situacao: 'EM_ANALISE' });
  });

  it('identifica o tipo pelo conteúdo, não pela extensão nem pelo tipo declarado (RN19)', async () => {
    const { service, prisma } = montar();

    await service.enviarResultado('p1', 's1', arquivo(PNG, 'foto.pdf'));

    expect(prisma.exame.create.mock.calls[0][0].data.mimeType).toBe('image/png');
    await expect(service.enviarResultado('p1', 's1', arquivo(Buffer.from('MZ executavel'), 'exame.pdf'))).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('exige o arquivo', async () => {
    await expect(montar().service.enviarResultado('p1', 's1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('permite reenvio depois de reprovado (FA01) e recusa enquanto está em análise', async () => {
    const reenvio = montar({ situacao: 'REPROVADO', paciente: { situacao: 'REPROVADO' } });
    await reenvio.service.enviarResultado('p1', 's1', arquivo(PDF));
    expect(reenvio.prisma.$transaction).toHaveBeenCalled();

    const emAnalise = montar({ situacao: 'EM_ANALISE', paciente: { situacao: 'EM_ANALISE' } });
    await expect(emAnalise.service.enviarResultado('p1', 's1', arquivo(PDF))).rejects.toBeInstanceOf(ConflictException);
    expect(emAnalise.armazenamento.salvar).not.toHaveBeenCalled();
  });

  it('remove o arquivo salvo se o registro no banco falhar', async () => {
    const { service, prisma, armazenamento } = montar();
    prisma.$transaction.mockRejectedValue(new Error('falha'));

    await expect(service.enviarResultado('p1', 's1', arquivo(PDF))).rejects.toThrow('falha');
    expect(armazenamento.remover).toHaveBeenCalledWith(armazenamento.salvar.mock.calls[0][0]);
  });

  it('trata solicitação e arquivo de outro paciente como inexistentes', async () => {
    const { service, prisma } = montar(null);

    await expect(service.enviarResultado('p1', 's9', arquivo(PDF))).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.arquivo('p1', 's9', 'e9')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.exame.findFirst.mock.calls[0][0].where).toEqual({ id: 'e9', solicitacao: { id: 's9', pacienteId: 'p1' } });
  });
});
