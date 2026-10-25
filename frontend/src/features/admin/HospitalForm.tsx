import { useState, type FormEvent } from 'react'
import { mensagemDeErro } from '../../api/client'
import type { HospitalAdminDetalhe } from '../../api/types'
import { Button, Message, SelectField, TextField } from '../../components/ui'
import { mascaraCep, mascaraCnpj, mascaraTelefone, somenteDigitos, UFS } from '../../lib/formato'
import { cnpjValido, telefoneValido, temErros, type Erros } from '../../lib/validacao'
import { hospitaisAdminService, type DadosHospital } from '../../services/admin'
import { dadosRepresentante, representanteVazio, validarRepresentante, type CamposRepresentante } from './representante'
import { RepresentanteCampos } from './RepresentanteCampos'

type Campos = {
  nome: string
  cnpj: string
  endereco: string
  cidade: string
  estado: string
  cep: string
  telefone: string
  horarioFuncionamento: string
  latitude: string
  longitude: string
}

const opcoesUf = UFS.map((uf) => ({ value: uf, label: uf }))

function camposDe(h?: HospitalAdminDetalhe): Campos {
  return {
    nome: h?.nome ?? '',
    cnpj: h ? mascaraCnpj(h.cnpj) : '',
    endereco: h?.endereco ?? '',
    cidade: h?.cidade ?? '',
    estado: h?.estado ?? '',
    cep: h ? mascaraCep(h.cep) : '',
    telefone: h ? mascaraTelefone(h.telefone) : '',
    horarioFuncionamento: h?.horarioFuncionamento ?? '',
    latitude: h ? String(h.latitude) : '',
    longitude: h ? String(h.longitude) : '',
  }
}

const numero = (valor: string) => Number(valor.trim().replace(',', '.'))

function erroCoordenada(valor: string, limite: number, nome: string) {
  if (!valor.trim()) return `Informe a ${nome}.`
  const n = numero(valor)
  return Number.isNaN(n) || Math.abs(n) > limite ? `${nome[0].toUpperCase()}${nome.slice(1)} inválida (entre −${limite} e ${limite}).` : undefined
}

function validar(c: Campos): Erros<Campos> {
  return {
    nome: c.nome.trim().length < 3 ? 'Informe o nome do hospital (mínimo de 3 caracteres).' : undefined,
    cnpj: !c.cnpj ? 'Informe o CNPJ.' : !cnpjValido(c.cnpj) ? 'CNPJ inválido. Confira os números.' : undefined,
    endereco: c.endereco.trim().length < 5 ? 'Informe o endereço.' : undefined,
    cidade: c.cidade.trim().length < 2 ? 'Informe a cidade.' : undefined,
    estado: !c.estado ? 'Selecione o estado.' : undefined,
    cep: somenteDigitos(c.cep).length !== 8 ? 'Informe o CEP com 8 dígitos.' : undefined,
    telefone: !telefoneValido(c.telefone) ? 'Informe o telefone com DDD.' : undefined,
    latitude: erroCoordenada(c.latitude, 90, 'latitude'),
    longitude: erroCoordenada(c.longitude, 180, 'longitude'),
  }
}

function dadosDe(c: Campos): DadosHospital {
  return {
    nome: c.nome.trim(),
    cnpj: somenteDigitos(c.cnpj),
    endereco: c.endereco.trim(),
    cidade: c.cidade.trim(),
    estado: c.estado,
    cep: somenteDigitos(c.cep),
    telefone: somenteDigitos(c.telefone),
    horarioFuncionamento: c.horarioFuncionamento.trim() || undefined,
    latitude: numero(c.latitude),
    longitude: numero(c.longitude),
  }
}

type Props = {
  /** Sem hospital, o formulário cadastra um novo junto com o primeiro representante (UC25 passos 4–6). */
  hospital?: HospitalAdminDetalhe
  onSalvo: (mensagem: string, hospitalId: string) => void
}

