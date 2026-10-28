import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { mensagemDeErro } from '../../api/client'
import type { LancamentoExames, ResultadoSorologia } from '../../api/types'
import { PageTitle } from '../../components/layout/AppShell'
import { Button, ErrorState, Loading, Message, Panel, SelectField, TextAreaField } from '../../components/ui'
import {
  EXAMES_SOROLOGICOS,
  formatarAfericoes,
  formatarAptidao,
  formatarDataHora,
  formatarDiaLongo,
  RESULTADOS_DOACAO,
  SITUACOES_EXAMES,
  SOROLOGIAS,
} from '../../lib/formato'
import { useAsync } from '../../lib/useAsync'
import { medicoService } from '../../services/equipe'
import { MedicoLayout } from './MedicoLayout'

const opcoesSorologia = Object.entries(SOROLOGIAS).map(([value, label]) => ({ value, label }))
const opcoesAnticorpos = [
  { value: 'NEGATIVA', label: 'Negativa' },
  { value: 'POSITIVA', label: 'Positiva' },
]

const simNao = (v: boolean) => (v ? 'Sim' : 'Não')

/**
 * Registro completo de um atendimento do próprio hemocentro: triagem clínica (confidencial),
 * aferições, coleta e exames da amostra. Só o médico abre; cada leitura é auditada.
 */
export function DoacaoPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [versao, setVersao] = useState(0)
  const [aviso, setAviso] = useState('')
  const doacao = useAsync(() => medicoService.doacao(id), [id, versao])
  const d = doacao.dados

  return (
    <MedicoLayout>
      {doacao.carregando ? (
        <Loading texto="Carregando o atendimento…" />
      ) : doacao.erro || !d ? (
        <ErrorState mensagens={doacao.erro ?? ['Não foi possível carregar o atendimento.']} onRetry={doacao.recarregar} />
      ) : (
        <>
          <PageTitle
            sobretitulo="Atendimento"
            titulo={d.paciente.nome}
            descricao={`${formatarDiaLongo(d.data)} · ${d.horaInicio}–${d.horaFim} · registrado por ${d.medico}`}
          />
          <Message tone="info">
            <p>Dados de saúde sigilosos. A triagem e os exames ficam só neste hemocentro, e este acesso fica registrado na auditoria (LGPD).</p>
          </Message>
          {aviso && (
            <Message tone="success">
              <p>{aviso}</p>
            </Message>
          )}

          <div className="grid items-start gap-5 lg:grid-cols-2">
            <Panel>
              <h2 className="text-section font-semibold text-ink">Atendimento</h2>
              <Dados
                linhas={[
                  ['Resultado', RESULTADOS_DOACAO[!d.compareceu ? 'AUSENTE' : d.doou ? 'DOOU' : 'NAO_DOOU']],
                  ['Aptidão', formatarAptidao(d.aptidao, d.aptoAPartirDe)],
                  ['Tipo sanguíneo', d.tipoSanguineo],
                  ['Aferições', formatarAfericoes(d.afericoes)],
                  ['Volume', d.volumeMl !== null ? `${d.volumeMl} mL` : null],
                  ['Bolsa', d.numeroBolsa],
                  ['Reações', d.reacoes],
                  ['Motivo de não doar', d.motivoNaoDoacao],
                  ['Observações', d.observacoes],
                ]}
              />
              <Link to={`/medico/pacientes/${d.paciente.id}`} className="self-start text-small font-semibold text-brand hover:underline">
                Ver histórico de doações do paciente
              </Link>
            </Panel>

            {d.triagem && (
              <Panel>
                <h2 className="text-section font-semibold text-ink">Triagem clínica</h2>
                <Dados
                  linhas={[
                    ['Transfusão anterior', simNao(d.triagem.transfusaoAnterior)],
                    ['Tatuagem ou piercing recente', simNao(d.triagem.tatuagemOuPiercingRecente)],
                    ['Uso de drogas', simNao(d.triagem.usoDeDrogas)],
                    ['Comportamento sexual de risco', simNao(d.triagem.comportamentoSexualDeRisco)],
                    ['Doenças', d.triagem.doencas ?? '—'],
                    ['Cirurgias', d.triagem.cirurgias ?? '—'],
                    ['Alergias', d.triagem.alergias ?? '—'],
                    ['Gestações', d.triagem.gestacoes ?? '—'],
                    ['Medicamentos', d.triagem.medicamentos ?? '—'],
                    ['Vacinas recentes', d.triagem.vacinasRecentes ?? '—'],
                    ['Viagem a área de risco', d.triagem.viagemAreaDeRisco ?? '—'],
                    ['Observações', d.triagem.observacoes],
                  ]}
                />
              </Panel>
            )}
          </div>

          {d.doou && (
            <Panel>
              <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                <h2 className="text-section font-semibold text-ink">Exames da amostra</h2>
                {d.situacaoExames && (
                  <p className={`text-small font-semibold uppercase ${d.situacaoExames === 'ALTERADO' ? 'text-error' : d.situacaoExames === 'NORMAL' ? 'text-success' : 'text-muted'}`}>
                    {SITUACOES_EXAMES[d.situacaoExames]}
                  </p>
                )}
              </div>
              {d.exames ? (
                <>
                  <Dados
                    linhas={[
                      ['Tipagem (ABO e Rh)', d.tipoSanguineo ?? 'Não registrada'],
                      ['Pesquisa de anticorpos', d.exames.pesquisaAnticorpos === 'POSITIVA' ? 'Positiva' : 'Negativa'],
                      ...EXAMES_SOROLOGICOS.map(([campo, rotulo]): [string, string] => [rotulo, SOROLOGIAS[d.exames![campo]]]),
                      ['Malária', d.exames.malaria ? SOROLOGIAS[d.exames.malaria] : 'Não realizado'],
                      ['Observações', d.exames.observacoes],
                      ['Lançados', `${formatarDataHora(d.exames.registradoEm)} por ${d.exames.registradoPor}`],
                    ]}
                  />
                  {d.situacaoExames === 'ALTERADO' && (
                    <p className="text-small text-muted">
                      O painel do paciente mostra apenas que o hemocentro vai entrar em contato de forma reservada. Faça o contato para orientar e encaminhar; se for doença de
                      notificação compulsória, comunique a autoridade de saúde.
                    </p>
                  )}
                </>
              ) : (
                <LancarExames
                  doacaoId={d.id}
                  onLancado={(m) => {
                    setAviso(m)
                    setVersao((v) => v + 1)
                  }}
                />
              )}
            </Panel>
          )}
        </>
      )}
      <Button kind="secondary" onClick={() => navigate(-1)}>
        Voltar
      </Button>
    </MedicoLayout>
  )
}

