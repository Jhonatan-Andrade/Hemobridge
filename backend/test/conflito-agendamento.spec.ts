import { Prisma } from '../src/generated/prisma/client.js';
import { ehConflitoDeAgendamento } from '../src/consultas/conflito-agendamento.js';

const knownError = (cause?: Record<string, unknown>, modelName = 'Consulta') =>
  new Prisma.PrismaClientKnownRequestError('Erro privado do driver', {
    code: 'P2039',
    clientVersion: '7.10.0',
    meta: { modelName, driverAdapterError: cause ? { cause } : undefined },
  });

const occupation = {
  kind: 'postgres',
  code: '23P01',
  originalMessage:
    'conflicting key value violates exclusion constraint "consulta_disponibilidade_ativa_excl"',
};

describe('classificação restrita do conflito de agendamento', () => {
  it('reconhece a exclusão real da disponibilidade ocupada', () => {
    expect(ehConflitoDeAgendamento(knownError(occupation))).toBe(true);
  });

  it('não converte em ocupação uma exclusão de outra regra do banco', () => {
    expect(
      ehConflitoDeAgendamento(
        knownError({
          ...occupation,
          originalMessage:
            'conflicting key value violates exclusion constraint "outra_regra_excl"',
        }),
      ),
    ).toBe(false);
  });

  it('não encobre falha de serialização com o mesmo nome na mensagem', () => {
    expect(
      ehConflitoDeAgendamento(knownError({ ...occupation, code: '40001' })),
    ).toBe(false);
  });

  it('mantém sem classificação um P2039 sem metadados ou de outro modelo', () => {
    expect(ehConflitoDeAgendamento(knownError())).toBe(false);
    expect(ehConflitoDeAgendamento(knownError(occupation, 'Exame'))).toBe(
      false,
    );
  });

  it('não confia em um objeto genérico que imite o código Prisma', () => {
    expect(
      ehConflitoDeAgendamento({
        code: 'P2039',
        meta: {
          modelName: 'Consulta',
          driverAdapterError: { cause: occupation },
        },
      }),
    ).toBe(false);
  });
});
