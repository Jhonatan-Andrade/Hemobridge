import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { mensagemDeErro } from '../../api/client'
import { PageTitle } from '../../components/layout/AppShell'
import { Button, ButtonLink, Message, TextField } from '../../components/ui'
import { emailValido, type Erros } from '../../lib/validacao'
import { rotaInicial, useAuth } from './authState'
import { PublicLayout } from './PublicLayout'

type Campos = { email: string; senha: string }

// Figma: Web desktop / Acesso e orientações / Entrar (8:1584, 8:1636 erro, 8:1720 carregando).
export function LoginPage() {
  const { entrar } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [campos, setCampos] = useState<Campos>({ email: '', senha: '' })
  const [erros, setErros] = useState<Erros<Campos>>({})
  const [falha, setFalha] = useState<string[]>([])
  const [enviando, setEnviando] = useState(false)

  async function aoEnviar(e: FormEvent) {
    e.preventDefault()
    const novos: Erros<Campos> = {
      email: !campos.email ? 'Informe o e-mail.' : !emailValido(campos.email) ? 'Informe um e-mail válido.' : undefined,
      senha: !campos.senha ? 'Informe a senha.' : undefined,
    }
    setErros(novos)
    if (novos.email || novos.senha) return

    setEnviando(true)
    setFalha([])
    try {
      const sessao = await entrar(campos.email, campos.senha)
      const destino = (location.state as { de?: string } | null)?.de
      const usuario = { ...sessao.usuario, senhaProvisoria: sessao.primeiroAcesso }
      navigate(destino && !usuario.senhaProvisoria ? destino : rotaInicial(usuario), { replace: true })
    } catch (erro) {
      setFalha(mensagemDeErro(erro))
      setEnviando(false)
    }
  }

  return (
    <PublicLayout>
      <PageTitle peso="medium" titulo="Entrar no HemoBridge" descricao="Use seu e-mail e senha. Não é necessário selecionar um perfil." />
      {falha.length > 0 && (
        <Message tone="error">
          {falha.map((m) => (
            <p key={m}>! {m}</p>
          ))}
        </Message>
      )}
      <form noValidate onSubmit={aoEnviar} className="flex flex-col gap-5">
        <TextField
          label="E-mail"
          type="email"
          autoComplete="email"
          value={campos.email}
          onChange={(e) => setCampos({ ...campos, email: e.target.value })}
          error={erros.email}
          disabled={enviando}
        />
        <TextField
          label="Senha"
          type="password"
          autoComplete="current-password"
          value={campos.senha}
          onChange={(e) => setCampos({ ...campos, senha: e.target.value })}
          error={erros.senha}
          disabled={enviando}
        />
        <ButtonLink to="/recuperar-senha" kind="secondary" block>
          Esqueci minha senha
        </ButtonLink>
        <Button type="submit" block loading={enviando}>
          Entrar
        </Button>
        <ButtonLink to="/cadastro" kind="secondary" block>
          Criar pré-cadastro
        </ButtonLink>
      </form>
    </PublicLayout>
  )
}
