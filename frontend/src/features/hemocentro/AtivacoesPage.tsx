import { useState } from 'react'
import { Link } from 'react-router-dom'
import { mensagemDeErro } from '../../api/client'
import type { PacientePendente } from '../../api/types'
import { DataTable } from '../../components/DataTable'
import { PageTitle } from '../../components/layout/AppShell'
import { Button, EmptyState, ErrorState, Loading, Message, Pagination, Panel } from '../../components/ui'
import { formatarData } from '../../lib/formato'
import { useAsync } from '../../lib/useAsync'
import { ativacaoService } from '../../services/equipe'
import { HemocentroLayout } from './HemocentroLayout'

const TAMANHO = 10

// RF13 – pacientes com doação registrada (e tipada) neste hemocentro que aguardam a ativação da conta.
export function AtivacoesPage() {
  const [pagina, setPagina] = useState(1)
  const [versao, setVersao] = useState(0)
  const [aviso, setAviso] = useState<{ tom: 'success' | 'error'; texto: string[] } | null>(null)
  const lista = useAsync(() => ativacaoService.pendentes({ pagina, tamanhoPagina: TAMANHO }), [pagina, versao])

  return (
    <HemocentroLayout>
      <PageTitle
        titulo="Ativação de contas"
        descricao="Ao ativar, a conta passa a ATIVA e o tipo sanguíneo da doação mais recente registrada aqui aparece no painel do paciente."
      />
      {aviso && (
        <Message tone={aviso.tom}>
          {aviso.texto.map((m) => (
            <p key={m}>{m}</p>
          ))}
        </Message>
      )}
      <Panel>
        {lista.carregando ? (
          <Loading texto="Carregando pacientes…" />
        ) : lista.erro || !lista.dados ? (
          <ErrorState mensagens={lista.erro ?? ['Não foi possível carregar os pacientes.']} onRetry={lista.recarregar} />
        ) : !lista.dados.itens.length ? (
          <EmptyState title="Nenhuma conta aguardando ativação">Aparecem aqui os pacientes pendentes com doação e tipo sanguíneo registrados neste hemocentro.</EmptyState>
        ) : (
          <>
            <DataTable<PacientePendente>
              legenda="Pacientes aguardando ativação"
              itens={lista.dados.itens}
              chave={(p) => p.id}
              colunas={[
                {
                  titulo: 'Paciente',
                  largura: 'w-2/5',
                  celula: (p) => (
                    <span className="flex flex-col">
                      <Link to={`/hemocentro/pacientes/${p.id}`} className="text-brand hover:underline">
                        {p.nome}
                      </Link>
                      <span className="font-normal text-muted">
                        {p.email} · CPF {p.cpf ?? '—'}
                      </span>
                    </span>
                  ),
                },
                { titulo: 'Doação', celula: (p) => `${formatarData(p.doacao.registradoEm)} · ${p.doacao.doou ? 'doou' : 'não doou'}` },
                { titulo: 'Tipo', celula: (p) => p.doacao.tipoSanguineo },
                {
                  titulo: 'Ação',
                  celula: (p) => (
                    <BotaoAtivar
                      paciente={p}
                      onAtivado={(m) => {
                        setAviso({ tom: 'success', texto: [m] })
                        setVersao((v) => v + 1)
                      }}
                      onFalha={(m) => setAviso({ tom: 'error', texto: m })}
                    />
                  ),
                },
              ]}
            />
            <Pagination pagina={pagina} total={lista.dados.total} tamanhoPagina={TAMANHO} onChange={setPagina} />
          </>
        )}
      </Panel>
    </HemocentroLayout>
  )
}

function BotaoAtivar({ paciente, onAtivado, onFalha }: { paciente: PacientePendente; onAtivado: (m: string) => void; onFalha: (m: string[]) => void }) {
  const [enviando, setEnviando] = useState(false)
  async function ativar() {
    setEnviando(true)
    try {
      await ativacaoService.ativar(paciente.id)
      onAtivado(`Conta de ${paciente.nome} ativada com o tipo ${paciente.doacao.tipoSanguineo}.`)
    } catch (err) {
      onFalha(mensagemDeErro(err))
      setEnviando(false)
    }
  }
  return (
    <Button loading={enviando} onClick={ativar}>
      Ativar<span className="sr-only"> a conta de {paciente.nome}</span>
    </Button>
  )
}
