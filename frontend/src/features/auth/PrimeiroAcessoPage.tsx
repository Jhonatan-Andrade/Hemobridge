import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { mensagemDeErro } from '../../api/client'
import type { Termo } from '../../api/types'
import { PageTitle } from '../../components/layout/AppShell'
import { Button, Consent, Loading, Message, TextField } from '../../components/ui'
import { erroConfirmacao, erroSenha, temErros, type Erros } from '../../lib/validacao'
import { authService } from '../../services/auth'
import { rotaInicial, useAuth } from './authState'
import { PublicLayout } from './PublicLayout'

type Campos = { novaSenha: string; confirmacaoSenha: string; aceiteTermo: boolean }

// Figma: Web desktop / Acesso e orientações / Profissional / Primeiro acesso (8:2318).
// A equipe dos hemocentros e os administradores recebem senha provisória e precisam defini-la antes de usar o sistema.
export function PrimeiroAcessoPage() {
  const { aplicarSessao, sair } = useAuth()
  const navigate = useNavigate()
  const [termo, setTermo] = useState<Termo | null>(null)
  const [erroTermo, setErroTermo] = useState<string[]>([])
  const [c, setC] = useState<Campos>({ novaSenha: '', confirmacaoSenha: '', aceiteTermo: false })
  const [erros, setErros] = useState<Erros<Campos>>({})
  const [falha, setFalha] = useState<string[]>([])
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    authService
      .termoPrimeiroAcesso()
      .then(setTermo)
      .catch((e) => setErroTermo(mensagemDeErro(e)))
  }, [])

  async function aoEnviar(e: FormEvent) {
    e.preventDefault()
    const novos: Erros<Campos> = {
      novaSenha: erroSenha(c.novaSenha),
      confirmacaoSenha: erroConfirmacao(c.novaSenha, c.confirmacaoSenha),
      aceiteTermo: !c.aceiteTermo ? 'O aceite do termo de responsabilidade e sigilo é obrigatório.' : undefined,
    }
    setErros(novos)
    if (temErros(novos) || !termo) return
    setEnviando(true)
    setFalha([])
    try {
      const sessao = await authService.definirSenhaPrimeiroAcesso({ ...c, versaoTermo: termo.versao })
      aplicarSessao(sessao)
      navigate(rotaInicial({ ...sessao.usuario, senhaProvisoria: false }), { replace: true })
    } catch (err) {
      setFalha(mensagemDeErro(err))
      setEnviando(false)
    }
  }

  return (
    <PublicLayout>
      <PageTitle peso="medium" titulo="Defina sua senha" descricao="Este é seu primeiro acesso. Troque a senha provisória e aceite o termo de responsabilidade." />
      {erroTermo.length > 0 ? (
        <Message tone="error">
          {erroTermo.map((m) => (
            <p key={m}>! {m}</p>
          ))}
        </Message>
      ) : !termo ? (
        <Loading texto="Carregando termo de responsabilidade…" />
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
          <Message tone="info">
            Termo de responsabilidade e sigilo, versão {termo.versao}: {termo.finalidade}
          </Message>
          <Consent checked={c.aceiteTermo} onChange={(e) => setC({ ...c, aceiteTermo: e.target.checked })} error={erros.aceiteTermo}>
            Li e aceito o termo de responsabilidade e sigilo.
          </Consent>
          <Button type="submit" block loading={enviando}>
            Salvar senha e continuar
          </Button>
        </form>
      )}
      <Button kind="secondary" block onClick={() => sair().then(() => navigate('/entrar'))}>
        Sair
      </Button>
    </PublicLayout>
  )
}
