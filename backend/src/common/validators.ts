import { ValidateBy, ValidationOptions, buildMessage } from 'class-validator';
import { isCpfValido } from './cpf.js';

/** CPF válido pelos dígitos verificadores (RN06). */
export function IsCpf(options?: ValidationOptions): PropertyDecorator {
  return ValidateBy(
    {
      name: 'isCpf',
      validator: {
        validate: (valor) => typeof valor === 'string' && isCpfValido(valor),
        defaultMessage: buildMessage(() => 'CPF inválido', options),
      },
    },
    options,
  );
}

export const MENSAGEM_SENHA_INVALIDA =
  'A senha deve ter entre 8 e 128 caracteres, com pelo menos uma letra maiúscula, uma letra minúscula e um número';

// RN06: mínimo de 8 caracteres, com letra maiúscula, letra minúscula e número.
const REGEX_SENHA = /^(?=.*\p{Lu})(?=.*\p{Ll})(?=.*\d).{8,128}$/u;

export function isSenhaValida(valor: unknown): boolean {
  return typeof valor === 'string' && REGEX_SENHA.test(valor);
}

/** Senha conforme a política da plataforma (RN06). */
export function IsSenhaValida(options?: ValidationOptions): PropertyDecorator {
  return ValidateBy(
    {
      name: 'isSenhaValida',
      validator: {
        validate: isSenhaValida,
        defaultMessage: buildMessage(() => MENSAGEM_SENHA_INVALIDA, options),
      },
    },
    options,
  );
}

/** O valor deve ser igual ao de outra propriedade do mesmo objeto (ex.: confirmação de senha). */
export function IsIgualA(propriedade: string, options?: ValidationOptions): PropertyDecorator {
  return ValidateBy(
    {
      name: 'isIgualA',
      constraints: [propriedade],
      validator: {
        validate: (valor, args) =>
          valor === (args?.object as Record<string, unknown> | undefined)?.[propriedade],
        defaultMessage: buildMessage(
          (prefixo) => `${prefixo}$property deve ser igual a $constraint1`,
          options,
        ),
      },
    },
    options,
  );
}
