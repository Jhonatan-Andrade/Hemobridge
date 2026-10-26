import type { ReactNode } from 'react'
import { useAuth } from '../auth/authState'
import { HemocentroLayout } from '../hemocentro/HemocentroLayout'
import { MedicoLayout } from './MedicoLayout'

/** Telas comuns ao médico e ao Admin do hemocentro, cada um com o menu da sua área. */
export function LayoutEquipe({ children }: { children: ReactNode }) {
  const { usuario } = useAuth()
  return usuario?.papel === 'MEDICO' ? <MedicoLayout>{children}</MedicoLayout> : <HemocentroLayout>{children}</HemocentroLayout>
}
