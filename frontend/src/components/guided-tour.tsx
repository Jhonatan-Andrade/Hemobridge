import { useLayoutEffect, useRef, useState } from 'react'
import type { SessionUser } from '../types/domain'
import { tourRoleLabels, tourSteps } from '../services/tour-content'
import { messageOf } from '../services/api-client'

export function GuidedTour({
  user,
  mandatory,
  onComplete,
  onClose,
  onExit,
}: {
  user: SessionUser
  mandatory: boolean
  onComplete: () => void | Promise<void>
  onClose: () => void
  onExit: () => Promise<void>
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const opener = useRef<HTMLElement | null>(null)
  const [index, setIndex] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  async function finish() {
    if (saving) return
    setSaving(true)
    setError('')
    try {
      await onComplete()
    } catch (error) {
      setError(messageOf(error))
    } finally {
      setSaving(false)
    }
  }
  const steps = tourSteps(user.perfil, user.papel === 'DOADOR')
  const step = steps[index]
  useLayoutEffect(() => {
    const dialog = dialogRef.current
    const previousOverflow = document.body.style.overflow
    opener.current = document.activeElement as HTMLElement
    document.body.style.overflow = 'hidden'
    dialog?.showModal()
    const keepFocusInside = (event: FocusEvent) => {
      if (dialog?.open && !dialog.contains(event.target as Node)) headingRef.current?.focus()
    }
    document.addEventListener('focusin', keepFocusInside)
    return () => {
      document.removeEventListener('focusin', keepFocusInside)
      dialog?.close()
      document.body.style.overflow = previousOverflow
      const target =
        opener.current?.isConnected && opener.current !== document.body
          ? opener.current
          : document.querySelector<HTMLElement>('main h1')
      target?.focus({ preventScroll: true })
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
      onKeyDown={(event) => {
        if (event.key !== 'Tab') return
        const elements = [
          ...event.currentTarget.querySelectorAll<HTMLElement>(
            'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), summary, [tabindex="0"]',
          ),
        ].filter((node) => node.getClientRects().length > 0 && node.tabIndex >= 0)
        event.preventDefault()
        const current = elements.indexOf(document.activeElement as HTMLElement)
        const next = event.shiftKey
          ? current <= 0
            ? elements.length - 1
            : current - 1
          : (current + 1) % elements.length
        if (elements[next]) elements[next].focus()
        else headingRef.current?.focus()
      }}
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
        <section className="onboarding-time" aria-label="Onde encontrar esta função">
          <h3>Onde fica</h3>
          <p>{step.location}</p>
        </section>
        {step.duration && <p className="help">{step.duration}</p>}
        {step.collectionReference && (
          <a href="https://www.hemominas.mg.gov.br/servicos/doar-sangue" target="_blank" rel="noopener noreferrer">Fonte: Hemominas ↗</a>
        )}
      </div>
      <div className="onboarding-footer">
        {error && <p role="alert">{error}</p>}
        <div className="actions">
          {index > 0 && (
            <button
              type="button"
              className="button secondary"
              disabled={saving}
              onClick={() => setIndex((v) => v - 1)}
            >
              Voltar
            </button>
          )}
          {index === steps.length - 1 ? (
            <button
              type="button"
              className="button"
              disabled={saving}
              onClick={() => void finish()}
            >
              {saving ? 'Salvando…' : mandatory ? 'Concluir e acessar' : 'Concluir revisão'}
            </button>
          ) : (
            <button type="button" className="button" disabled={saving} onClick={() => setIndex((v) => v + 1)}>
              Continuar
            </button>
          )}
          {mandatory && (
            <button type="button" className="text-button" disabled={saving} onClick={() => {
              setSaving(true)
              setError('')
              void onExit().catch((error) => setError(messageOf(error))).finally(() => setSaving(false))
            }}>Sair e continuar depois</button>
          )}
          {!mandatory && (
            <button type="button" className="text-button" disabled={saving} onClick={onClose}>
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
