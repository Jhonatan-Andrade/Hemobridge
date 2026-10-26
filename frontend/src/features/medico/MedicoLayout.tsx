import type { ReactNode } from 'react'
import { AppShell } from '../../components/layout/AppShell'
import { useAuth } from '../auth/authState'
import { navMedico } from '../auth/navegacao'
import { SairButton } from '../auth/SairButton'

export function MedicoLayout({ children }: { children: ReactNode }) {
  const { usuario } = useAuth()
  return (
    <AppShell nav={navMedico} contexto={`Médico · ${usuario?.hemocentro?.nome ?? ''}`} acoes={<SairButton />}>
      <div className="mx-auto flex w-full max-w-page flex-col gap-6">{children}</div>
    </AppShell>
  )
}
