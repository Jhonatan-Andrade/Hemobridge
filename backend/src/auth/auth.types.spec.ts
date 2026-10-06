import { instituicaoDesativada } from './auth.types.js';

describe('instituicaoDesativada (RN09)', () => {
  const hospital = (ativo: boolean) => ({ hospital: { ativo } });

  it.each([
    ['paciente ou administrador (sem vínculo)', { medico: null, representante: null }, false],
    ['médico de hospital ativo', { medico: hospital(true), representante: null }, false],
    ['médico de hospital desativado', { medico: hospital(false), representante: null }, true],
    ['representante de hospital desativado', { medico: null, representante: hospital(false) }, true],
  ])('%s', (_, usuario, esperado) => {
    expect(instituicaoDesativada(usuario)).toBe(esperado);
  });
});