// Figma: "Formulário e ações · Cadastrar ou editar hospital" (102:3161).
export function HospitalForm({ hospital, onSalvo }: Props) {
  const [c, setC] = useState<Campos>(() => camposDe(hospital))
  const [rep, setRep] = useState<CamposRepresentante>(representanteVazio)
  const [erros, setErros] = useState<Erros<Campos>>({})
  const [errosRep, setErrosRep] = useState<Erros<CamposRepresentante>>({})
  const [falha, setFalha] = useState<string[]>([])
  const [enviando, setEnviando] = useState(false)
  const campo = (nome: keyof Campos, valor: string) => setC({ ...c, [nome]: valor })

  async function aoEnviar(e: FormEvent) {
    e.preventDefault()
    const novos = validar(c)
    const novosRep = hospital ? {} : validarRepresentante(rep)
    setErros(novos)
    setErrosRep(novosRep)
    if (temErros(novos) || temErros(novosRep)) return

    setEnviando(true)
    setFalha([])
    try {
      if (hospital) {
        await hospitaisAdminService.atualizar(hospital.id, dadosDe(c))
        onSalvo('Dados do hospital atualizados.', hospital.id)
      } else {
        const r = await hospitaisAdminService.criar({ ...dadosDe(c), representante: dadosRepresentante(rep) })
        onSalvo(
          r.senhaProvisoriaEnviada
            ? `Hospital cadastrado. A senha provisória foi enviada para ${r.representante.email}.`
            : 'Hospital cadastrado, mas não foi possível enviar a senha provisória. Reenvie pela tela de Usuários.',
          r.hospital.id,
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
      <TextField label="Nome do hospital" value={c.nome} onChange={(e) => campo('nome', e.target.value)} error={erros.nome} disabled={enviando} />
      <TextField label="CNPJ" inputMode="numeric" value={c.cnpj} onChange={(e) => campo('cnpj', mascaraCnpj(e.target.value))} error={erros.cnpj} disabled={enviando} />
      <TextField label="Endereço" value={c.endereco} onChange={(e) => campo('endereco', e.target.value)} error={erros.endereco} disabled={enviando} />
      <TextField label="Cidade" value={c.cidade} onChange={(e) => campo('cidade', e.target.value)} error={erros.cidade} disabled={enviando} />
      <SelectField label="UF" placeholder="Selecione o estado" options={opcoesUf} value={c.estado} onChange={(e) => campo('estado', e.target.value)} error={erros.estado} disabled={enviando} />
      <TextField label="CEP" inputMode="numeric" value={c.cep} onChange={(e) => campo('cep', mascaraCep(e.target.value))} error={erros.cep} disabled={enviando} />
      <TextField label="Telefone" inputMode="tel" value={c.telefone} onChange={(e) => campo('telefone', mascaraTelefone(e.target.value))} error={erros.telefone} disabled={enviando} />
      <TextField
        label="Horário de funcionamento (opcional)"
        placeholder="Ex.: seg. a sex., 7h às 18h"
        value={c.horarioFuncionamento}
        onChange={(e) => campo('horarioFuncionamento', e.target.value)}
        disabled={enviando}
      />
      <div className="grid gap-x-2 sm:grid-cols-2">
        <TextField label="Latitude" inputMode="decimal" placeholder="-25.4284" value={c.latitude} onChange={(e) => campo('latitude', e.target.value)} error={erros.latitude} disabled={enviando} />
        <TextField label="Longitude" inputMode="decimal" placeholder="-49.2733" value={c.longitude} onChange={(e) => campo('longitude', e.target.value)} error={erros.longitude} disabled={enviando} />
      </div>
      <p className="px-1 text-caption text-muted">A localização define a distância exibida aos doadores.</p>

      {!hospital && (
        <fieldset className="mt-2 flex flex-col gap-2.5 border-t border-line pt-4">
          <legend className="float-left mb-1 w-full text-label font-semibold text-ink">Representante</legend>
          <RepresentanteCampos valor={rep} erros={errosRep} desabilitado={enviando} onChange={setRep} />
        </fieldset>
      )}

      <Button type="submit" loading={enviando}>
        {hospital ? 'Salvar' : 'Cadastrar hospital'}
      </Button>
    </form>
  )
}
