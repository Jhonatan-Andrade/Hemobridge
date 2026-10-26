import { useState, type FormEvent } from 'react'
import { mensagemDeErro } from '../../api/client'
import type { CadastroCriado } from '../../api/types'
import { PageTitle } from '../../components/layout/AppShell'
import { Button, ButtonLink, Card, Consent, ErrorState, Loading, Message, TextField } from '../../components/ui'
import { mascaraCpf, mascaraTelefone, somenteDigitos } from '../../lib/formato'
import { useAsync } from '../../lib/useAsync'
import { cpfValido, emailValido, erroConfirmacao, erroDataNascimento, erroSenha, telefoneValido, temErros, type Erros } from '../../lib/validacao'
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
  aceiteTermo: boolean
}

const vazio: Campos = {
  nome: '',
  cpf: '',
  email: '',
  senha: '',
  confirmacaoSenha: '',
  telefone: '',
  dataNascimento: '',
  aceiteTermo: false,
}

function validar(c: Campos): Erros<Campos> {
  return {
    nome: c.nome.trim().length < 3 ? 'Informe o nome completo (mínimo de 3 caracteres).' : undefined,
    cpf: !c.cpf ? 'Informe o CPF.' : !cpfValido(c.cpf) ? 'CPF inválido. Confira os números.' : undefined,
    email: !c.email ? 'Informe o e-mail.' : !emailValido(c.email) ? 'Informe um e-mail válido.' : undefined,
    senha: erroSenha(c.senha),
    confirmacaoSenha: erroConfirmacao(c.senha, c.confirmacaoSenha),
    telefone: !telefoneValido(c.telefone) ? 'Informe o telefone com DDD.' : undefined,
    dataNascimento: erroDataNascimento(c.dataNascimento),
    aceiteTermo: !c.aceiteTermo ? 'O aceite do termo de consentimento é obrigatório.' : undefined,
  }
}

// RF01 – Cadastro do paciente com consentimento LGPD (inclui o compartilhamento entre hemocentros).
// Figma: Web desktop / Acesso e orientações / Pré-cadastro (8:1257 inicial, 8:1413 erro, 8:1493 carregando).
export function CadastroPage() {
  const termo = useAsync(() => authService.termoConsentimento(), [])
  const [c, setC] = useState<Campos>(vazio)
  const [erros, setErros] = useState<Erros<Campos>>({})
  const [falha, setFalha] = useState<string[]>([])
  const [enviando, setEnviando] = useState(false)
  const [criado, setCriado] = useState<CadastroCriado | null>(null)

  const set = <K extends keyof Campos>(campo: K, valor: Campos[K]) => setC((atual) => ({ ...atual, [campo]: valor }))

  async function aoEnviar(e: FormEvent) {
    e.preventDefault()
    const novos = validar(c)
    setErros(novos)
    if (temErros(novos)) {
      setFalha(['Revise os campos destacados.'])
      return
    }
    if (!termo.dados) return
    setEnviando(true)
    setFalha([])
    try {
      setCriado(
        await authService.cadastrar({
          ...c,
          nome: c.nome.trim(),
          cpf: somenteDigitos(c.cpf),
          email: c.email.trim(),
          telefone: somenteDigitos(c.telefone),
          versaoTermo: termo.dados.versao,
        }),
      )
    } catch (erro) {
      setFalha(mensagemDeErro(erro))
    } finally {
      setEnviando(false)
    }
  }

  if (criado) {
    return (
      <PublicLayout>
        <PageTitle peso="medium" titulo="Conta criada" descricao={`Olá, ${criado.nome.split(' ')[0]}. Sua conta está pendente até a primeira doação.`} />
        <Card kind="situation" title="Próximo passo">
          Entre com seu e-mail e senha, escolha um hemocentro em Doar e agende um horário com vaga.
        </Card>
        <ButtonLink to="/entrar" block>
          Entrar
        </ButtonLink>
      </PublicLayout>
    )
  }

  return (
    <PublicLayout>
      <PageTitle peso="medium" titulo="Crie sua conta" descricao="Com a conta você agenda doações nos hemocentros parceiros e acompanha seu histórico." />
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
          <TextField label="Telefone" hint="Com DDD" type="tel" autoComplete="tel" value={c.telefone} onChange={(e) => set('telefone', mascaraTelefone(e.target.value))} error={erros.telefone} />
          <TextField label="Data de nascimento" type="date" autoComplete="bday" value={c.dataNascimento} onChange={(e) => set('dataNascimento', e.target.value)} error={erros.dataNascimento} />
          <span aria-hidden="true" className="hidden sm:block" />
          <TextField label="Senha" hint="8–128 caracteres; maiúscula, minúscula e número" type="password" autoComplete="new-password" value={c.senha} onChange={(e) => set('senha', e.target.value)} error={erros.senha} />
          <TextField label="Confirmar senha" hint="Repita a senha" type="password" autoComplete="new-password" value={c.confirmacaoSenha} onChange={(e) => set('confirmacaoSenha', e.target.value)} error={erros.confirmacaoSenha} />
        </fieldset>

        <section aria-labelledby="termo-titulo" className="flex flex-col gap-3 rounded-control border border-line bg-surface p-4">
          <h2 id="termo-titulo" className="text-label font-semibold text-ink">
            Termo de consentimento (LGPD){termo.dados && ` · versão ${termo.dados.versao}`}
          </h2>
          {termo.carregando ? (
            <Loading texto="Carregando o termo…" />
          ) : termo.erro || !termo.dados ? (
            <ErrorState mensagens={termo.erro ?? ['Não foi possível carregar o termo.']} onRetry={termo.recarregar} />
          ) : (
            termo.dados.texto.map((paragrafo) => (
              <p key={paragrafo} className="text-small text-muted">
                {paragrafo}
              </p>
            ))
          )}
        </section>
        <Consent checked={c.aceiteTermo} onChange={(e) => set('aceiteTermo', e.target.checked)} error={erros.aceiteTermo} disabled={enviando}>
          Li e aceito o termo de consentimento, inclusive o compartilhamento do meu histórico de doações entre os hemocentros onde eu agendar.
        </Consent>
        <Button type="submit" block loading={enviando} disabled={!termo.dados}>
          Criar conta
        </Button>
        <ButtonLink to="/entrar" kind="secondary" block>
          Já tenho conta · Entrar
        </ButtonLink>
      </form>
    </PublicLayout>
  )
}
