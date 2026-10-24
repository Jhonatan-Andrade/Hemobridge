import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { lastValueFrom, of } from 'rxjs';
import type { AuditoriaService } from '../auditoria/auditoria.service.js';
import { AuditoriaInterceptor } from '../auditoria/auditoria.interceptor.js';
import { DoacoesController } from './doacoes.controller.js';

describe('Auditoria das leituras de doação', () => {
  it.each([
    ['listar', 'LISTAR_DOACOES', 'doacao'],
    ['buscarDoador', 'BUSCAR_DOADOR', 'paciente'],
  ] as const)(
    'registra acesso em %s sem copiar CPF, nome, tipagem, peso ou corpo da resposta',
    async (metodo, acao, entidade) => {
      const registrar = vi.fn().mockResolvedValue(undefined);
      const interceptor = new AuditoriaInterceptor(new Reflector(), {
        registrar,
      } as unknown as AuditoriaService);
      const context = {
        getType: () => 'http',
        getHandler: () => DoacoesController.prototype[metodo],
        switchToHttp: () => ({
          getRequest: () => ({
            usuario: { id: 'representante-1' },
            params: {},
            body: { cpf: '12345678909' },
            ip: '127.0.0.1',
          }),
        }),
      } as unknown as ExecutionContext;
      const resposta = {
        encontrado: true,
        doador: { id: 'paciente-1', nome: 'Nome privado', tipo: 'O-' },
        itens: [{ pesoAferido: 72.5 }],
      };
      expect(
        await lastValueFrom(
          interceptor.intercept(context, { handle: () => of(resposta) }),
        ),
      ).toBe(resposta);
      expect(registrar).toHaveBeenCalledTimes(1);
      expect(registrar).toHaveBeenCalledWith({
        usuarioId: 'representante-1',
        acao,
        entidade,
        entidadeId: 'representante-1',
        ipOrigem: '127.0.0.1',
      });
    },
  );
});
