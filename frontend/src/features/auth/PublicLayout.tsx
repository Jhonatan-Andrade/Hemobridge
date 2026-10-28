import type { ReactNode } from 'react'
import { AppShell } from '../../components/layout/AppShell'
import { navVisitante } from './navVisitante'

const larguras = { form: 'max-w-form', page: 'max-w-page' } as const

/** Telas de acesso: coluna única de 720px (Figma: "Área principal / Auto Layout"). */
export function PublicLayout({ children, largura = 'form' }: { children: ReactNode; largura?: keyof typeof larguras }) {
  return (
    <AppShell nav={navVisitante} contexto="Cuidado, conexão e acompanhamento">
      <div className={`mx-auto flex w-full flex-col gap-5 ${larguras[largura]}`}>{children}</div>
    </AppShell>
  )
}
