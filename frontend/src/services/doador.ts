import type { Doador, UsuarioAutenticado } from '../api/types'

/**
 * MOCK isolado: o backend ainda não expõe os dados do paciente logado.
 *
 * Contrato esperado (ver README → "Contratos pendentes"):
 *   GET /pacientes/me  →  { id, nome, situacao, tipoSanguineo: "O+" | null, cidade, estado }
 *
 * Até lá, a situação vem do papel da sessão (DOADOR = APROVADO, RN10) e o tipo
 * sanguíneo e a cidade são valores de demonstração. Para trocar pela API, basta
 * substituir o corpo de `obterPerfil` por `api.get<Doador>('/pacientes/me')`.
 */
export const doadorService = {
  async obterPerfil(usuario: UsuarioAutenticado): Promise<Doador> {
    const aprovado = usuario.papel === 'DOADOR'
    return {
      id: usuario.id,
      nome: usuario.nome,
      situacao: aprovado ? 'APROVADO' : 'PRE_CADASTRADO',
      tipoSanguineo: aprovado ? 'O+' : null,
      cidade: 'Curitiba',
      estado: 'PR',
    }
  },
}
