import { TextField } from '../../components/ui'
import { mascaraCpf, mascaraTelefone } from '../../lib/formato'
import type { Erros } from '../../lib/validacao'
import type { CamposRepresentante } from './representante'

type Props = {
  valor: CamposRepresentante
  erros: Erros<CamposRepresentante>
  desabilitado: boolean
  onChange: (valor: CamposRepresentante) => void
}

/** Campos do representante (UC25 passo 4 e FA03), usados no cadastro do hospital e em "Adicionar representante". */
export function RepresentanteCampos({ valor: c, erros, desabilitado, onChange }: Props) {
  const campo = (nome: keyof CamposRepresentante, texto: string) => onChange({ ...c, [nome]: texto })
  return (
    <>
      <TextField label="Nome do representante" value={c.nome} onChange={(e) => campo('nome', e.target.value)} error={erros.nome} disabled={desabilitado} autoComplete="off" />
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
      <TextField label="Cargo (opcional)" value={c.cargo} onChange={(e) => campo('cargo', e.target.value)} disabled={desabilitado} />
    </>
  )
}
