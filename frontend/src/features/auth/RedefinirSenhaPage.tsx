import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { mensagemDeErro } from '../../api/client'
import { PageTitle } from '../../components/layout/AppShell'
import { Button, ButtonLink, Message, TextField } from '../../components/ui'
import { erroConfirmacao, erroSenha, temErros, type Erros } from '../../lib/validacao'
import { authService } from '../../services/auth'
import { useAuth } from './authState'
import { PublicLayout } from './PublicLayout'

type Campos = { novaSenha: string; confirmacaoSenha: string }

// Destino do link enviado por e-mail na recuperação de senha (UC06): /redefinir-senha?token=…
export function RedefinirSenhaPage() {
  const { usuario, sair } = useAuth()
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const [c, setC] = useState<Campos>({ novaSenha: '', confirmacaoSenha: '' })
  const [erros, setErros] = useState<Erros<Campos>>({})
  const [falha, setFalha] = useState<string[]>([])
  const [enviando, setEnviando] = useState(false)
  const [concluido, setConcluido] = useState(false)

  async function aoEnviar(e: FormEvent) {
    e.preventDefault()
    const novos: Erros<Campos> = {
      novaSenha: erroSenha(c.novaSenha),
      confirmacaoSenha: erroConfirmacao(c.novaSenha, c.confirmacaoSenha),
    }
    setErros(novos)
    if (temErros(novos)) return
    setEnviando(true)
    setFalha([])
    try {
      await authService.redefinirSenha({ token, ...c })
      // O backend encerra as sessões da conta; a sessão local também precisa sair para o login abrir.
      if (usuario) await sair()
      setConcluido(true)
    } catch (err) {
      setFalha(mensagemDeErro(err))
    } finally {
      setEnviando(false)
    }
  }

  if (concluido) {
    return (
      <PublicLayout>
        <PageTitle peso="medium" titulo="Senha redefinida" descricao="Sua nova senha já está valendo." />
        <Message tone="success">Senha redefinida com sucesso. Entre com a nova senha.</Message>
        <ButtonLink to="/entrar" block>
          Entrar
        </ButtonLink>
      </PublicLayout>
    )
  }

  return (
    <PublicLayout>
      <PageTitle peso="medium" titulo="Redefinir senha" descricao="Crie uma nova senha para a sua conta." />
      {!token ? (
        <Message tone="error">
          <p>! Este link de redefinição está incompleto. Abra novamente o link do e-mail ou solicite um novo.</p>
        </Message>
      ) : (
        <form noValidate onSubmit={aoEnviar} className="flex flex-col gap-5">
          {falha.length > 0 && (
            <Message tone="error">
              {falha.map((m) => (
                <p key={m}>! {m}</p>
              ))}
            </Message>
          )}
          <TextField label="Nova senha" hint="8–128 caracteres; maiúscula, minúscula e número" type="password" autoComplete="new-password" value={c.novaSenha} onChange={(e) => setC({ ...c, novaSenha: e.target.value })} error={erros.novaSenha} disabled={enviando} />
          <TextField label="Confirmar nova senha" hint="Repita a senha" type="password" autoComplete="new-password" value={c.confirmacaoSenha} onChange={(e) => setC({ ...c, confirmacaoSenha: e.target.value })} error={erros.confirmacaoSenha} disabled={enviando} />
          <Button type="submit" block loading={enviando}>
            Salvar nova senha
          </Button>
        </form>
      )}
      <ButtonLink to="/recuperar-senha" kind="secondary" block>
        Solicitar novo link
      </ButtonLink>
    </PublicLayout>
  )
}
