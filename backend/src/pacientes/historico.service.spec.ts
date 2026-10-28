import { NotFoundException } from '@nestjs/common';
import { AuditoriaService } from '../auditoria/auditoria.service.js';
import type { MembroDaEquipe } from '../auth/auth.types.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { HistoricoService } from './historico.service.js';

const membroB: MembroDaEquipe = {
  id: 'medB',
  nome: 'Dra. Daniela',
  email: 'daniela@b.com',
  perfil: 'EQUIPE',
  papel: 'MEDICO',
  hemocentro: { id: 'hB', nome: 'Hemocentro B' },
  senhaProvisoria: false,
};

const doacao = (hemocentroId: string, nome: string) => ({
  id: `d-${hemocentroId}`,
  registradoEm: new Date('2026-09-25T12:00:00Z'),
  compareceu: true,
  doou: true,
  motivoNaoDoacao: null,
  observacoes: 'Sem intercorrências',
  tipoSanguineo: { sigla: 'O+' },
  hemocentro: { id: hemocentroId, nome, cidade: 'Curitiba', estado: 'PR' },
  medico: { usuario: { nome: 'Dr. Bruno' } },
  pesoKg: 72.5,
  alturaCm: null,
  pressaoSistolica: 120,
  pressaoDiastolica: 80,
  pulso: 70,
  temperatura: 36.5,
  hemoglobina: 14.2,
  hematocrito: null,
  volumeMl: 450,
  reacoes: 'Tontura leve',
  aptidao: 'APTO',
  aptoAPartirDe: null,
  numeroBolsa: `${hemocentroId}-0001`,
});

function montar(vinculo: unknown, doacoes: unknown[] = [doacao('hA', 'Hemocentro A')]) {
  const prisma = {
    agendamento: { findFirst: vi.fn().mockResolvedValue(vinculo) },
    paciente: {
      findUniqueOrThrow: vi.fn().mockResolvedValue({
        dataNascimento: null,
        situacao: 'ATIVA',
        tipoSanguineo: { sigla: 'O+' },
        usuario: { id: 'p1', nome: 'Paulo' },
        doacoes,
      }),
    },
  };
  const auditoria = { registrar: vi.fn().mockResolvedValue(undefined) };
  const service = new HistoricoService(prisma as unknown as PrismaService, auditoria as unknown as AuditoriaService);
  return { service, prisma, auditoria };
}

describe('HistoricoService (RF12 / RNF04 / RNF05)', () => {
  it('compartilha aferições, coleta e aptidão, mas não a triagem, os exames nem a bolsa de outro hemocentro', async () => {
    const inapto = { ...doacao('hB', 'Hemocentro B'), doou: false, aptidao: 'INAPTO_TEMPORARIO', aptoAPartirDe: new Date('2099-01-10T00:00:00Z') };
    const { service, prisma } = montar({ id: 'ag-b' }, [inapto, doacao('hA', 'Hemocentro A')]);

    const r = await service.historico(membroB, 'p1');

    const select = prisma.paciente.findUniqueOrThrow.mock.calls[0][0].select.doacoes.select;
    expect(select).not.toHaveProperty('triagem');
    expect(select).not.toHaveProperty('exames');
    expect(r.paciente).toMatchObject({ inaptoDefinitivo: false, aptoAPartirDe: '2099-01-10' });
    expect(r.doacoes[1]).toMatchObject({
      afericoes: { pesoKg: 72.5, pressaoSistolica: 120, hemoglobina: 14.2 },
      volumeMl: 450,
      reacoes: 'Tontura leve',
      aptidao: 'APTO',
      numeroBolsa: null,
    });
    expect(r.doacoes[0]).toMatchObject({ numeroBolsa: 'hB-0001', aptidao: 'INAPTO_TEMPORARIO', aptoAPartirDe: '2099-01-10' });
  });

  it('sem agendamento no hemocentro, o paciente é tratado como inexistente e nada é lido', async () => {
    const { service, prisma, auditoria } = montar(null);

    await expect(service.historico(membroB, 'p1')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.agendamento.findFirst.mock.calls[0][0].where).toEqual({
      pacienteId: 'p1',
      horario: { hemocentroId: 'hB' },
    });
    expect(prisma.paciente.findUniqueOrThrow).not.toHaveBeenCalled();
    expect(auditoria.registrar).not.toHaveBeenCalled();
  });

  it('com vínculo, mostra o registro do hemocentro A para o B e audita o acesso compartilhado', async () => {
    const { service, auditoria } = montar({ id: 'ag-b' });

    const r = await service.historico(membroB, 'p1');

    expect(r.doacoes).toEqual([
      expect.objectContaining({
        hemocentro: { id: 'hA', nome: 'Hemocentro A', cidade: 'Curitiba', estado: 'PR' },
        doMeuHemocentro: false,
        resultado: 'DOOU',
        tipoSanguineo: 'O+',
        medico: 'Dr. Bruno',
      }),
    ]);
    expect(auditoria.registrar).toHaveBeenCalledWith({
      usuarioId: 'medB',
      acao: 'VER_HISTORICO_COMPARTILHADO',
      entidade: 'paciente',
      entidadeId: 'p1',
      hemocentroId: 'hB',
    });
  });

  it('só com registros do próprio hemocentro, audita como leitura comum', async () => {
    const { service, auditoria } = montar({ id: 'ag-b' }, [doacao('hB', 'Hemocentro B')]);

    const r = await service.historico(membroB, 'p1');

    expect(r.doacoes[0].doMeuHemocentro).toBe(true);
    expect(auditoria.registrar.mock.calls[0][0].acao).toBe('VER_HISTORICO');
  });
});
