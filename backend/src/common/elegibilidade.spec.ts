import { estimarElegibilidade, proximaDataDoacao, somarDias } from './elegibilidade.js';

const HOJE = '2026-10-09';
const base = { dataNascimento: '1990-05-10', sexo: 'MASCULINO' as const, pesoKg: 80, doacoes: [] as string[] };

describe('estimarElegibilidade (RN17)', () => {
  it('doador sem doações anteriores é elegível', () => {
    expect(estimarElegibilidade(base, HOJE)).toEqual({ elegivel: true, exigeAutorizacaoResponsavel: false });
  });

  it.each([
    ['menos de 16 anos', { dataNascimento: '2011-01-01' }, 'IDADE'],
    ['mais de 69 anos', { dataNascimento: '1950-01-01' }, 'IDADE'],
    ['menos de 50 kg', { pesoKg: 49.9 }, 'PESO'],
  ])('recusa %s', (_, ajuste, motivo) => {
    expect(estimarElegibilidade({ ...base, ...ajuste }, HOJE)).toMatchObject({ elegivel: false, motivo });
  });

  it('homem antes de 60 dias informa a data possível (PT15)', () => {
    const r = estimarElegibilidade({ ...base, doacoes: ['2026-09-01'] }, HOJE);
    expect(r).toMatchObject({ elegivel: false, motivo: 'INTERVALO', proximaData: '2026-10-31' });
  });

  it('mulher antes de 90 dias é inelegível; com 90 dias, elegível (PT15)', () => {
    const mulher = { ...base, sexo: 'FEMININO' as const };
    expect(estimarElegibilidade({ ...mulher, doacoes: ['2026-08-01'] }, HOJE)).toMatchObject({
      motivo: 'INTERVALO',
      proximaData: '2026-10-30',
    });
    expect(estimarElegibilidade({ ...mulher, doacoes: [somarDias(HOJE, -90)] }, HOJE).elegivel).toBe(true);
  });

  it('mulher com 3 doações em 12 meses atinge o limite anual', () => {
    const r = estimarElegibilidade(
      { ...base, sexo: 'FEMININO', doacoes: ['2025-11-01', '2026-02-15', '2026-06-01'] },
      HOJE,
    );
    expect(r).toMatchObject({ elegivel: false, motivo: 'LIMITE_ANUAL', proximaData: '2026-11-01' });
  });

  it('homem com 3 doações em 12 meses ainda pode doar a 4ª', () => {
    const r = estimarElegibilidade({ ...base, doacoes: ['2025-11-01', '2026-02-15', '2026-06-01'] }, HOJE);
    expect(r.elegivel).toBe(true);
  });

  it('entre 61 e 69 anos exige doação antes dos 60 ou confirmação da triagem', () => {
    const idoso = { ...base, dataNascimento: '1960-01-01' };
    expect(estimarElegibilidade(idoso, HOJE).motivo).toBe('PRIMEIRA_DOACAO_APOS_60');
    expect(estimarElegibilidade({ ...idoso, doacoes: ['2015-03-01'] }, HOJE).elegivel).toBe(true);
    expect(estimarElegibilidade({ ...idoso, doouAntesDos60Confirmado: true }, HOJE).elegivel).toBe(true);
  });

  it('menor de 18 é elegível com autorização do responsável', () => {
    expect(estimarElegibilidade({ ...base, dataNascimento: '2009-01-01' }, HOJE)).toEqual({
      elegivel: true,
      exigeAutorizacaoResponsavel: true,
    });
  });

  it('proximaDataDoacao devolve hoje quando já pode doar', () => {
    expect(proximaDataDoacao(base, HOJE)).toBe(HOJE);
    expect(proximaDataDoacao({ ...base, doacoes: ['2026-09-01'] }, HOJE)).toBe('2026-10-31');
  });
});
