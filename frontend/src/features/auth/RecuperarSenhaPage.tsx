import { useState, type FormEvent } from 'react'
import { mensagemDeErro } from '../../api/client'
import { PageTitle } from '../../components/layout/AppShell'
import { Button, ButtonLink, Message, TextField } from '../../components/ui'
import { emailValido } from '../../lib/validacao'
import { authService } from '../../services/auth'
import { PublicLayout } from './PublicLayout'

// Figma: Web desktop / Acesso e orientações / Senha / Recuperar (8:2205) e Confirmação neutra (8:2222).
export function RecuperarSenhaPage() {
  const [email, setEmail] = useState('')
  const [erro, setErro] = useState<string>()
  const [falha, setFalha] = useState<string[]>([])
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)

  async function aoEnviar(e: FormEvent) {
    e.preventDefault()
    const msg = !email ? 'Informe o e-mail.' : !emailValido(email) ? 'Informe um e-mail válido.' : undefined
    setErro(msg)
    if (msg) return
    setEnviando(true)
    setFalha([])
    try {
      await authService.recuperarSenha(email)
      setEnviado(true)
    } catch (err) {
      setFalha(mensagemDeErro(err))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <PublicLayout>
      <PageTitle peso="medium" titulo="Recuperar senha" descricao="Informe o e-mail da sua conta para receber as instruções." />
      {enviado ? (
        // Resposta neutra: não revela se a conta existe (RN14).
        <Message tone="success">Se houver uma conta com este e-mail, você receberá as instruções em instantes.</Message>
      ) : (
        <form noValidate onSubmit={aoEnviar} className="flex flex-col gap-5">
          {falha.length > 0 && (
            <Message tone="error">
              {falha.map((m) => (
                <p key={m}>! {m}</p>
              ))}
            </Message>
          )}
          <TextField label="E-mail" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={erro} disabled={enviando} />
          <Button type="submit" block loading={enviando}>
            Enviar instruções
          </Button>
        </form>
      )}
      <ButtonLink to="/entrar" kind="secondary" block>
        Voltar para entrar
      </ButtonLink>
    </PublicLayout>
  )
}
