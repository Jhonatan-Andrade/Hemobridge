import { useLayoutEffect, useRef, useState } from 'react'
import type { SessionUser } from '../types/domain'
import { useResource } from '../services/use-resource'
import { journeyTimings, tourRoleLabels, tourSteps } from '../services/tour-content'

function InstitutionTimes({
  estimates,
}: {
  estimates: ReturnType<typeof journeyTimings>[number]['estimates']
}) {
  const list = (
    <ul>
      {estimates.map((value, index) => (
        <li key={`${value.hospital.nome}-${index}`}>
          {value.hospital.nome}: cerca de {value.minutos.toLocaleString('pt-BR')} min.
          <small>Fonte: {value.fonte}</small>
        </li>
      ))}
    </ul>
  )
  return estimates.length > 1 ? (
    <details>
      <summary>Prazos por instituição ({estimates.length})</summary>
      {list}
    </details>
  ) : (
    list
  )
}

function JourneyTimes() {
  const estimates = useResource<unknown>('/jornada/estimativas')
  return (
    <section className="onboarding-time" aria-label="Tempos das etapas">
      <h3>Tempos das etapas</h3>
      <p>Estimativas variam por unidade e não incluem garantia de horário ou aprovação.</p>
      <ol className="onboarding-phases">
        {journeyTimings(estimates.data).map((item) => (
          <li key={item.stage}>
            <strong>{item.title}</strong>
            <p>{item.text}</p>
            {item.estimates.length ? (
              <InstitutionTimes estimates={item.estimates} />
            ) : (
              <>
                <p>{item.fallback}</p>
                {item.url && (
                  <a href={item.url} target="_blank" rel="noopener noreferrer">
                    {item.source} ↗
                  </a>
                )}
              </>
            )}
          </li>
        ))}
      </ol>
      {estimates.loading && <p role="status">Consultando os prazos das instituições…</p>}
      {estimates.error && (
        <p role="status">
          Os prazos das instituições estão indisponíveis. As orientações gerais continuam
          disponíveis.{' '}
          <button type="button" className="text-button" onClick={estimates.reload}>
            Tentar novamente
          </button>
        </p>
      )}
    </section>
  )
}

export function GuidedTour({
  user,
  mandatory,
  onComplete,
  onClose,
}: {
  user: SessionUser | null
  mandatory: boolean
  onComplete: () => void
  onClose: () => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const opener = useRef<HTMLElement | null>(null)
  const [index, setIndex] = useState(0)
  const steps = tourSteps(user?.perfil)
  const step = steps[index]
  useLayoutEffect(() => {
    const dialog = dialogRef.current
    const previousOverflow = document.body.style.overflow
    opener.current = document.activeElement as HTMLElement
    document.body.style.overflow = 'hidden'
    dialog?.showModal()
    return () => {
      dialog?.close()
      document.body.style.overflow = previousOverflow
      opener.current?.focus()
    }
  }, [])
  useLayoutEffect(() => {
    headingRef.current?.focus()
  }, [index])
  return (
    <dialog
      ref={dialogRef}
      className="onboarding-dialog"
      aria-modal="true"
      aria-labelledby="tour-title"
      aria-describedby="tour-description"
      onCancel={(e) => {
        e.preventDefault()
        if (!mandatory) onClose()
      }}
    >
      <div className="onboarding-body">
        <div className="onboarding-brand">
          <img src="/hemobridge/simbolo-1024.png" width="40" height="40" alt="" />
          <strong>Bem-vindo ao HemoBridge</strong>
        </div>
        {user && <p>{tourRoleLabels[user.perfil]}</p>}
        <p aria-live="polite">
          Etapa {index + 1} de {steps.length}
        </p>
        <progress value={index + 1} max={steps.length} aria-label="Progresso da orientação" />
        <h2 ref={headingRef} tabIndex={-1} id="tour-title">
          {step.title}
        </h2>
        <p id="tour-description">{step.text}</p>
        {step.journey && user && <JourneyTimes />}
      </div>
      <div className="onboarding-footer">
        <div className="actions">
          {index > 0 && (
            <button
              type="button"
              className="button secondary"
              onClick={() => setIndex((v) => v - 1)}
            >
              Voltar
            </button>
          )}
          {index === steps.length - 1 ? (
            <button type="button" className="button" onClick={onComplete}>
              Concluir e acessar
            </button>
          ) : (
            <button type="button" className="button" onClick={() => setIndex((v) => v + 1)}>
              Continuar
            </button>
          )}
          {!mandatory && (
            <button type="button" className="text-button" onClick={onClose}>
              Fechar orientação
            </button>
          )}
        </div>
        {mandatory && (
          <p className="help">
            Conclua esta apresentação para acessar sua área. Você poderá revê-la pelo menu.
          </p>
        )}
      </div>
    </dialog>
  )
}
