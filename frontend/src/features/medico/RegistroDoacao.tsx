import { useId, useState, type FormEvent, type ReactNode } from 'react'
import { mensagemDeErro } from '../../api/client'
import type { Afericoes, Aptidao, RegistroDoacao as Registro, TipoSanguineo } from '../../api/types'
import { Button, Consent, Message, SelectField, TextAreaField, TextField } from '../../components/ui'
import { APTIDOES, somarDias, TIPOS_SANGUINEOS } from '../../lib/formato'
import { medicoService } from '../../services/equipe'

type Desfecho = '' | 'DOOU' | 'NAO_DOOU' | 'AUSENTE'

const desfechos: { valor: Exclude<Desfecho, ''>; rotulo: string }[] = [
  { valor: 'DOOU', rotulo: 'Compareceu e doou' },
  { valor: 'NAO_DOOU', rotulo: 'Compareceu e não doou' },
  { valor: 'AUSENTE', rotulo: 'Não compareceu' },
]

const opcoesTipo = TIPOS_SANGUINEOS.map((t) => ({ value: t, label: t }))
const opcoesAptidao = Object.entries(APTIDOES).map(([value, label]) => ({ value, label }))

// Entrevista confidencial: perguntas de sim/não e de texto livre (vazio = nada a declarar).
const PERGUNTAS = [
  ['transfusaoAnterior', 'Já recebeu transfusão de sangue'],
  ['tatuagemOuPiercingRecente', 'Tatuagem ou piercing recente'],
  ['usoDeDrogas', 'Uso de drogas'],
  ['comportamentoSexualDeRisco', 'Comportamento sexual de risco'],
] as const
const RELATOS = [
  ['doencas', 'Doenças'],
  ['cirurgias', 'Cirurgias'],
  ['alergias', 'Alergias'],
  ['gestacoes', 'Gestações, partos ou abortos'],
  ['medicamentos', 'Medicamentos em uso'],
  ['vacinasRecentes', 'Vacinas recentes'],
  ['viagemAreaDeRisco', 'Viagem recente a área de risco (malária, dengue…)'],
] as const

// Aferições do dia: [campo, rótulo, unidade, aceita decimal].
const MEDIDAS: [keyof Afericoes, string, string, boolean][] = [
  ['pesoKg', 'Peso', 'kg', true],
  ['alturaCm', 'Altura', 'cm', false],
  ['pressaoSistolica', 'Pressão sistólica', 'mmHg', false],
  ['pressaoDiastolica', 'Pressão diastólica', 'mmHg', false],
  ['pulso', 'Pulso', 'bpm', false],
  ['temperatura', 'Temperatura', '°C', true],
  ['hemoglobina', 'Hemoglobina', 'g/dL', true],
  ['hematocrito', 'Hematócrito', '%', true],
]
const OBRIGATORIAS_NA_DOACAO: (keyof Afericoes)[] = ['pesoKg', 'pressaoSistolica', 'pressaoDiastolica', 'pulso', 'temperatura']

type Perguntas = Record<(typeof PERGUNTAS)[number][0], boolean>
type Relatos = Record<(typeof RELATOS)[number][0] | 'observacoes', string>
type Erros = Partial<Record<'desfecho' | 'motivo' | 'aptidao' | 'aptoAPartirDe' | 'volume' | 'bolsa' | keyof Afericoes, string>>

/** "72,5" → 72.5; vazio → undefined; texto inválido → NaN. */
const numero = (v: string) => (v.trim() ? Number(v.replace(',', '.')) : undefined)

type Props = { agendamentoId: string; dataAtendimento: string; onRegistrado: (mensagem: string) => void; onCancelar: () => void }

/**
 * RF11 – atendimento completo: triagem clínica (confidencial), aferições do dia, aptidão,
 * coleta e tipo sanguíneo. Não é editado depois; os exames da amostra são lançados à parte.
 */
