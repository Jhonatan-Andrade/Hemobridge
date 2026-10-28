import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import { buttonClasses, type Kind } from './buttonStyles'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  kind?: Kind
  block?: boolean
  loading?: boolean
  children: ReactNode
}

export function Button({ kind = 'primary', block, loading, disabled, children, className = '', type = 'button', ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClasses(kind, block, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? 'Carregando…' : children}
    </button>
  )
}

type ButtonLinkProps = LinkProps & { kind?: Kind; block?: boolean }

export function ButtonLink({ kind = 'primary', block, className = '', ...props }: ButtonLinkProps) {
  return <Link className={buttonClasses(kind, block, className)} {...props} />
}
