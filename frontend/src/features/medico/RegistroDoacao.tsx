import { useId, useState, type FormEvent } from 'react'
import { mensagemDeErro } from '../../api/client'
import type { TipoSanguineo } from '../../api/types'
import { Button, Message, SelectField, TextAreaField } from '../../components/ui'
import { TIPOS_SANGUINEOS } from '../../lib/formato'
import { medicoService } from '../../services/equipe'

type Desfecho = '' | 'DOOU' | 'NAO_DOOU' | 'AUSENTE'

const desfechos: { valor: Exclude<Desfecho, ''>; rotulo: string }[] = [
  { valor: 'DOOU', rotulo: 'Compareceu e doou' },
  { valor: 'NAO_DOOU', rotulo: 'Compareceu e não doou' },
  { valor: 'AUSENTE', rotulo: 'Não compareceu' },
]

const opcoesTipo = TIPOS_SANGUINEOS.map((t) => ({ value: t, label: t }))

type Props = { agendamentoId: string; onRegistrado: (mensagem: string) => void; onCancelar: () => void }

/** RF11 – comparecimento, doação, tipo sanguíneo (ABO + Rh), motivo e observações. Não é editado depois. */
export function RegistroDoacao({ agendamentoId, onRegistrado, onCancelar }: Props) {
  const nome = useId()
  const [desfecho, setDesfecho] = useState<Desfecho>('')
  const [tipo, setTipo] = useState<'' | TipoSanguineo>('')
  const [motivo, setMotivo] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [erros, setErros] = useState<{ desfecho?: string; motivo?: string }>({})
  const [falha, setFalha] = useState<string[]>([])
  const [enviando, setEnviando] = useState(false)
  const compareceu = desfecho === 'DOOU' || desfecho === 'NAO_DOOU'

  async function aoEnviar(e: FormEvent) {
    e.preventDefault()
    const novos = {
      desfecho: !desfecho ? 'Escolha o desfecho do atendimento.' : undefined,
      motivo: desfecho === 'NAO_DOOU' && motivo.trim().length < 3 ? 'Informe o motivo de o paciente não ter doado.' : undefined,
    }
    setErros(novos)
    if (novos.desfecho || novos.motivo) return
    setEnviando(true)
    setFalha([])
    try {
      const r = await medicoService.registrarDoacao({
        agendamentoId,
        compareceu,
        doou: desfecho === 'DOOU',
        tipoSanguineo: compareceu && tipo ? tipo : undefined,
        motivoNaoDoacao: desfecho === 'NAO_DOOU' ? motivo.trim() : undefined,
        observacoes: observacoes.trim() || undefined,
      })
      onRegistrado(r.mensagem)
    } catch (err) {
      setFalha(mensagemDeErro(err))
      setEnviando(false)
    }
  }

  return (
    <form noValidate onSubmit={aoEnviar} className="flex flex-col gap-3 rounded-control border border-line bg-surface p-3">
      {falha.length > 0 && (
        <Message tone="error">
          {falha.map((m) => (
            <p key={m}>! {m}</p>
          ))}
        </Message>
      )}
      <fieldset className="flex flex-col gap-2" disabled={enviando} aria-describedby={erros.desfecho ? `${nome}-erro` : undefined}>
        <legend className="mb-1 text-label font-medium text-ink">Desfecho</legend>
        {desfechos.map((d) => (
          <label key={d.valor} className="flex items-center gap-2 text-body text-ink">
            <input type="radio" name={nome} value={d.valor} checked={desfecho === d.valor} onChange={() => setDesfecho(d.valor)} className="size-5 accent-brand" />
            {d.rotulo}
          </label>
        ))}
        {erros.desfecho && (
          <p id={`${nome}-erro`} className="text-caption text-error">
            {erros.desfecho}
          </p>
        )}
      </fieldset>
      {compareceu && (
        <SelectField
          label="Tipo sanguíneo (opcional)"
          hint="ABO + Rh, quando houver tipagem. É usado na ativação da conta."
          placeholder="Não tipado"
          options={opcoesTipo}
          value={tipo}
          onChange={(e) => setTipo(e.target.value as '' | TipoSanguineo)}
          disabled={enviando}
        />
      )}
      {desfecho === 'NAO_DOOU' && (
        <TextAreaField label="Motivo de não doar" rows={2} value={motivo} onChange={(e) => setMotivo(e.target.value)} error={erros.motivo} disabled={enviando} maxLength={500} />
      )}
      <TextAreaField label="Observações (opcional)" rows={3} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} disabled={enviando} maxLength={2000} />
      <p className="text-caption text-muted">O registro fica vinculado a este hemocentro e não pode ser editado depois.</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="submit" loading={enviando}>
          Salvar registro
        </Button>
        <Button kind="secondary" disabled={enviando} onClick={onCancelar}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
