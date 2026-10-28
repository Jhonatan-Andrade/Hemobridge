import { useId, type InputHTMLAttributes, type ReactNode } from 'react'

// Figma: Consent (3:200) — checkbox de aceite de termo.
type ConsentProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { children: ReactNode; error?: string }

export function Consent({ children, error, id, ...props }: ConsentProps) {
  const autoId = useId()
  const campoId = id ?? autoId
  return (
    <div className="flex flex-col gap-1 p-1">
      <div className="flex items-start gap-2">
        <input
          id={campoId}
          type="checkbox"
          className="mt-0.5 size-5 shrink-0 accent-brand"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${campoId}-msg` : undefined}
          {...props}
        />
        <label htmlFor={campoId} className="text-caption text-ink">
          {children}
        </label>
      </div>
      {error && (
        <p id={`${campoId}-msg`} className="text-caption text-error">
          {error}
        </p>
      )}
    </div>
  )
}
