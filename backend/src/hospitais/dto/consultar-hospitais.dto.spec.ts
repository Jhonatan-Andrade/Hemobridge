import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ConsultarHospitaisDto } from './consultar-hospitais.dto.js';

async function converter(query: Record<string, unknown>) {
  const dto = plainToInstance(ConsultarHospitaisDto, query);
  const erros = await validate(dto);
  return { dto, campos: erros.map((e) => e.property) };
}

describe('ConsultarHospitaisDto', () => {
  it('aplica os valores padrão de paginação', async () => {
    const { dto, campos } = await converter({});
    expect(campos).toEqual([]);
    expect(dto).toMatchObject({ pagina: 1, tamanhoPagina: 20 });
  });

  it('converte números da query string', async () => {
    const { dto } = await converter({ lat: '-25.4', lng: '-49.2', raioKm: '15', pagina: '2' });
    expect(dto).toMatchObject({ lat: -25.4, lng: -49.2, raioKm: 15, pagina: 2 });
  });

  it.each([
    ['lista separada por vírgula', 'O-,a%2B'.replace('%2B', '+'), ['O-', 'A+']],
    ['"+" não codificado, que chega como espaço', 'A ,AB ', ['A+', 'AB+']],
    ['parâmetro repetido', ['O-', 'B+'], ['O-', 'B+']],
  ])('interpreta tipos em %s', async (_, tipos, esperado) => {
    const { dto, campos } = await converter({ tipos });
    expect(campos).toEqual([]);
    expect(dto.tipos).toEqual(esperado);
  });

  it('normaliza o estado para maiúsculas', async () => {
    const { dto } = await converter({ estado: ' pr ' });
    expect(dto.estado).toBe('PR');
  });

  it.each([
    ['estado', { estado: 'XX' }],
    ['tipos', { tipos: 'O-,C+' }],
    ['lat', { lat: '91' }],
    ['lng', { lng: 'abc' }],
    ['tamanhoPagina', { tamanhoPagina: '51' }],
    ['pagina', { pagina: '0' }],
  ])('rejeita %s inválido', async (campo, query) => {
    expect((await converter(query)).campos).toContain(campo);
  });
});
