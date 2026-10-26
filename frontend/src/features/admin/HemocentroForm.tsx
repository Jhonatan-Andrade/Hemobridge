import { useState, type FormEvent } from 'react'
import { mensagemDeErro } from '../../api/client'
import type { HemocentroGestaoDetalhe } from '../../api/types'
import { Button, Message, SelectField, TextField } from '../../components/ui'
import { mascaraCep, mascaraCnpj, mascaraTelefone, somenteDigitos, UFS } from '../../lib/formato'
import { cnpjValido, telefoneValido, temErros, type Erros } from '../../lib/validacao'
import { gestaoHemocentrosService, type DadosHemocentro } from '../../services/admin'
import { AdminCampos } from './AdminCampos'
import { adminVazio, dadosAdmin, validarAdmin, type CamposAdmin } from './adminHemocentro'

type Campos = {
  nome: string
  cnpj: string
  endereco: string
  cidade: string
  estado: string
  cep: string
  telefone: string
  horarioFuncionamento: string
}

const opcoesUf = UFS.map((uf) => ({ value: uf, label: uf }))

function camposDe(h?: HemocentroGestaoDetalhe): Campos {
  return {
    nome: h?.nome ?? '',
    cnpj: h ? mascaraCnpj(h.cnpj) : '',
    endereco: h?.endereco ?? '',
    cidade: h?.cidade ?? '',
    estado: h?.estado ?? '',
    cep: h ? mascaraCep(h.cep) : '',
    telefone: h?.telefone ? mascaraTelefone(h.telefone) : '',
    horarioFuncionamento: h?.horarioFuncionamento ?? '',
  }
}

function validar(c: Campos): Erros<Campos> {
  return {
    nome: c.nome.trim().length < 3 ? 'Informe o nome do hemocentro (mínimo de 3 caracteres).' : undefined,
    cnpj: !c.cnpj ? 'Informe o CNPJ.' : !cnpjValido(c.cnpj) ? 'CNPJ inválido. Confira os números.' : undefined,
    endereco: c.endereco.trim().length < 5 ? 'Informe o endereço.' : undefined,
    cidade: c.cidade.trim().length < 2 ? 'Informe a cidade.' : undefined,
    estado: !c.estado ? 'Selecione o estado.' : undefined,
    cep: somenteDigitos(c.cep).length !== 8 ? 'Informe o CEP com 8 dígitos.' : undefined,
    telefone: !telefoneValido(c.telefone) ? 'Informe o telefone com DDD.' : undefined,
  }
}

function dadosDe(c: Campos): DadosHemocentro {
  return {
    nome: c.nome.trim(),
    cnpj: somenteDigitos(c.cnpj),
    endereco: c.endereco.trim(),
    cidade: c.cidade.trim(),
    estado: c.estado,
    cep: somenteDigitos(c.cep),
    telefone: somenteDigitos(c.telefone),
    horarioFuncionamento: c.horarioFuncionamento.trim() || undefined,
  }
}

type Props = {
  /** Sem hemocentro, o formulário cadastra um novo junto com o Admin inicial (RF15). */
  hemocentro?: HemocentroGestaoDetalhe
  onSalvo: (mensagem: string, hemocentroId: string) => void
  /** Tela própria de cadastro: campos em duas colunas a partir de `md`, agrupados em seções. */
  largo?: boolean
}

// Figma: "Formulário e ações · Cadastrar ou editar hospital" (102:3161), sem localização geográfica.
export function HemocentroForm({ hemocentro, onSalvo, largo = false }: Props) {
  const [c, setC] = useState<Campos>(() => camposDe(hemocentro))
  const [admin, setAdmin] = useState<CamposAdmin>(adminVazio)
  const [erros, setErros] = useState<Erros<Campos>>({})
  const [errosAdmin, setErrosAdmin] = useState<Erros<CamposAdmin>>({})
  const [falha, setFalha] = useState<string[]>([])
  const [enviando, setEnviando] = useState(false)
  const campo = (nome: keyof Campos, valor: string) => setC({ ...c, [nome]: valor })

  const grade = largo ? 'grid gap-x-4 gap-y-2.5 md:grid-cols-2' : 'flex flex-col gap-2.5'
  const linhaInteira = largo ? 'md:col-span-2' : ''

  async function aoEnviar(e: FormEvent) {
    e.preventDefault()
    const novos = validar(c)
    const novosAdmin = hemocentro ? {} : validarAdmin(admin)
    setErros(novos)
    setErrosAdmin(novosAdmin)
    if (temErros(novos) || temErros(novosAdmin)) return

    setEnviando(true)
    setFalha([])
    try {
      if (hemocentro) {
        await gestaoHemocentrosService.atualizar(hemocentro.id, dadosDe(c))
        onSalvo('Dados do hemocentro atualizados.', hemocentro.id)
      } else {
        const r = await gestaoHemocentrosService.criar({ ...dadosDe(c), admin: dadosAdmin(admin) })
        onSalvo(
          r.senhaProvisoriaEnviada
            ? `Hemocentro cadastrado. A senha provisória foi enviada para ${r.admin.email}.`
            : 'Hemocentro cadastrado, mas não foi possível enviar a senha provisória. Reenvie nos detalhes do hemocentro.',
          r.hemocentro.id,
        )
      }
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
      <fieldset className={grade}>
        {largo && <legend className="float-left mb-1 w-full text-section font-semibold text-ink md:col-span-2">Dados do hemocentro</legend>}
        <TextField label="Nome do hemocentro" containerClassName={linhaInteira} value={c.nome} onChange={(e) => campo('nome', e.target.value)} error={erros.nome} disabled={enviando} />
        <TextField label="CNPJ" inputMode="numeric" value={c.cnpj} onChange={(e) => campo('cnpj', mascaraCnpj(e.target.value))} error={erros.cnpj} disabled={enviando} />
        <TextField label="Telefone" inputMode="tel" value={c.telefone} onChange={(e) => campo('telefone', mascaraTelefone(e.target.value))} error={erros.telefone} disabled={enviando} />
        <TextField label="Endereço" containerClassName={linhaInteira} value={c.endereco} onChange={(e) => campo('endereco', e.target.value)} error={erros.endereco} disabled={enviando} />
        <TextField label="Cidade" value={c.cidade} onChange={(e) => campo('cidade', e.target.value)} error={erros.cidade} disabled={enviando} />
        <SelectField label="UF" placeholder="Selecione o estado" options={opcoesUf} value={c.estado} onChange={(e) => campo('estado', e.target.value)} error={erros.estado} disabled={enviando} />
        <TextField label="CEP" inputMode="numeric" value={c.cep} onChange={(e) => campo('cep', mascaraCep(e.target.value))} error={erros.cep} disabled={enviando} />
        <TextField
          label="Horário de funcionamento (opcional)"
          placeholder="Ex.: seg. a sex., 7h às 18h"
          value={c.horarioFuncionamento}
          onChange={(e) => campo('horarioFuncionamento', e.target.value)}
          disabled={enviando}
        />
      </fieldset>

      {!hemocentro && (
        <fieldset className={`mt-2 border-t border-line pt-4 ${grade}`}>
          <legend className={`float-left mb-1 w-full font-semibold text-ink ${largo ? 'text-section md:col-span-2' : 'text-label'}`}>
            Admin do hemocentro
          </legend>
          <AdminCampos valor={admin} erros={errosAdmin} desabilitado={enviando} onChange={setAdmin} />
        </fieldset>
      )}

      <Button type="submit" loading={enviando}>
        {hemocentro ? 'Salvar' : 'Cadastrar hemocentro'}
      </Button>
    </form>
  )
}
