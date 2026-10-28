import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { mensagemDeErro } from '../../api/client'
import { Button, Message, Panel, TextField } from '../../components/ui'
import { pacienteService } from '../../services/paciente'
import { useAuth } from '../auth/authState'

/**
 * RF16 – Solicitação de exclusão dos dados (LGPD). Os dados pessoais são anonimizados e a conta
 * encerrada; os registros de doação ficam guardados sem identificação, por exigência legal.
 */
export function ExclusaoDados() {
  const { sair } = useAuth()
  const navigate = useNavigate()
  const [aberto, setAberto] = useState(false)
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string>()
  const [falha, setFalha] = useState<string[]>([])
  const [enviando, setEnviando] = useState(false)

  async function aoEnviar(e: FormEvent) {
    e.preventDefault()
    if (!senha) return setErro('Informe sua senha para confirmar.')
    setErro(undefined)
    setEnviando(true)
    setFalha([])
    try {
      const { mensagem } = await pacienteService.excluirDados(senha)
      // A sessão já foi encerrada no servidor: sai da área logada antes de limpar o estado local,
      // senão a rota protegida redireciona primeiro e o aviso se perde.
      navigate('/', { replace: true, state: { aviso: mensagem } })
      await sair()
    } catch (err) {
      setFalha(mensagemDeErro(err))
      setEnviando(false)
    }
  }

  return (
    <Panel>
      <h2 className="text-section font-semibold text-ink">Privacidade</h2>
      <p className="text-small text-muted">
        Você pode pedir a exclusão dos seus dados pessoais. Os agendamentos ativos são cancelados e a conta é encerrada. Os registros de doação
        continuam guardados sem seu nome, CPF ou contato, como exige a legislação sanitária.
      </p>
      {!aberto ? (
        <Button kind="secondary" onClick={() => setAberto(true)}>
          Excluir meus dados
        </Button>
      ) : (
        <form noValidate onSubmit={aoEnviar} className="flex flex-col gap-3">
          <Message tone="warning">
            <p>Esta ação não pode ser desfeita.</p>
          </Message>
          {falha.length > 0 && (
            <Message tone="error">
              {falha.map((m) => (
                <p key={m}>! {m}</p>
              ))}
            </Message>
          )}
          <TextField
            label="Sua senha"
            type="password"
            autoComplete="current-password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            error={erro}
            disabled={enviando}
          />
          <Button type="submit" kind="destructive" loading={enviando}>
            Confirmar exclusão
          </Button>
          <Button kind="secondary" disabled={enviando} onClick={() => setAberto(false)}>
            Cancelar
          </Button>
        </form>
      )}
    </Panel>
  )
}
