import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PERFIS_KEY } from '../auth/decorators.js';
import { AUDITAR_KEY } from '../auditoria/auditar.decorator.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ConsultarLocaisRecomendadosDto } from './dto/consultar-locais-recomendados.dto.js';
import { LocaisRecomendadosController } from './locais-recomendados.controller.js';
import { LocaisRecomendadosService } from './locais-recomendados.service.js';

const paciente = {
  situacao: 'APROVADO',
  cidade: 'São José',
  estado: 'PR',
  dataNascimento: new Date('1995-01-01T00:00:00Z'),
  sexo: 'MASCULINO',
  pesoKg: 70,
  tipoSanguineo: { id: 8, sigla: 'O-' },
  doacoes: [],
};
function necessidade(
  id: string,
  nivel = 'CRITICO',
  tipo = 'O-',
  cidade = 'São José',
  estado = 'PR',
  latitude = -25.4,
) {
  return {
    id,
    nivel,
    tipoSanguineo: { sigla: tipo },
    atualizadoEm: new Date('2026-10-20T15:00:00Z'),
    hospital: {
      id: `hospital-${id}`,
      nome: `Hospital ${id}`,
      endereco: 'Rua das Flores, 10',
      cidade,
      estado,
      latitude,
      longitude: -49.2,
      horarioFuncionamento: null,
    },
  };
}