export function RegistroDoacao({ agendamentoId, dataAtendimento, onRegistrado, onCancelar }: Props) {
  const nome = useId()
  const [desfecho, setDesfecho] = useState<Desfecho>('')
  const [perguntas, setPerguntas] = useState<Perguntas>({
    transfusaoAnterior: false,
    tatuagemOuPiercingRecente: false,
    usoDeDrogas: false,
    comportamentoSexualDeRisco: false,
  })
  const [relatos, setRelatos] = useState<Relatos>({
    doencas: '',
    cirurgias: '',
    alergias: '',
    gestacoes: '',
    medicamentos: '',
    vacinasRecentes: '',
    viagemAreaDeRisco: '',
    observacoes: '',
  })
  const [medidas, setMedidas] = useState<Partial<Record<keyof Afericoes, string>>>({})
  const [aptidao, setAptidao] = useState<'' | Aptidao>('')
  const [aptoAPartirDe, setAptoAPartirDe] = useState('')
  const [tipo, setTipo] = useState<'' | TipoSanguineo>('')
  const [volume, setVolume] = useState('450')
  const [bolsa, setBolsa] = useState('')
  const [reacoes, setReacoes] = useState('')
  const [motivo, setMotivo] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [erros, setErros] = useState<Erros>({})
  const [falha, setFalha] = useState<string[]>([])
  const [enviando, setEnviando] = useState(false)
  const compareceu = desfecho === 'DOOU' || desfecho === 'NAO_DOOU'
  const doou = desfecho === 'DOOU'

  function validar(): Erros {
    const e: Erros = { desfecho: !desfecho ? 'Escolha o desfecho do atendimento.' : undefined }
    if (!compareceu) return e
    for (const [campo, rotulo] of MEDIDAS) {
      const v = numero(medidas[campo] ?? '')
      if (v !== undefined && Number.isNaN(v)) e[campo] = `${rotulo}: informe um número.`
      else if (v === undefined && doou && OBRIGATORIAS_NA_DOACAO.includes(campo)) e[campo] = `Informe ${rotulo.toLowerCase()}.`
    }
    if (doou && !medidas.hemoglobina?.trim() && !medidas.hematocrito?.trim()) e.hemoglobina = 'Informe hemoglobina ou hematócrito.'
    e.aptidao = !aptidao ? 'Informe a conclusão da triagem.' : doou && aptidao !== 'APTO' ? 'Quem doou foi considerado apto.' : undefined
    if (aptidao === 'INAPTO_TEMPORARIO' && (!aptoAPartirDe || aptoAPartirDe <= dataAtendimento)) {
      e.aptoAPartirDe = 'Informe uma data posterior ao atendimento.'
    }
    if (doou) {
      const v = numero(volume)
      e.volume = v === undefined || !Number.isInteger(v) || v < 50 || v > 600 ? 'Volume de 50 a 600 mL.' : undefined
      e.bolsa = !/^[A-Za-z0-9-]{3,30}$/.test(bolsa.trim()) ? 'De 3 a 30 letras, números ou hífen.' : undefined
    } else {
      e.motivo = motivo.trim().length < 3 ? 'Informe o motivo de o paciente não ter doado.' : undefined
    }
    return e
  }

  async function aoEnviar(ev: FormEvent) {
    ev.preventDefault()
    const novos = validar()
    setErros(novos)
    if (Object.values(novos).some(Boolean)) {
      setFalha(['Revise os campos destacados.'])
      return
    }
    const texto = (v: string) => v.trim() || undefined
    const corpo: Registro = { agendamentoId, compareceu, doou, observacoes: texto(observacoes) }
    if (compareceu) {
      corpo.triagem = {
        ...perguntas,
        ...Object.fromEntries(Object.entries(relatos).map(([k, v]) => [k, texto(v)])),
      }
      corpo.afericoes = Object.fromEntries(MEDIDAS.map(([campo]) => [campo, numero(medidas[campo] ?? '')]))
      corpo.aptidao = aptidao || undefined
      corpo.aptoAPartirDe = aptidao === 'INAPTO_TEMPORARIO' ? aptoAPartirDe : undefined
      corpo.tipoSanguineo = tipo || undefined
    }
    if (doou) corpo.coleta = { volumeMl: Number(volume), numeroBolsa: bolsa.trim(), reacoes: texto(reacoes) }
    else if (compareceu) corpo.motivoNaoDoacao = motivo.trim()

    setEnviando(true)
    setFalha([])
    try {
      const r = await medicoService.registrarDoacao(corpo)
      onRegistrado(r.mensagem)
    } catch (err) {
      setFalha(mensagemDeErro(err))
      setEnviando(false)
    }
  }

  return (
    <form noValidate onSubmit={aoEnviar} className="flex flex-col gap-4 rounded-control border border-line bg-surface p-3">
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
        <>
          <Secao titulo="Triagem clínica" descricao="Entrevista confidencial: fica só neste hemocentro. Deixe em branco o que não houver.">
            <div className="grid gap-1 sm:grid-cols-2">
              {PERGUNTAS.map(([campo, rotulo]) => (
                <Consent key={campo} checked={perguntas[campo]} onChange={(e) => setPerguntas({ ...perguntas, [campo]: e.target.checked })} disabled={enviando}>
                  {rotulo}
                </Consent>
              ))}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {RELATOS.map(([campo, rotulo]) => (
                <TextField key={campo} label={rotulo} value={relatos[campo]} onChange={(e) => setRelatos({ ...relatos, [campo]: e.target.value })} disabled={enviando} maxLength={campo === 'gestacoes' || campo === 'vacinasRecentes' || campo === 'viagemAreaDeRisco' ? 500 : 1000} />
              ))}
            </div>
            <TextAreaField label="Observações da triagem" rows={2} value={relatos.observacoes} onChange={(e) => setRelatos({ ...relatos, observacoes: e.target.value })} disabled={enviando} maxLength={2000} />
          </Secao>

          <Secao titulo="Aferições" descricao={doou ? 'Obrigatórias quando há doação: peso, pressão, pulso, temperatura e hemoglobina ou hematócrito.' : 'Informe o que foi aferido.'}>
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
              {MEDIDAS.map(([campo, rotulo, unidade, fracao]) => (
                <TextField
                  key={campo}
                  label={`${rotulo} (${unidade})`}
                  inputMode={fracao ? 'decimal' : 'numeric'}
                  value={medidas[campo] ?? ''}
                  onChange={(e) => setMedidas({ ...medidas, [campo]: e.target.value })}
                  error={erros[campo]}
                  disabled={enviando}
                />
              ))}
            </div>
          </Secao>

          <Secao titulo="Conclusão da triagem">
            <div className="grid gap-2 sm:grid-cols-2">
              <SelectField label="Aptidão" placeholder="Selecione" options={opcoesAptidao} value={aptidao} onChange={(e) => setAptidao(e.target.value as '' | Aptidao)} error={erros.aptidao} disabled={enviando} />
              {aptidao === 'INAPTO_TEMPORARIO' && (
                <TextField
                  label="Apto a partir de"
                  type="date"
                  min={somarDias(dataAtendimento, 1)}
                  value={aptoAPartirDe}
                  onChange={(e) => setAptoAPartirDe(e.target.value)}
                  error={erros.aptoAPartirDe}
                  hint="Até lá o paciente não consegue agendar; agendamentos antes dessa data são cancelados."
                  disabled={enviando}
                />
              )}
            </div>
            {aptidao === 'INAPTO_DEFINITIVO' && (
              <p className="text-caption text-muted">O paciente não poderá mais agendar, e os agendamentos futuros dele serão cancelados.</p>
            )}
            <SelectField
              label="Tipo sanguíneo (opcional)"
              hint="ABO + Rh, quando houver tipagem. É usado na ativação da conta."
              placeholder="Não tipado"
              options={opcoesTipo}
              value={tipo}
              onChange={(e) => setTipo(e.target.value as '' | TipoSanguineo)}
              disabled={enviando}
            />
          </Secao>
        </>
      )}

      {doou && (
        <Secao titulo="Coleta">
          <div className="grid gap-2 sm:grid-cols-2">
            <TextField label="Volume coletado (mL)" inputMode="numeric" value={volume} onChange={(e) => setVolume(e.target.value)} error={erros.volume} disabled={enviando} />
            <TextField label="Número da bolsa" value={bolsa} onChange={(e) => setBolsa(e.target.value)} error={erros.bolsa} disabled={enviando} maxLength={30} />
          </div>
          <TextAreaField label="Reações durante a doação (opcional)" rows={2} value={reacoes} onChange={(e) => setReacoes(e.target.value)} disabled={enviando} maxLength={1000} />
        </Secao>
      )}
      {desfecho === 'NAO_DOOU' && (
        <TextAreaField label="Motivo de não doar" rows={2} value={motivo} onChange={(e) => setMotivo(e.target.value)} error={erros.motivo} disabled={enviando} maxLength={500} />
      )}
      <TextAreaField label="Observações do atendimento (opcional)" rows={2} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} disabled={enviando} maxLength={2000} />
      <p className="text-caption text-muted">
        O registro fica vinculado a este hemocentro e não pode ser editado depois. Os exames da amostra são lançados em Atendimentos.
      </p>
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

function Secao({ titulo, descricao, children }: { titulo: string; descricao?: string; children: ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-2 border-t border-line pt-3">
      <legend className="text-label font-semibold text-ink">{titulo}</legend>
      {descricao && <p className="text-caption text-muted">{descricao}</p>}
      {children}
    </fieldset>
  )
}
