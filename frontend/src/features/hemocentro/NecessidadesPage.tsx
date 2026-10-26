import { useState, type FormEvent } from 'react'
import { mensagemDeErro } from '../../api/client'
import type { NecessidadesHemocentro, NivelNecessidade, TipoSanguineo } from '../../api/types'
import { NeedsTable } from '../../components/NeedsTable'
import { PageTitle } from '../../components/layout/AppShell'
import { Button, ErrorState, Loading, Message, Panel, SelectField } from '../../components/ui'
import { formatarDataHora, NIVEIS } from '../../lib/formato'
import { useAsync } from '../../lib/useAsync'
import { necessidadesService } from '../../services/equipe'
import { hemocentrosService } from '../../services/hemocentros'
import { useAuth } from '../auth/authState'
import { HemocentroLayout } from './HemocentroLayout'

const opcoesNivel = (['URGENTE', 'NECESSARIO', 'ESTAVEL'] as const).map((n) => ({ value: n, label: NIVEIS[n] }))

// RF17 – nível de necessidade de cada tipo sanguíneo, exibido na página Doar.
// Figma: Representante de Hospital / Necessidades (101:3114).
export function NecessidadesPage() {
  const { usuario } = useAuth()
  const hemocentroId = usuario?.hemocentro?.id ?? ''
  const lista = useAsync(() => hemocentrosService.necessidades(hemocentroId), [hemocentroId])
  const [atualizada, setAtualizada] = useState<NecessidadesHemocentro | null>(null)
  // Fica na página: o formulário é recriado a cada atualização salva.
  const [aviso, setAviso] = useState('')
  const dados = atualizada ?? lista.dados

  return (
    <HemocentroLayout>
      <PageTitle titulo="Necessidades" descricao="Informe de quais tipos sanguíneos o hemocentro precisa agora. Os pacientes veem esses níveis na página Doar." />
      {aviso && (
        <Message tone="success">
          <p>{aviso}</p>
        </Message>
      )}
      {lista.carregando && !atualizada ? (
        <Loading texto="Carregando necessidades…" />
      ) : !dados ? (
        <ErrorState mensagens={lista.erro ?? ['Não foi possível carregar as necessidades.']} onRetry={lista.recarregar} />
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-3">
          <Panel className="lg:col-span-2">
            <div className="flex flex-col gap-1">
              <h2 className="text-section font-semibold text-ink">Nível atual por tipo sanguíneo</h2>
              <p className="text-small text-muted">Última atualização: {formatarDataHora(dados.ultimaAtualizacao)}</p>
            </div>
            <NeedsTable necessidades={dados.necessidades} legenda="Nível atual por tipo sanguíneo" />
          </Panel>
          <EdicaoNiveis key={dados.ultimaAtualizacao} hemocentroId={hemocentroId} dados={dados} onSalvo={(d) => {
              setAtualizada(d)
              setAviso(d.mensagem)
            }}
          />
        </div>
      )}
    </HemocentroLayout>
  )
}

function EdicaoNiveis({
  hemocentroId,
  dados,
  onSalvo,
}: {
  hemocentroId: string
  dados: NecessidadesHemocentro
  onSalvo: (d: NecessidadesHemocentro & { mensagem: string }) => void
}) {
  const [niveis, setNiveis] = useState<Record<string, '' | NivelNecessidade>>(() =>
    Object.fromEntries(dados.necessidades.map((n) => [n.tipo, n.nivel ?? ''])),
  )
  const [falha, setFalha] = useState<string[]>([])
  const [enviando, setEnviando] = useState(false)

  const alterados = dados.necessidades.filter((n) => niveis[n.tipo] && niveis[n.tipo] !== n.nivel)

  async function aoEnviar(e: FormEvent) {
    e.preventDefault()
    if (!alterados.length) return setFalha(['Não há alterações a salvar.'])
    setEnviando(true)
    setFalha([])
    try {
      const r = await necessidadesService.atualizar(
        hemocentroId,
        alterados.map((n) => ({ tipo: n.tipo as TipoSanguineo, nivel: niveis[n.tipo] as NivelNecessidade })),
      )
      onSalvo(r)
    } catch (err) {
      setFalha(mensagemDeErro(err))
      setEnviando(false)
    }
  }

  return (
    <Panel>
      <h2 className="text-section font-semibold text-ink">Atualizar níveis</h2>
      {falha.length > 0 && (
        <Message tone="error">
          {falha.map((m) => (
            <p key={m}>! {m}</p>
          ))}
        </Message>
      )}
      <form noValidate onSubmit={aoEnviar} className="flex flex-col gap-1">
        <div className="grid grid-cols-2 gap-x-2">
          {dados.necessidades.map((n) => (
            <SelectField
              key={n.tipo}
              label={n.tipo}
              placeholder={n.nivel ? undefined : 'Não informado'}
              options={opcoesNivel}
              value={niveis[n.tipo]}
              onChange={(e) => setNiveis({ ...niveis, [n.tipo]: e.target.value as NivelNecessidade })}
              disabled={enviando}
            />
          ))}
        </div>
        <Button type="submit" loading={enviando}>
          Salvar {alterados.length ? `(${alterados.length})` : ''}
        </Button>
      </form>
    </Panel>
  )
}
