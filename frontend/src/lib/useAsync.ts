import { useCallback, useEffect, useRef, useState } from 'react'
import { mensagemDeErro } from '../api/client'

type Resultado<T> = { chave: string; dados: T | null; erro: string[] | null }

/**
 * Executa uma busca assíncrona e expõe carregamento, erro e dados.
 * A busca é refeita quando os valores de `deps` mudam; `recarregar` a repete.
 */
export function useAsync<T>(buscar: () => Promise<T>, deps: unknown[]) {
  const [versao, setVersao] = useState(0)
  const chave = `${JSON.stringify(deps)}#${versao}`
  const [resultado, setResultado] = useState<Resultado<T> | null>(null)

  // Sempre usa a função mais recente sem depender da sua identidade.
  const buscarRef = useRef(buscar)
  useEffect(() => {
    buscarRef.current = buscar
  })

  useEffect(() => {
    let ativo = true
    buscarRef
      .current()
      .then((dados) => ativo && setResultado({ chave, dados, erro: null }))
      .catch((e) => ativo && setResultado({ chave, dados: null, erro: mensagemDeErro(e) }))
    return () => {
      ativo = false
    }
  }, [chave])

  const recarregar = useCallback(() => setVersao((v) => v + 1), [])
  const carregando = resultado?.chave !== chave
  return {
    carregando,
    dados: carregando ? null : (resultado?.dados ?? null),
    erro: carregando ? null : (resultado?.erro ?? null),
    recarregar,
  }
}
