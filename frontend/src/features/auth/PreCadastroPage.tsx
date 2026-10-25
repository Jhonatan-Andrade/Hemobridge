import { useEffect, useState, type FormEvent } from 'react'
import { mensagemDeErro } from '../../api/client'
import type { PreCadastroCriado, Sexo, Termo } from '../../api/types'
import { PageTitle } from '../../components/layout/AppShell'
import { Button, ButtonLink, Card, Consent, Message, SelectField, TextField } from '../../components/ui'
import { calcularIdade, mascaraCpf, mascaraTelefone, somenteDigitos, UFS } from '../../lib/formato'
import { cpfValido, emailValido, erroConfirmacao, erroDataNascimento, erroSenha, temErros, type Erros } from '../../lib/validacao'
import { authService } from '../../services/auth'
import { PublicLayout } from './PublicLayout'

type Campos = {
  nome: string
  cpf: string
  email: string
  senha: string
  confirmacaoSenha: string
  telefone: string
  dataNascimento: string
  sexo: '' | Sexo
  pesoKg: string
  estado: string
  cidade: string
  aceiteTermo: boolean
  cienteRegraAcimaDe60: boolean
}

const vazio: Campos = {
  nome: '',
  cpf: '',
  email: '',
  senha: '',
  confirmacaoSenha: '',
  telefone: '',
  dataNascimento: '',
  sexo: '',
  pesoKg: '',
  estado: '',
  cidade: '',
  aceiteTermo: false,
  cienteRegraAcimaDe60: false,
}

const SEXOS = [
  { value: 'FEMININO', label: 'Feminino' },
  { value: 'MASCULINO', label: 'Masculino' },
] as const

function validar(c: Campos): Erros<Campos> {
  const peso = Number(c.pesoKg.replace(',', '.'))
  const idade = c.dataNascimento ? calcularIdade(c.dataNascimento) : null
  return {
    nome: c.nome.trim().length < 3 ? 'Informe o nome completo (mínimo de 3 caracteres).' : undefined,
    cpf: !c.cpf ? 'Informe o CPF.' : !cpfValido(c.cpf) ? 'CPF inválido. Confira os números.' : undefined,
    email: !c.email ? 'Informe o e-mail.' : !emailValido(c.email) ? 'Informe um e-mail válido.' : undefined,
    senha: erroSenha(c.senha),
    confirmacaoSenha: erroConfirmacao(c.senha, c.confirmacaoSenha),
    telefone: !/^\d{10,11}$/.test(somenteDigitos(c.telefone)) ? 'Informe o telefone com DDD.' : undefined,
    dataNascimento: erroDataNascimento(c.dataNascimento),
    sexo: !c.sexo ? 'Selecione uma opção.' : undefined,
    pesoKg: !c.pesoKg || Number.isNaN(peso) ? 'Informe o peso.' : peso < 50 ? 'O peso mínimo para doar é 50 kg.' : undefined,
    estado: !c.estado ? 'Selecione o estado.' : undefined,
    cidade: c.cidade.trim().length < 2 ? 'Informe o município.' : undefined,
    aceiteTermo: !c.aceiteTermo ? 'O aceite do termo de consentimento é obrigatório.' : undefined,
    cienteRegraAcimaDe60:
      idade !== null && idade > 60 && !c.cienteRegraAcimaDe60 ? 'Confirme que está ciente da regra para quem tem mais de 60 anos.' : undefined,
  }
}