describe('Recomendações de locais para doação', () => {
  const prisma = {
    paciente: { findUnique: vi.fn() },
    necessidadeEstoque: { findMany: vi.fn() },
  };
  const service = new LocaisRecomendadosService(
    prisma as unknown as PrismaService,
  );

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-23T15:00:00Z'));
    prisma.paciente.findUnique.mockReset().mockResolvedValue(paciente);
    prisma.necessidadeEstoque.findMany.mockReset().mockResolvedValue([]);
  });
  afterEach(() => vi.useRealTimers());

  it('restringe o controller ao perfil paciente autenticado', () => {
    expect(
      Reflect.getMetadata(PERFIS_KEY, LocaisRecomendadosController),
    ).toEqual(['PACIENTE']);
  });

  it('audita a leitura sensível e as falhas sem configurar gravação de payload', () => {
    expect(
      Reflect.getMetadata(
        AUDITAR_KEY,
        Object.getOwnPropertyDescriptor(LocaisRecomendadosController.prototype, 'listar')!.value,
      ),
    ).toEqual({
      acao: 'CONSULTAR_LOCAIS_RECOMENDADOS',
      entidade: 'paciente',
      registrarFalha: true,
    });
  });

  it.each([
    null,
    { ...paciente, situacao: 'PRE_CADASTRADO' },
    { ...paciente, tipoSanguineo: null },
  ])('exige aprovação e tipo validado no servidor', async (dados) => {
    prisma.paciente.findUnique.mockResolvedValue(dados);
    await expect(service.listar('conta', {})).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prisma.necessidadeEstoque.findMany).not.toHaveBeenCalled();
  });

  it('deriva compatibilidade RN05 do tipo persistido e consulta apenas níveis úteis de hospitais ativos', async () => {
    await service.listar('conta', {});
    expect(prisma.paciente.findUnique.mock.calls[0][0].where).toEqual({
      usuarioId: 'conta',
    });
    expect(prisma.necessidadeEstoque.findMany.mock.calls[0][0].where).toEqual({
      nivel: { in: ['CRITICO', 'BAIXO', 'ESTAVEL'] },
      hospital: { ativo: true },
      tipoSanguineo: { recebeDe: { some: { tipoDoadorId: 8 } } },
    });
  });

  it('ordena por nível, tipo exato, cidade e estado antes da distância', async () => {
    prisma.necessidadeEstoque.findMany.mockResolvedValue([
      necessidade('estavel', 'ESTAVEL'),
      necessidade('baixo', 'BAIXO'),
      necessidade('compativel-cidade', 'CRITICO', 'A+'),
      necessidade('outro-estado', 'CRITICO', 'O-', 'São José', 'SP', -25.40001),
      necessidade('mesmo-estado', 'CRITICO', 'O-', 'Outra', 'PR', -25.4001),
      necessidade('mesma-cidade', 'CRITICO', 'O-', 'sao jose', 'PR', -25.5),
    ]);
    const result = await service.listar('conta', { lat: -25.4, lng: -49.2 });
    expect(result.itens.map((item) => item.id)).toEqual([
      'mesma-cidade',
      'mesmo-estado',
      'outro-estado',
      'compativel-cidade',
      'baixo',
      'estavel',
    ]);
    expect(result.itens[0]).toMatchObject({
      mesmoTipo: true,
      mesmaCidade: true,
      mesmoEstado: true,
      atualizadoEm: '2026-10-20T15:00:00.000Z',
    });
  });

  it('usa distância apenas para desempatar prioridades iguais e aceita busca sem GPS', async () => {
    prisma.necessidadeEstoque.findMany.mockResolvedValue([
      necessidade('longe', 'CRITICO', 'O-', 'São José', 'PR', -26),
      necessidade('perto'),
    ]);
    expect(
      (await service.listar('conta', { lat: -25.4, lng: -49.2 })).itens.map(
        (i) => i.id,
      ),
    ).toEqual(['perto', 'longe']);
    expect(
      (await service.listar('conta', {})).itens.every(
        (i) => i.distanciaKm === null,
      ),
    ).toBe(true);
  });

  it('retorna data estimada e não impede consultar necessidades durante intervalo de doação', async () => {
    prisma.paciente.findUnique.mockResolvedValue({
      ...paciente,
      doacoes: [{ dataColeta: new Date('2026-10-01T00:00:00Z') }],
    });
    const result = await service.listar('conta', {});
    expect(result.elegibilidade).toMatchObject({
      elegivel: false,
      motivo: 'INTERVALO',
    });
    expect(result.dataEstimadaElegibilidade).toBe('2026-11-30');
    expect(result.orientacao).toContain('triagem presencial');
  });

  it('informa hoje se elegível e mantém resposta vazia explícita sem necessidades', async () => {
    expect(await service.listar('conta', {})).toMatchObject({
      tipoDoador: 'O-',
      dataEstimadaElegibilidade: '2026-10-23',
      referencia: { cidade: 'São José', estado: 'PR' },
      itens: [],
    });
  });

  it.each([true, false, null])('considera apenas a confirmação persistida da triagem para doação pré-60: %s', async (confirmacao) => {
    prisma.paciente.findUnique.mockResolvedValue({
      ...paciente,
      dataNascimento: new Date('1963-01-01T00:00:00Z'),
      doacoes: [{ dataColeta: new Date('2026-06-01T00:00:00Z'), doouAntesDos60Confirmado: confirmacao }],
    });
    const result = await service.listar('conta', {});
    expect(result.elegibilidade.elegivel).toBe(confirmacao === true);
    if (confirmacao !== true) expect(result.elegibilidade.motivo).toBe('PRIMEIRA_DOACAO_APOS_60');
    expect(prisma.paciente.findUnique.mock.calls[0][0].select.doacoes.select.doouAntesDos60Confirmado).toBe(true);
  });

  it('rejeita coordenada incompleta antes de consultar dados privados', async () => {
    await expect(service.listar('conta', { lat: -25 })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.paciente.findUnique).not.toHaveBeenCalled();
  });

  it.each([
    { lat: '91', lng: '0' },
    { lat: '0', lng: '-181' },
    { lat: 'abc', lng: '0' },
  ])('valida coordenadas fornecidas', async (query) => {
    expect(
      (await validate(plainToInstance(ConsultarLocaisRecomendadosDto, query)))
        .length,
    ).toBeGreaterThan(0);
  });

  it('não aceita tipo sanguíneo ou localidade manipulados na query', async () => {
    const dto = plainToInstance(ConsultarLocaisRecomendadosDto, {
      tipo: 'AB+',
      cidade: 'Outra',
      estado: 'SP',
    });
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    expect(errors.map((error) => error.property).sort()).toEqual([
      'cidade',
      'estado',
      'tipo',
    ]);
  });
});
