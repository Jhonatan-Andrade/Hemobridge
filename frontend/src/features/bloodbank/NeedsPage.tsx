import { useState, type FormEvent } from 'react'
import { mensagemDeErro } from '../../api/client'
import type { AtualizacaoNecessidades, NecessidadesHospital, NivelInformavel, TipoSanguineo } from '../../api/types'
import { NeedsTable } from '../../components/NeedsTable'
import { PageTitle } from '../../components/layout/AppShell'
import { Button, ErrorState, Loading, Message, Panel, SelectField } from '../../components/ui'
import { formatarDataHora, NIVEIS, TIPOS_SANGUINEOS } from '../../lib/formato'
import { useAsync } from '../../lib/useAsync'
import type { Erros } from '../../lib/validacao'
import { necessidadesService } from '../../services/necessidades'
import { BloodBankLayout } from './BloodBankLayout'

type Campos = { tipo: '' | TipoSanguineo; nivel: '' | NivelInformavel }

const opcoesTipo = TIPOS_SANGUINEOS.map((t) => ({ value: t, label: t }))
const opcoesNivel = (['CRITICO', 'BAIXO', 'ESTAVEL', 'ADEQUADO'] as const).map((n) => ({ value: n, label: NIVEIS[n] }))

// Figma: Web desktop / Representante de Hospital / Necessidades (101:3114).
export function NeedsPage() {
  const lista = useAsync(() => necessidadesService.listar(), [])
  const [atualizada, setAtualizada] = useState<NecessidadesHospital | null>(null)
  const dados = atualizada ?? lista.dados

  const [campos, setCampos] = useState<Campos>({ tipo: '', nivel: '' })
  const [erros, setErros] = useState<Erros<Campos>>({})
  const [enviando, setEnviando] = useState(false)
  const [falha, setFalha] = useState<string[]>([])
  const [sucesso, setSucesso] = useState<AtualizacaoNecessidades | null>(null)

  const [tipoHistorico, setTipoHistorico] = useState<TipoSanguineo | undefined>()
  const [versaoHistorico, setVersaoHistorico] = useState(0)
  const historico = useAsync(() => necessidadesService.historico({ tipo: tipoHistorico, tamanhoPagina: 20 }), [tipoHistorico, versaoHistorico])

  async function aoEnviar(e: FormEvent) {
    e.preventDefault()
    const atual = dados?.necessidades.find((n) => n.tipo === campos.tipo)?.nivel
    const novos: Erros<Campos> = {
      tipo: !campos.tipo ? 'Selecione o tipo sanguíneo.' : undefined,
      nivel: !campos.nivel ? 'Selecione o novo nível.' : campos.nivel === atual ? `O nível de ${campos.tipo} já é ${NIVEIS[atual]}.` : undefined,
    }
    setErros(novos)
    if (novos.tipo || novos.nivel) return

    setEnviando(true)
    setFalha([])
    setSucesso(null)
    try {
      const resposta = await necessidadesService.atualizar([{ tipo: campos.tipo as TipoSanguineo, nivel: campos.nivel as NivelInformavel }])
      setAtualizada(resposta)
      setSucesso(resposta)
      setCampos({ tipo: '', nivel: '' })
      setVersaoHistorico((v) => v + 1)
    } catch (err) {
      setFalha(mensagemDeErro(err))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <BloodBankLayout>
      <PageTitle
        titulo="Necessidades"
        descricao="Consulte os oito tipos sanguíneos, o nível atual, a atualização mais recente e o histórico."
      />

      {lista.carregando && !atualizada ? (
        <Loading texto="Carregando necessidades…" />
      ) : lista.erro && !atualizada ? (
        <ErrorState mensagens={lista.erro} onRetry={lista.recarregar} />
      ) : dados ? (
        <div className="grid items-start gap-6 lg:grid-cols-3">
          <Panel className="lg:col-span-2">
            <div className="flex flex-col gap-1">
              <h2 className="text-section font-semibold text-ink">Nível atual por tipo sanguíneo</h2>
              <p className="text-small text-muted">
                {dados.hospital.nome} · última atualização: {formatarDataHora(dados.ultimaAtualizacao)}
              </p>
            </div>
            <NeedsTable
              necessidades={dados.necessidades}
              legenda="Nível atual por tipo sanguíneo"
              onVerHistorico={(tipo) => {
                setTipoHistorico(tipo as TipoSanguineo)
                document.getElementById('historico')?.focus()
              }}
            />
            <p className="text-small text-muted">Cada nível corresponde à última atualização informada pela instituição.</p>
          </Panel>

          <div className="flex flex-col gap-6">
            <Panel>
              <h2 className="text-section font-semibold text-ink">Atualizar necessidade</h2>
              <p className="text-label text-ink">Selecione o tipo sanguíneo e o novo nível.</p>
              {sucesso && (
                <Message tone="success">
                  <p>{sucesso.mensagem}</p>
                  {sucesso.passaramACritico.length > 0 && <p>Em nível crítico agora: {sucesso.passaramACritico.join(', ')}.</p>}
                </Message>
              )}
              {falha.length > 0 && (
                <Message tone="error">
                  {falha.map((m) => (
                    <p key={m}>! {m}</p>
                  ))}
                </Message>
              )}
              <form noValidate onSubmit={aoEnviar} className="flex flex-col gap-3">
                <SelectField
                  label="Tipo sanguíneo"
                  placeholder="Selecione uma opção"
                  hint="Confira os dados antes de salvar."
                  options={opcoesTipo}
                  value={campos.tipo}
                  onChange={(e) => setCampos({ ...campos, tipo: e.target.value as Campos['tipo'] })}
                  error={erros.tipo}
                  disabled={enviando}
                />
                <SelectField
                  label="Novo nível"
                  placeholder="Selecione uma opção"
                  hint={
                    campos.tipo && dados.necessidades.find((n) => n.tipo === campos.tipo)
                      ? `Nível atual: ${NIVEIS[dados.necessidades.find((n) => n.tipo === campos.tipo)!.nivel]}.`
                      : 'Confira os dados antes de salvar.'
                  }
                  options={opcoesNivel}
                  value={campos.nivel}
                  onChange={(e) => setCampos({ ...campos, nivel: e.target.value as Campos['nivel'] })}
                  error={erros.nivel}
                  disabled={enviando}
                />
                <Button type="submit" loading={enviando}>
                  Registrar atualização
                </Button>
              </form>
            </Panel>

            <Panel>
              <div className="flex flex-col gap-1">
                <h2 id="historico" tabIndex={-1} className="text-section font-semibold text-ink outline-none">
                  Histórico de atualizações{tipoHistorico && ` · ${tipoHistorico}`}
                </h2>
                <p className="text-small text-muted">nível anterior → novo nível</p>
              </div>
              {tipoHistorico && (
                <button type="button" onClick={() => setTipoHistorico(undefined)} className="self-start rounded text-small font-medium text-brand hover:underline">
                  Ver todos os tipos
                </button>
              )}
              {historico.carregando ? (
                <Loading />
              ) : historico.erro ? (
                <ErrorState mensagens={historico.erro} onRetry={historico.recarregar} />
              ) : !historico.dados?.itens.length ? (
                <p className="text-small text-muted">O histórico aparecerá quando houver registros.</p>
              ) : (
                <ol className="flex flex-col gap-3">
                  {historico.dados.itens.map((h) => (
                    <li key={`${h.tipo}-${h.alteradoEm}`} className="flex flex-col gap-0.5 border-b border-line pb-3 last:border-0">
                      <p className="text-body font-semibold text-ink">
                        {h.tipo} · {NIVEIS[h.de]} → {NIVEIS[h.para]}
                      </p>
                      <p className="text-small text-muted">
                        {formatarDataHora(h.alteradoEm)} · {h.alteradoPor}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </Panel>
          </div>
        </div>
      ) : null}
    </BloodBankLayout>
  )
}