// Figma: Web desktop / Acesso e orientações / Pré-cadastro (8:1257 inicial, 8:1413 erro, 8:1493 carregando, 8:1571 confirmação).
export function PreCadastroPage() {
  const [c, setC] = useState<Campos>(vazio)
  const [erros, setErros] = useState<Erros<Campos>>({})
  const [falha, setFalha] = useState<string[]>([])
  const [enviando, setEnviando] = useState(false)
  const [termo, setTermo] = useState<Termo | null>(null)
  const [criado, setCriado] = useState<PreCadastroCriado | null>(null)

  useEffect(() => {
    authService.termoConsentimento().then(setTermo).catch(() => setTermo(null))
  }, [])

  const set = <K extends keyof Campos>(campo: K, valor: Campos[K]) => setC((atual) => ({ ...atual, [campo]: valor }))
  const idade = c.dataNascimento ? calcularIdade(c.dataNascimento) : null

  async function aoEnviar(e: FormEvent) {
    e.preventDefault()
    const novos = validar(c)
    setErros(novos)
    if (temErros(novos)) {
      setFalha(['Revise os campos destacados.'])
      return
    }
    if (!termo) {
      setFalha(['Não foi possível carregar o termo de consentimento. Recarregue a página e tente novamente.'])
      return
    }
    setEnviando(true)
    setFalha([])
    try {
      const resposta = await authService.preCadastrar({
        nome: c.nome,
        cpf: somenteDigitos(c.cpf),
        email: c.email,
        senha: c.senha,
        confirmacaoSenha: c.confirmacaoSenha,
        telefone: somenteDigitos(c.telefone),
        dataNascimento: c.dataNascimento,
        sexo: c.sexo as Sexo,
        pesoKg: Number(c.pesoKg.replace(',', '.')),
        estado: c.estado,
        cidade: c.cidade,
        aceiteTermo: c.aceiteTermo,
        versaoTermo: termo.versao,
        cienteRegraAcimaDe60: idade !== null && idade > 60 ? c.cienteRegraAcimaDe60 : undefined,
      })
      setCriado(resposta)
    } catch (erro) {
      setFalha(mensagemDeErro(erro))
    } finally {
      setEnviando(false)
    }
  }

  if (criado) {
    return (
      <PublicLayout>
        <PageTitle peso="medium" titulo="Pré-cadastro concluído" descricao={`Olá, ${criado.nome.split(' ')[0]}. Seu acompanhamento começou.`} />
        <Card kind="situation" title="Próximo passo">
          Entre com seu e-mail e senha para acompanhar as etapas até a aprovação como doador.
        </Card>
        <ButtonLink to="/entrar" block>
          Entrar
        </ButtonLink>
      </PublicLayout>
    )
  }

  return (
    <PublicLayout>
      <PageTitle peso="medium" titulo="Crie seu pré-cadastro" descricao="Conte um pouco sobre você para iniciar seu acompanhamento." />
      {falha.length > 0 && (
        <Message tone="error">
          {falha.map((m) => (
            <p key={m}>! {m}</p>
          ))}
        </Message>
      )}
      <form noValidate onSubmit={aoEnviar} className="flex flex-col gap-5">
        <fieldset disabled={enviando} className="grid gap-4 sm:grid-cols-2">
          <legend className="sr-only">Dados pessoais</legend>
          <TextField label="Nome completo" hint="Conforme seu documento" autoComplete="name" value={c.nome} onChange={(e) => set('nome', e.target.value)} error={erros.nome} />
          <TextField label="CPF" hint="Informe os números do seu CPF" inputMode="numeric" value={c.cpf} onChange={(e) => set('cpf', mascaraCpf(e.target.value))} error={erros.cpf} />
          <TextField label="E-mail" hint="Será usado para entrar" type="email" autoComplete="email" value={c.email} onChange={(e) => set('email', e.target.value)} error={erros.email} />
          <TextField label="Senha" hint="8–128 caracteres; maiúscula, minúscula e número" type="password" autoComplete="new-password" value={c.senha} onChange={(e) => set('senha', e.target.value)} error={erros.senha} />
          <TextField label="Confirmar senha" hint="Repita a senha" type="password" autoComplete="new-password" value={c.confirmacaoSenha} onChange={(e) => set('confirmacaoSenha', e.target.value)} error={erros.confirmacaoSenha} />
          <TextField label="Telefone" hint="Com DDD" type="tel" autoComplete="tel" value={c.telefone} onChange={(e) => set('telefone', mascaraTelefone(e.target.value))} error={erros.telefone} />
          <TextField label="Data de nascimento" hint="Idade de 16 a 69 anos" type="date" value={c.dataNascimento} onChange={(e) => set('dataNascimento', e.target.value)} error={erros.dataNascimento} />
          <SelectField label="Sexo" placeholder="Selecione" options={SEXOS} value={c.sexo} onChange={(e) => set('sexo', e.target.value as Campos['sexo'])} error={erros.sexo} />
          <TextField label="Peso (kg)" hint="Mínimo de 50 kg" inputMode="decimal" value={c.pesoKg} onChange={(e) => set('pesoKg', e.target.value)} error={erros.pesoKg} />
          <SelectField
            label="Estado"
            hint="Estados do Brasil"
            placeholder="Selecione o estado"
            options={UFS.map((uf) => ({ value: uf, label: uf }))}
            value={c.estado}
            onChange={(e) => set('estado', e.target.value)}
            error={erros.estado}
          />
          <TextField
            label="Município"
            hint={c.estado ? 'Município do estado selecionado' : 'Escolha primeiro o estado'}
            autoComplete="address-level2"
            disabled={!c.estado}
            value={c.cidade}
            onChange={(e) => set('cidade', e.target.value)}
            error={erros.cidade}
          />
        </fieldset>
        <Message tone="info">
          Acima de 60 anos, é necessário ter doado antes dos 60. Entre 16 e 17 anos, a triagem exige autorização do responsável.
        </Message>
        {idade !== null && idade > 60 && (
          <Consent checked={c.cienteRegraAcimaDe60} onChange={(e) => set('cienteRegraAcimaDe60', e.target.checked)} error={erros.cienteRegraAcimaDe60}>
            Estou ciente de que, acima de 60 anos, só posso doar se já tiver doado antes dos 60.
          </Consent>
        )}
        <Consent checked={c.aceiteTermo} onChange={(e) => set('aceiteTermo', e.target.checked)} error={erros.aceiteTermo}>
          Li e aceito o Termo de Consentimento para tratar meus dados de saúde.
        </Consent>
        {termo && (
          <details className="rounded-control border border-line bg-surface p-4 text-body text-muted">
            <summary className="cursor-pointer font-semibold text-ink">Ler consentimento e privacidade</summary>
            <p className="mt-2">
              Termo versão {termo.versao}. Finalidade: {termo.finalidade}.
            </p>
          </details>
        )}
        <Button type="submit" block loading={enviando}>
          Criar pré-cadastro
        </Button>
        <ButtonLink to="/entrar" kind="secondary" block>
          Já tenho conta · Entrar
        </ButtonLink>
      </form>
    </PublicLayout>
  )
}
