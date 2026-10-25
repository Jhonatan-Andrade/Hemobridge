import { useState } from 'react'
import type { SituacaoExame } from '../../api/types'
import { PageTitle } from '../../components/layout/AppShell'
import { Button, ButtonLink, EmptyState, ErrorState, Loading, Pagination } from '../../components/ui'
import { formatarData } from '../../lib/formato'
import { useAsync } from '../../lib/useAsync'
import { examesMedicoService } from '../../services/medico'
import { MedicoLayout } from './MedicoLayout'
import { corSituacao, SITUACOES_EXAME } from './rotulos'

const TAMANHO = 10
const FILTROS: { valor: SituacaoExame | ''; rotulo: string }[] = [
  { valor: 'EM_ANALISE', rotulo: 'Para avaliar' },
  { valor: '', rotulo: 'Todos' },
]

// Figma: Web desktop / Médico / Exames / Lista (154:3753). UC16 passos 1–2.
export function ExamesPage() {
  const [situacao, setSituacao] = useState<SituacaoExame | ''>('EM_ANALISE')
  const [pagina, setPagina] = useState(1)
  const lista = useAsync(
    () => examesMedicoService.listar({ situacao: situacao || undefined, pagina, tamanhoPagina: TAMANHO }),
    [situacao, pagina],
  )

  return (
    <MedicoLayout>
      <PageTitle titulo="Exames dos atendimentos" descricao="Acompanhe os resultados enviados pelos pacientes que você atendeu." />

      <div className="grid gap-3 sm:grid-cols-2" role="group" aria-label="Filtrar exames">
        {FILTROS.map((f) => (
          <Button
            key={f.rotulo}
            block
            kind={situacao === f.valor ? 'primary' : 'secondary'}
            aria-pressed={situacao === f.valor}
            onClick={() => {
              setSituacao(f.valor)
              setPagina(1)
            }}
          >
            {f.rotulo}
          </Button>
        ))}
      </div>

      {lista.carregando ? (
        <Loading texto="Carregando exames…" />
      ) : lista.erro || !lista.dados ? (
        <ErrorState mensagens={lista.erro ?? ['Não foi possível carregar os exames.']} onRetry={lista.recarregar} />
      ) : !lista.dados.itens.length ? (
        <EmptyState title={situacao ? 'Nenhum exame para avaliar' : 'Nenhum exame solicitado'}>
          {situacao ? 'Quando um paciente enviar um resultado, ele aparece aqui.' : 'Os exames pedidos nos atendimentos aparecem aqui.'}
        </EmptyState>
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {lista.dados.itens.map((s) => (
              <li key={s.id} className="flex flex-col gap-2 rounded-card border border-line bg-surface p-4">
                <p className={`text-small font-semibold uppercase ${corSituacao(s.situacao)}`}>{SITUACOES_EXAME[s.situacao]}</p>
                <h2 className="text-section font-semibold text-ink">{s.paciente.nome}</h2>
                <p className="text-body text-ink">{s.exames.join(' · ')}</p>
                <p className="text-body text-muted">
                  {s.ultimoEnvioEm ? `Último envio em ${formatarData(s.ultimoEnvioEm)}` : 'O paciente ainda não enviou o resultado.'}
                </p>
                <ButtonLink to={`/medico/exames/${s.id}`} block kind={s.situacao === 'EM_ANALISE' ? 'primary' : 'secondary'} className="mt-1">
                  {s.situacao === 'EM_ANALISE' ? 'Avaliar resultado' : 'Consultar exame'}
                  <span className="sr-only"> de {s.paciente.nome}</span>
                </ButtonLink>
              </li>
            ))}
          </ul>
          <Pagination pagina={pagina} total={lista.dados.total} tamanhoPagina={TAMANHO} onChange={setPagina} />
        </>
      )}
    </MedicoLayout>
  )
}
