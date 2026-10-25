import { useState, type FormEvent } from 'react'
import { mensagemDeErro } from '../../api/client'
import type { ConsultaMedico } from '../../api/types'
import { Button, Message, TextAreaField } from '../../components/ui'
import { temErros, type Erros } from '../../lib/validacao'
import { atendimentoService } from '../../services/medico'

type Desfecho = 'exames' | 'inapto' | 'ausente' | 'cancelar'
type Campos = { desfecho: Desfecho | ''; observacoes: string; exames: string; orientacoes: string; motivo: string }

const OPCOES: { valor: Desfecho; rotulo: string; descricao: string; aposInicio: boolean }[] = [
  { valor: 'exames', rotulo: 'Consulta realizada · solicitar exames', descricao: 'O paciente passa a aguardar o envio dos exames.', aposInicio: true },
  { valor: 'inapto', rotulo: 'Consulta realizada · paciente inapto', descricao: 'O cadastro é reprovado com o motivo informado.', aposInicio: true },
  { valor: 'ausente', rotulo: 'Paciente não compareceu', descricao: 'O paciente volta a poder agendar.', aposInicio: true },
  { valor: 'cancelar', rotulo: 'Cancelar consulta', descricao: 'Só antes do horário. O horário sai da agenda.', aposInicio: false },
]

const listaExames = (texto: string) =>
  texto
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

function validar(c: Campos): Erros<Campos> {
  const exames = listaExames(c.exames)
  return {
    desfecho: !c.desfecho ? 'Escolha o desfecho da consulta.' : undefined,
    exames:
      c.desfecho !== 'exames'
        ? undefined
        : !exames.length
          ? 'Informe ao menos um exame (FE01).'
          : exames.some((e) => e.length < 2 || e.length > 150)
            ? 'Cada exame deve ter entre 2 e 150 caracteres.'
            : exames.length > 20
              ? 'Informe no máximo 20 exames.'
              : undefined,
    motivo:
      (c.desfecho === 'inapto' || c.desfecho === 'cancelar') && c.motivo.trim().length < 5
        ? 'Informe o motivo (mínimo de 5 caracteres).'
        : undefined,
  }
}

type Props = { consulta: ConsultaMedico; iniciada: boolean; onRegistrado: (mensagem: string) => void }

// Figma: Web desktop / Médico / Atendimento (154:3704) — Desfecho, Solicitação de exames e Próximas ações. UC14/UC15.
export function RegistroAtendimento({ consulta, iniciada, onRegistrado }: Props) {
  const [c, setC] = useState<Campos>({ desfecho: '', observacoes: '', exames: '', orientacoes: '', motivo: '' })
  const [erros, setErros] = useState<Erros<Campos>>({})
  const [falha, setFalha] = useState<string[]>([])
  const [enviando, setEnviando] = useState(false)
  const campo = (nome: keyof Campos, valor: string) => setC({ ...c, [nome]: valor })

  async function aoEnviar(e: FormEvent) {
    e.preventDefault()
    const novos = validar(c)
    setErros(novos)
    if (temErros(novos)) return
    setEnviando(true)
    setFalha([])
    const observacoes = c.observacoes.trim() || undefined
    try {
      const r =
        c.desfecho === 'exames'
          ? await atendimentoService.registrarRealizada(consulta.id, {
              observacoes,
              exames: listaExames(c.exames),
              orientacoes: c.orientacoes.trim() || undefined,
            })
          : c.desfecho === 'inapto'
            ? await atendimentoService.registrarRealizada(consulta.id, { observacoes, motivoReprovacao: c.motivo.trim() })
            : c.desfecho === 'ausente'
              ? await atendimentoService.registrarNaoComparecimento(consulta.id)
              : await atendimentoService.cancelar(consulta.id, c.motivo.trim())
      onRegistrado(r.mensagem)
    } catch (err) {
      setFalha(mensagemDeErro(err))
    } finally {
      setEnviando(false)
    }
  }

  const realizada = c.desfecho === 'exames' || c.desfecho === 'inapto'
  const destrutivo = c.desfecho === 'cancelar' || c.desfecho === 'inapto'

  return (
    <form noValidate onSubmit={aoEnviar} className="flex flex-col gap-4">
      {falha.length > 0 && (
        <Message tone="error">
          {falha.map((m) => (
            <p key={m}>! {m}</p>
          ))}
        </Message>
      )}

      <fieldset className="flex flex-col gap-2" aria-describedby={erros.desfecho ? 'desfecho-msg' : undefined}>
        <legend className="mb-2 text-section font-semibold text-ink">Desfecho</legend>
        {!iniciada && (
          <p className="text-small text-muted">A consulta ainda não começou: antes do horário, só é possível cancelá-la (FE01).</p>
        )}
        {OPCOES.map((o) => {
          const bloqueada = o.aposInicio ? !iniciada : iniciada
          return (
            <label
              key={o.valor}
              className={`flex gap-3 rounded-control border p-3 ${c.desfecho === o.valor ? 'border-2 border-brand' : 'border-input'} ${bloqueada ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-background'}`}
            >
              <input
                type="radio"
                name="desfecho"
                value={o.valor}
                checked={c.desfecho === o.valor}
                onChange={() => campo('desfecho', o.valor)}
                disabled={bloqueada || enviando}
                className="mt-1 size-4 shrink-0 accent-brand"
              />
              <span className="flex flex-col">
                <span className="text-body font-semibold text-ink">{o.rotulo}</span>
                <span className="text-small text-muted">{o.descricao}</span>
              </span>
            </label>
          )
        })}
        {erros.desfecho && (
          <p id="desfecho-msg" className="text-caption text-error">
            {erros.desfecho}
          </p>
        )}
      </fieldset>

      {realizada && (
        <TextAreaField
          label="Observações do atendimento (opcional)"
          hint="Ficam no registro clínico, visível só para os médicos do atendimento."
          value={c.observacoes}
          onChange={(e) => campo('observacoes', e.target.value)}
          maxLength={5000}
          disabled={enviando}
        />
      )}

      {c.desfecho === 'exames' && (
        <section className="flex flex-col gap-2" aria-labelledby="titulo-solicitacao">
          <h3 id="titulo-solicitacao" className="text-section font-semibold text-ink">
            Solicitação de exames
          </h3>
          <TextAreaField
            label="Exames solicitados"
            hint="Um exame por linha. Ex.: Hemograma completo"
            value={c.exames}
            onChange={(e) => campo('exames', e.target.value)}
            error={erros.exames}
            disabled={enviando}
          />
          <TextAreaField
            label="Orientações ao paciente (opcional)"
            rows={3}
            value={c.orientacoes}
            onChange={(e) => campo('orientacoes', e.target.value)}
            maxLength={2000}
            disabled={enviando}
          />
        </section>
      )}

      {(c.desfecho === 'inapto' || c.desfecho === 'cancelar') && (
        <TextAreaField
          label={c.desfecho === 'inapto' ? 'Motivo da reprovação' : 'Motivo do cancelamento'}
          hint={c.desfecho === 'inapto' ? 'O paciente verá este motivo.' : 'O paciente poderá agendar outro horário.'}
          rows={3}
          value={c.motivo}
          onChange={(e) => campo('motivo', e.target.value)}
          error={erros.motivo}
          maxLength={1000}
          disabled={enviando}
        />
      )}

      <Button type="submit" block kind={destrutivo ? 'destructive' : 'primary'} loading={enviando} disabled={!c.desfecho}>
        {c.desfecho === 'cancelar' ? 'Cancelar consulta' : 'Registrar atendimento'}
      </Button>
    </form>
  )
}
