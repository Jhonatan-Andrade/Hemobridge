import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { Atendimento, ResultadoDoacao } from '../../api/types'
import { DataTable } from '../../components/DataTable'
import { PageTitle } from '../../components/layout/AppShell'
import { EmptyState, ErrorState, Loading, Pagination, Panel, TextField } from '../../components/ui'
import { dataLocalIso, formatarDiaCurto, RESULTADOS_DOACAO, somarDias } from '../../lib/formato'
import { useAsync } from '../../lib/useAsync'
import { atendimentosService } from '../../services/equipe'
import { useAuth } from '../auth/authState'
import { LayoutEquipe } from './LayoutEquipe'

const TAMANHO = 20

const resultado = (a: Atendimento): ResultadoDoacao => (!a.compareceu ? 'AUSENTE' : a.doou ? 'DOOU' : 'NAO_DOOU')

// Histórico de atendimentos do próprio hemocentro, para o médico e o Admin do hemocentro.
export function AtendimentosPage() {
  const { usuario } = useAuth()
  const base = usuario?.papel === 'MEDICO' ? '/medico' : '/hemocentro'
  const [ate, setAte] = useState(dataLocalIso())
  const [de, setDe] = useState(somarDias(dataLocalIso(), -90))
  const [pagina, setPagina] = useState(1)
  const lista = useAsync(() => atendimentosService.listar({ de, ate, pagina, tamanhoPagina: TAMANHO }), [de, ate, pagina])
  const r = lista.dados?.resumo

  function periodo(novoDe: string, novoAte: string) {
    if (!novoDe || !novoAte) return
    setDe(novoDe)
    setAte(novoAte)
    setPagina(1)
  }

  return (
    <LayoutEquipe>
      <PageTitle
        titulo="Atendimentos"
        descricao={`Doações e ausências registradas no ${usuario?.hemocentro?.nome ?? 'hemocentro'}, pela data do horário agendado.`}
      />
      <Panel>
        <div className="flex flex-col gap-3 sm:flex-row">
          <TextField label="De" type="date" value={de} max={ate} onChange={(e) => periodo(e.target.value, ate)} containerClassName="sm:w-56" />
          <TextField label="Até" type="date" value={ate} min={de} onChange={(e) => periodo(de, e.target.value)} containerClassName="sm:w-56" />
        </div>
        {r && (
          <p className="text-body text-muted">
            {r.total} {r.total === 1 ? 'atendimento' : 'atendimentos'} · {r.doaram} doaram · {r.naoDoaram} não doaram · {r.ausentes}{' '}
            não compareceram
          </p>
        )}
        {lista.carregando ? (
          <Loading texto="Carregando atendimentos…" />
        ) : lista.erro || !lista.dados ? (
          <ErrorState mensagens={lista.erro ?? ['Não foi possível carregar os atendimentos.']} onRetry={lista.recarregar} />
        ) : !lista.dados.itens.length ? (
          <EmptyState title="Nenhum atendimento no período">Os registros feitos na agenda do dia aparecem aqui.</EmptyState>
        ) : (
          <>
            <DataTable<Atendimento>
              legenda="Atendimentos do hemocentro"
              itens={lista.dados.itens}
              chave={(a) => a.id}
              colunas={[
                {
                  titulo: 'Paciente',
                  largura: 'w-1/4',
                  celula: (a) => (
                    <Link to={`${base}/pacientes/${a.paciente.id}`} className="text-brand hover:underline">
                      {a.paciente.nome}
                    </Link>
                  ),
                },
                { titulo: 'Data', celula: (a) => `${formatarDiaCurto(a.data)} · ${a.horaInicio}–${a.horaFim}` },
                { titulo: 'Resultado', celula: (a) => RESULTADOS_DOACAO[resultado(a)] },
                { titulo: 'Tipo', celula: (a) => a.tipoSanguineo ?? '—' },
                { titulo: 'Motivo / observações', celula: (a) => [a.motivoNaoDoacao, a.observacoes].filter(Boolean).join(' · ') || '—' },
                { titulo: 'Registrado por', celula: (a) => a.medico },
              ]}
            />
            <Pagination pagina={pagina} total={lista.dados.total} tamanhoPagina={TAMANHO} onChange={setPagina} />
          </>
        )}
      </Panel>
    </LayoutEquipe>
  )
}