function Dados({ linhas }: { linhas: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-small">
      {linhas
        .filter(([, valor]) => valor !== null && valor !== '')
        .map(([rotulo, valor]) => (
          <div key={rotulo} className="contents">
            <dt className="text-muted">{rotulo}</dt>
            <dd className="break-words text-ink">{valor}</dd>
          </div>
        ))}
    </dl>
  )
}

type Campos = Record<(typeof EXAMES_SOROLOGICOS)[number][0] | 'pesquisaAnticorpos' | 'malaria', string>

/** Lançamento único dos exames da amostra; não é editado depois. */
function LancarExames({ doacaoId, onLancado }: { doacaoId: string; onLancado: (m: string) => void }) {
  const [c, setC] = useState<Campos>({ pesquisaAnticorpos: '', hiv: '', hepatiteB: '', hepatiteC: '', sifilis: '', chagas: '', htlv: '', malaria: '' })
  const [observacoes, setObservacoes] = useState('')
  const [erro, setErro] = useState(false)
  const [falha, setFalha] = useState<string[]>([])
  const [enviando, setEnviando] = useState(false)
  const faltando = (campo: keyof Campos) => (erro && !c[campo] ? 'Informe o resultado.' : undefined)

  async function aoEnviar(e: FormEvent) {
    e.preventDefault()
    const obrigatorios = ['pesquisaAnticorpos', ...EXAMES_SOROLOGICOS.map(([campo]) => campo)] as const
    if (obrigatorios.some((campo) => !c[campo])) {
      setErro(true)
      return
    }
    setEnviando(true)
    setFalha([])
    try {
      const dados: LancamentoExames = {
        pesquisaAnticorpos: c.pesquisaAnticorpos as LancamentoExames['pesquisaAnticorpos'],
        hiv: c.hiv as ResultadoSorologia,
        hepatiteB: c.hepatiteB as ResultadoSorologia,
        hepatiteC: c.hepatiteC as ResultadoSorologia,
        sifilis: c.sifilis as ResultadoSorologia,
        chagas: c.chagas as ResultadoSorologia,
        htlv: c.htlv as ResultadoSorologia,
        malaria: (c.malaria || undefined) as ResultadoSorologia | undefined,
        observacoes: observacoes.trim() || undefined,
      }
      const r = await medicoService.registrarExames(doacaoId, dados)
      onLancado(r.mensagem)
    } catch (err) {
      setFalha(mensagemDeErro(err))
      setEnviando(false)
    }
  }

  return (
    <form noValidate onSubmit={aoEnviar} className="flex flex-col gap-3">
      <p className="text-body text-muted">Exames pendentes. Lance os resultados quando o laboratório liberar; não é possível alterá-los depois.</p>
      {falha.length > 0 && (
        <Message tone="error">
          {falha.map((m) => (
            <p key={m}>! {m}</p>
          ))}
        </Message>
      )}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <SelectField
          label="Pesquisa de anticorpos"
          placeholder="Selecione"
          options={opcoesAnticorpos}
          value={c.pesquisaAnticorpos}
          onChange={(e) => setC({ ...c, pesquisaAnticorpos: e.target.value })}
          error={faltando('pesquisaAnticorpos')}
          disabled={enviando}
        />
        {EXAMES_SOROLOGICOS.map(([campo, rotulo]) => (
          <SelectField
            key={campo}
            label={rotulo}
            placeholder="Selecione"
            options={opcoesSorologia}
            value={c[campo]}
            onChange={(e) => setC({ ...c, [campo]: e.target.value })}
            error={faltando(campo)}
            disabled={enviando}
          />
        ))}
        <SelectField
          label="Malária"
          hint="Só em regiões endêmicas"
          placeholder="Não realizado"
          options={opcoesSorologia}
          value={c.malaria}
          onChange={(e) => setC({ ...c, malaria: e.target.value })}
          disabled={enviando}
        />
      </div>
      <TextAreaField label="Observações (opcional)" rows={2} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} disabled={enviando} maxLength={2000} />
      <Button type="submit" loading={enviando} className="self-start">
        Lançar exames
      </Button>
    </form>
  )
}
