import { useNavigate } from 'react-router-dom'
import { useAuth } from './authState'

/** Ação de sair exibida no cabeçalho das áreas logadas. */
export function SairButton() {
  const { sair } = useAuth()
  const navigate = useNavigate()
  return (
    <button
      type="button"
      onClick={() => sair().then(() => navigate('/entrar', { replace: true }))}
      className="h-11 rounded-pill border border-input bg-surface px-4 text-label font-semibold text-ink hover:bg-background"
    >
      Sair
    </button>
  )
}
