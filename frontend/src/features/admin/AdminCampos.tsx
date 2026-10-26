import { TextField } from '../../components/ui'
import { mascaraCpf, mascaraTelefone } from '../../lib/formato'
import type { Erros } from '../../lib/validacao'
import type { CamposAdmin } from './adminHemocentro'

type Props = {
  valor: CamposAdmin
  erros: Erros<CamposAdmin>
  desabilitado: boolean
  onChange: (valor: CamposAdmin) => void
}

/** Campos do Admin do hemocentro, usados no cadastro do hemocentro e em "Adicionar administrador". */
export function AdminCampos({ valor: c, erros, desabilitado, onChange }: Props) {
  const campo = (nome: keyof CamposAdmin, texto: string) => onChange({ ...c, [nome]: texto })
  return (
    <>
      <TextField label="Nome do administrador" value={c.nome} onChange={(e) => campo('nome', e.target.value)} error={erros.nome} disabled={desabilitado} autoComplete="off" />
      <TextField label="CPF" inputMode="numeric" value={c.cpf} onChange={(e) => campo('cpf', mascaraCpf(e.target.value))} error={erros.cpf} disabled={desabilitado} />
      <TextField
        label="E-mail"
        type="email"
        hint="A senha provisória é enviada para este e-mail."
        value={c.email}
        onChange={(e) => campo('email', e.target.value)}
        error={erros.email}
        disabled={desabilitado}
        autoComplete="off"
      />
      <TextField label="Telefone" inputMode="tel" value={c.telefone} onChange={(e) => campo('telefone', mascaraTelefone(e.target.value))} error={erros.telefone} disabled={desabilitado} />
    </>
  )
}
