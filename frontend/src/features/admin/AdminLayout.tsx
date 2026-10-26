import type { ReactNode } from 'react'
import { AppShell } from '../../components/layout/AppShell'
import { navAdmin } from '../auth/navegacao'
import { SairButton } from '../auth/SairButton'

export function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell nav={navAdmin} contexto="Administrador da plataforma" acoes={<SairButton />}>
      <div className="mx-auto flex w-full max-w-page flex-col gap-6">{children}</div>
    </AppShell>
  )
}
