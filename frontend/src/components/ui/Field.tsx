import { useId, useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react'

// Figma: Field (3:178) — kinds Text, Password, Select e ReadOnly; estados Focus, Error e Disabled.
const control =
  'flex h-12 w-full items-center gap-3 rounded-control border bg-surface px-3 text-body text-ink ' +
  'focus-within:border-2 focus-within:border-info has-disabled:bg-background has-disabled:text-muted'

const borda = (erro?: string) => (erro ? 'border-2 border-error' : 'border-input')

type FieldShellProps = {
  id: string
  label: string
  hint?: string
  error?: string
  children: ReactNode
  className?: string
}

function FieldShell({ id, label, hint, error, children, className = '' }: FieldShellProps) {
  return (
    <div className={`flex flex-col gap-2 p-1 ${className}`}>
      <label htmlFor={id} className="text-label font-medium text-ink">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-msg`} className="text-caption text-error">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-msg`} className="text-caption text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  hint?: string
  error?: string
  containerClassName?: string
}

export function TextField({ label, hint, error, containerClassName, id, type = 'text', ...props }: TextFieldProps) {
  const autoId = useId()
  const campoId = id ?? autoId
  const [mostrar, setMostrar] = useState(false)
  const senha = type === 'password'

  return (
    <FieldShell id={campoId} label={label} hint={hint} error={error} className={containerClassName}>
      <div className={`${control} ${borda(error)}`}>
        <input
          id={campoId}
          type={senha && mostrar ? 'text' : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? `${campoId}-msg` : undefined}
          className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted disabled:cursor-not-allowed"
          {...props}
        />
        {senha && (
          <button
            type="button"
            onClick={() => setMostrar((v) => !v)}
            className="shrink-0 rounded text-caption text-muted hover:text-ink"
            aria-pressed={mostrar}
            aria-label={mostrar ? 'Ocultar senha' : 'Mostrar senha'}
          >
            {mostrar ? 'Ocultar' : 'Mostrar'}
          </button>
        )}
      </div>
    </FieldShell>
  )
}

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string
  hint?: string
  error?: string
  placeholder?: string
  options: readonly { value: string; label: string }[]
  containerClassName?: string
}

export function SelectField({ label, hint, error, placeholder, options, containerClassName, id, ...props }: SelectFieldProps) {
  const autoId = useId()
  const campoId = id ?? autoId
  return (
    <FieldShell id={campoId} label={label} hint={hint} error={error} className={containerClassName}>
      <div className={`${control} ${borda(error)}`}>
        <select
          id={campoId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? `${campoId}-msg` : undefined}
          className="min-w-0 flex-1 bg-transparent outline-none disabled:cursor-not-allowed"
          {...props}
        >
          {placeholder !== undefined && <option value="">{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    </FieldShell>
  )
}

/** Field ReadOnly: valor definido por outra pessoa (ex.: tipo sanguíneo validado pela equipe). */
export function ReadOnlyField({ label, value, hint }: { label: string; value: string; hint?: string }) {
  const id = useId()
  return (
    <FieldShell id={id} label={label} hint={hint}>
      <output id={id} className={`${control} border-input bg-background text-muted`}>
        {value}
      </output>
    </FieldShell>
  )
}
