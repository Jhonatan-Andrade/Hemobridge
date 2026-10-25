import { useState, type FormEvent } from 'react'
import { mensagemDeErro } from '../../api/client'
import { Button, Message, TextField } from '../../components/ui'
import { mascaraCpf, mascaraTelefone, somenteDigitos } from '../../lib/formato'
import { cpfValido, emailValido, telefoneValido, temErros, type Erros } from '../../lib/validacao'
import { usuariosAdminService } from '../../services/admin'

type Campos = { nome: string; cpf: string; email: string; telefone: string }
const vazio: Campos = { nome: '', cpf: '', email: '', telefone: '' }

function validar(c: Campos): Erros<Campos> {
  return {
    nome: c.nome.trim().length < 3 ? 'Informe o nome completo (mínimo de 3 caracteres).' : undefined,
    cpf: !c.cpf ? 'Informe o CPF.' : !cpfValido(c.cpf) ? 'CPF inválido. Confira os números.' : undefined,
    email: !c.email ? 'Informe o e-mail institucional.' : !emailValido(c.email) ? 'Informe um e-mail válido.' : undefined,
    telefone: c.telefone && !telefoneValido(c.telefone) ? 'Informe o telefone com DDD.' : undefined,
  }
}

// Figma: "Formulário e ações · Novo administrador" (103:3180). UC26 FA01.
export function NovoAdministradorForm({ onCriado }: { onCriado: (mensagem: string) => void }) {
  const [c, setC] = useState<Campos>(vazio)
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
    try {
      const r = await usuariosAdminService.criarAdministrador({
        nome: c.nome.trim(),
        cpf: somenteDigitos(c.cpf),
        email: c.email.trim(),
        telefone: somenteDigitos(c.telefone) || undefined,
      })
      setC(vazio)
      onCriado(
        r.senhaProvisoriaEnviada
          ? `Administrador criado. A senha provisória foi enviada para ${r.administrador.email}.`
          : 'Administrador criado, mas não foi possível enviar a senha provisória. Use "Reenviar senha provisória".',
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
      <TextField label="Nome do administrador" value={c.nome} onChange={(e) => campo('nome', e.target.value)} error={erros.nome} disabled={enviando} autoComplete="off" />
      <TextField label="CPF" inputMode="numeric" value={c.cpf} onChange={(e) => campo('cpf', mascaraCpf(e.target.value))} error={erros.cpf} disabled={enviando} />
      <TextField
        label="E-mail institucional"
        type="email"
        hint="A senha provisória é enviada para este e-mail."
        value={c.email}
        onChange={(e) => campo('email', e.target.value)}
        error={erros.email}
        disabled={enviando}
        autoComplete="off"
      />
      <TextField label="Telefone (opcional)" inputMode="tel" value={c.telefone} onChange={(e) => campo('telefone', mascaraTelefone(e.target.value))} error={erros.telefone} disabled={enviando} />
      <Button type="submit" loading={enviando}>
        Criar administrador
      </Button>
    </form>
  )
}
