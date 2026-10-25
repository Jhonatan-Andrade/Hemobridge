import { useState, type FormEvent } from 'react'
import { mensagemDeErro } from '../../api/client'
import { Button, Message, SelectField, TextField } from '../../components/ui'
import { temErros, type Erros } from '../../lib/validacao'
import { agendaService } from '../../services/medico'

type Campos = { inicio: string; fim: string; duracao: string; linkSala: string }

const opcoesDuracao = [15, 20, 30, 40, 45, 60].map((m) => ({ value: String(m), label: `${m} minutos` }))

function linkHttps(valor: string) {
  try {
    return new URL(valor.trim()).protocol === 'https:'
  } catch {
    return false
  }
}

function validar(c: Campos): Erros<Campos> {
  return {
    inicio: !c.inicio ? 'Informe o horário de início.' : undefined,
    fim: !c.fim ? 'Informe o horário de término.' : c.inicio && c.fim <= c.inicio ? 'O término deve ser depois do início.' : undefined,
    linkSala: !c.linkSala.trim()
      ? 'Informe o link da sala de teleconsulta.'
      : !linkHttps(c.linkSala)
        ? 'O link deve ser um endereço web válido começando com https://.'
        : undefined,
  }
}

type Props = { data: string; onPublicado: (mensagem: string) => void }

// Figma: "Publicar horário" (101:3115). UC13 passos 3–5: o intervalo vira horários com a duração escolhida.
export function PublicarHorario({ data, onPublicado }: Props) {
  const [c, setC] = useState<Campos>({ inicio: '', fim: '', duracao: '30', linkSala: '' })
  const [erros, setErros] = useState<Erros<Campos>>({})
  const [falha, setFalha] = useState<string[]>([])
  const [enviando, setEnviando] = useState(false)
  const campo = (nome: keyof Campos, valor: string) => setC({ ...c, [nome]: valor })
  const dataFormatada = new Date(`${data}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' })

  async function aoEnviar(e: FormEvent) {
    e.preventDefault()
    const novos = validar(c)
    setErros(novos)
    if (temErros(novos)) return
    setEnviando(true)
    setFalha([])
    try {
      const r = await agendaService.criar({
        data,
        inicio: c.inicio,
        fim: c.fim,
        duracaoMinutos: Number(c.duracao),
        linkSala: c.linkSala.trim(),
      })
      // O link costuma ser o mesmo da sala fixa do médico: mantém para a próxima publicação.
      setC({ ...c, inicio: '', fim: '' })
      onPublicado(r.mensagem)
    } catch (err) {
      setFalha(mensagemDeErro(err))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form noValidate onSubmit={aoEnviar} className="flex flex-col gap-2.5" aria-labelledby="titulo-publicar">
      <h2 id="titulo-publicar" className="text-section font-semibold text-ink">
        Publicar horário
      </h2>
      <p className="text-body text-muted">
        <span className="first-letter:uppercase">{dataFormatada}</span> · horário de Brasília.
      </p>
      {falha.length > 0 && (
        <Message tone="error">
          {falha.map((m) => (
            <p key={m}>! {m}</p>
          ))}
        </Message>
      )}
      <div className="grid gap-x-3 sm:grid-cols-2">
        <TextField label="Início" type="time" value={c.inicio} onChange={(e) => campo('inicio', e.target.value)} error={erros.inicio} disabled={enviando} />
        <TextField label="Fim" type="time" value={c.fim} onChange={(e) => campo('fim', e.target.value)} error={erros.fim} disabled={enviando} />
      </div>
      <SelectField
        label="Duração de cada consulta"
        hint="O período é dividido em horários com esta duração."
        options={opcoesDuracao}
        value={c.duracao}
        onChange={(e) => campo('duracao', e.target.value)}
        disabled={enviando}
      />
      <TextField
        label="Link de teleconsulta"
        type="url"
        inputMode="url"
        placeholder="https://"
        hint="Endereço HTTPS da sala. O paciente vê o link 15 minutos antes da consulta."
        value={c.linkSala}
        onChange={(e) => campo('linkSala', e.target.value)}
        error={erros.linkSala}
        disabled={enviando}
      />
      <p className="px-1 text-small text-muted">Horários sobrepostos aos já publicados são recusados.</p>
      <Button type="submit" block loading={enviando}>
        Publicar horário
      </Button>
    </form>
  )
}
