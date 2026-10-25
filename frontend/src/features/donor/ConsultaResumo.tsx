import type { ReactNode } from 'react'
import type { ConsultaPaciente } from '../../api/types'
import { buttonClasses } from '../../components/ui'
import { formatarDataHora } from '../../lib/formato'
import { formatarHorario } from '../medico/rotulos'

/** RN18: consulta futura do paciente; o link da sala aparece 15 minutos antes. */
export function ConsultaResumo({ consulta: c, children }: { consulta: ConsultaPaciente; children?: ReactNode }) {
  return (
    <section className="flex flex-col gap-2 rounded-card border border-line bg-surface p-4" aria-labelledby={`consulta-${c.id}`}>
      <p className="text-small font-semibold uppercase text-brand">Consulta agendada</p>
      <h3 id={`consulta-${c.id}`} className="text-section font-semibold text-ink">
        {formatarHorario(c.inicio, c.fim)}
      </h3>
      <p className="text-body text-ink">
        {c.medico.nome} · CRM {c.medico.crm}/{c.medico.ufCrm}
      </p>
      <p className="text-body text-muted">
        {c.hospital.nome} · {c.hospital.cidade}/{c.hospital.estado}
      </p>
      {c.linkSala ? (
        <a href={c.linkSala} target="_blank" rel="noopener noreferrer" className={buttonClasses('primary')}>
          Entrar na sala<span className="sr-only"> (abre em nova aba)</span>
        </a>
      ) : (
        <p className="text-body text-ink">O link da sala aparece aqui em {formatarDataHora(c.linkDisponivelEm)}.</p>
      )}
      <p className="text-small text-muted">
        {c.podeCancelar
          ? 'Você pode cancelar ou reagendar até 24 horas antes do horário.'
          : 'Faltam menos de 24 horas: a consulta não pode mais ser cancelada ou reagendada pela plataforma.'}
      </p>
      {children}
    </section>
  )
}
