import { useState, type FormEvent } from 'react'
import { mensagemDeErro } from '../../api/client'
import { Button, Consent, Message, SelectField, TextField } from '../../components/ui'
import { mascaraCpf, mascaraTelefone, somenteDigitos, UFS } from '../../lib/formato'
import { cpfValido, emailValido, telefoneValido, temErros, type Erros } from '../../lib/validacao'
import { medicosService } from '../../services/medicos'

type Campos = { nome: string; cpf: string; email: string; telefone: string; crm: string; ufCrm: string; declaracao: boolean }
const vazio: Campos = { nome: '', cpf: '', email: '', telefone: '', crm: '', ufCrm: '', declaracao: false }
const opcoesUf = UFS.map((uf) => ({ value: uf, label: uf }))

function validar(c: Campos): Erros<Campos> {
  return {
    nome: c.nome.trim().length < 3 ? 'Informe o nome completo (mínimo de 3 caracteres).' : undefined,
    cpf: !c.cpf ? 'Informe o CPF.' : !cpfValido(c.cpf) ? 'CPF inválido. Confira os números.' : undefined,
    email: !c.email ? 'Informe o e-mail do médico.' : !emailValido(c.email) ? 'Informe um e-mail válido.' : undefined,
    telefone: !telefoneValido(c.telefone) ? 'Informe o telefone com DDD.' : undefined,
    crm: !/^\d{1,10}$/.test(c.crm) ? 'Informe o CRM (apenas números, até 10 dígitos).' : undefined,
    ufCrm: !c.ufCrm ? 'Selecione a UF do CRM.' : undefined,
    declaracao: !c.declaracao ? 'Confirme que a instituição conferiu o CRM e a UF.' : undefined,
  }
}

// Figma: "Formulário e ações · Cadastrar ou editar médico" (103:3261). UC22 passos 4–7.
export function NovoMedicoForm({ onCriado }: { onCriado: (mensagem: string, id: string) => void }) {
  const [c, setC] = useState<Campos>(vazio)
  const [erros, setErros] = useState<Erros<Campos>>({})
  const [falha, setFalha] = useState<string[]>([])
  const [enviando, setEnviando] = useState(false)
  const campo = <K extends keyof Campos>(nome: K, valor: Campos[K]) => setC({ ...c, [nome]: valor })

  async function aoEnviar(e: FormEvent) {
    e.preventDefault()
    const novos = validar(c)
    setErros(novos)
    if (temErros(novos)) return
    setEnviando(true)
    setFalha([])
    try {
      const r = await medicosService.criar({
        nome: c.nome.trim(),
        cpf: somenteDigitos(c.cpf),
        email: c.email.trim(),
        telefone: somenteDigitos(c.telefone),
        crm: c.crm,
        ufCrm: c.ufCrm,
        declaracaoCrmConferido: true,
      })
      setC(vazio)
      onCriado(
        r.senhaProvisoriaEnviada
          ? `Médico cadastrado. A senha provisória foi enviada para ${r.medico.email}.`
          : 'Médico cadastrado, mas não foi possível enviar a senha provisória. Use "Reenviar senha provisória".',
        r.medico.id,
      )
    } catch (err) {
      setFalha(mensagemDeErro(err))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form noValidate onSubmit={aoEnviar} className="flex flex-col gap-2.5">
      {falha.length > 0 && (
        <Message tone="error">
          {falha.map((m) => (
            <p key={m}>! {m}</p>
          ))}
        </Message>
      )}
      <TextField label="Nome do médico" value={c.nome} onChange={(e) => campo('nome', e.target.value)} error={erros.nome} disabled={enviando} autoComplete="off" />
      <TextField label="CPF" inputMode="numeric" value={c.cpf} onChange={(e) => campo('cpf', mascaraCpf(e.target.value))} error={erros.cpf} disabled={enviando} />
      <TextField label="CRM" inputMode="numeric" hint="Apenas números." value={c.crm} onChange={(e) => campo('crm', somenteDigitos(e.target.value).slice(0, 10))} error={erros.crm} disabled={enviando} />
      <SelectField label="UF do CRM" placeholder="Selecione o estado" options={opcoesUf} value={c.ufCrm} onChange={(e) => campo('ufCrm', e.target.value)} error={erros.ufCrm} disabled={enviando} />
      <TextField
        label="E-mail"
        type="email"
        hint="A senha provisória é enviada para este e-mail."
        value={c.email}
        onChange={(e) => campo('email', e.target.value)}
        error={erros.email}
        disabled={enviando}
        autoComplete="off"
      />
      <TextField label="Telefone" inputMode="tel" value={c.telefone} onChange={(e) => campo('telefone', mascaraTelefone(e.target.value))} error={erros.telefone} disabled={enviando} />
      <Consent checked={c.declaracao} onChange={(e) => campo('declaracao', e.target.checked)} error={erros.declaracao} disabled={enviando}>
        Confirmo que a instituição conferiu o CRM e a UF.
      </Consent>
      <Button type="submit" loading={enviando}>
        Salvar médico
      </Button>
    </form>
  )
}
