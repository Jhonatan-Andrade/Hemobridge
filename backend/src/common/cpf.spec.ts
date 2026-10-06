import { isCpfValido, mascararCpf, normalizarCpf } from './cpf.js';

describe('cpf', () => {
  it('normaliza removendo a máscara', () => {
    expect(normalizarCpf('529.982.247-25')).toBe('52998224725');
  });

  it.each(['52998224725', '529.982.247-25', '11144477735'])(
    'aceita CPF válido %s',
    (cpf) => expect(isCpfValido(cpf)).toBe(true),
  );

  it.each(['52998224724', '11111111111', '1234567890', 'abc', ''])(
    'rejeita CPF inválido %s',
    (cpf) => expect(isCpfValido(cpf)).toBe(false),
  );
});

describe('mascararCpf', () => {
  it('mostra só os dígitos centrais', () => {
    expect(mascararCpf('52998224725')).toBe('***.982.247-**');
    expect(mascararCpf('529.982.247-25')).toBe('***.982.247-**');
  });
});
