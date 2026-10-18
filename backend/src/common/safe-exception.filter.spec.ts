import {
  BadRequestException,
  type ArgumentsHost,
  Logger,
} from '@nestjs/common';
import { SafeExceptionFilter } from './safe-exception.filter.js';

describe('respostas de erro sem dados privados', () => {
  const payload = vi.fn();
  const logged = vi.fn();
  const status = vi.fn(() => ({ json: payload }));
  const host = {
    switchToHttp: () => ({ getResponse: () => ({ status }) }),
  } as unknown as ArgumentsHost;
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Logger.prototype, 'error').mockImplementation(logged);
  });
  afterEach(() => vi.restoreAllMocks());

  it('não inclui conteúdo sensível de erros internos na resposta nem no log', () => {
    new SafeExceptionFilter().catch(
      new Error('CPF e resultado clínico confidenciais'),
      host,
    );
    expect(status).toHaveBeenCalledWith(500);
    expect(JSON.stringify(payload.mock.calls)).not.toContain('confidenciais');
    expect(
      JSON.stringify(logged.mock.calls),
    ).not.toContain('confidenciais');
    expect(payload).toHaveBeenCalledWith(
      expect.objectContaining({ referencia: expect.any(String) }),
    );
  });

  it('preserva a resposta de validação e trata conflito sem parâmetros de SQL', () => {
    new SafeExceptionFilter().catch(
      new BadRequestException('Revise os campos.'),
      host,
    );
    expect(status).toHaveBeenLastCalledWith(400);
    new SafeExceptionFilter().catch(
      { code: 'P2002', message: 'chave com CPF' },
      host,
    );
    expect(status).toHaveBeenLastCalledWith(409);
    expect(JSON.stringify(payload.mock.calls)).not.toContain('CPF');
  });
});
