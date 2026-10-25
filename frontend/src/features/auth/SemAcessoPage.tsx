import { useNavigate } from 'react-router-dom'
import { PageTitle } from '../../components/layout/AppShell'
import { Button, Card } from '../../components/ui'
import { useAuth } from './authState'
import { PublicLayout } from './PublicLayout'

/** Médicos e administradores ainda não têm área neste frontend. */
export function SemAcessoPage() {
  const { usuario, sair } = useAuth()
  const navigate = useNavigate()
  return (
    <PublicLayout>
      <PageTitle titulo={`Olá, ${usuario?.nome.split(' ')[0] ?? ''}`} />
      <Card title="Área ainda não disponível">
        Esta versão do HemoBridge atende doadores e representantes de hospital. A área do seu perfil será liberada em breve.
      </Card>
      <Button kind="secondary" block onClick={() => sair().then(() => navigate('/entrar'))}>
        Sair
      </Button>
    </PublicLayout>
  )
}
