import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react'

export type Navigate = (route: string, options?: { origin?: 'home' | 'community'; scrollToComments?: boolean; replace?: boolean }) => void

export function RouteLink({ to, navigate, children, ...props }: Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & { to: string; navigate: Navigate; children: ReactNode }) {
  return <a href={`#${to}`} {...props} onClick={(event) => {
    props.onClick?.(event)
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    navigate(to)
  }}>{children}</a>
}

export function ActionButton({ children, variant = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'secondary' | 'destructive' | 'ghost' | '' }) {
  return <button className={`button ${variant}`} type="button" {...props}>{children}</button>
}

const paths: Record<string, ReactNode> = {
  home: <><path d="m3 10 9-7 9 7v10H3z" /><path d="M9 20v-7h6v7" /></>,
  community: <><circle cx="9" cy="8" r="3" /><path d="M2 21v-3a7 7 0 0 1 14 0v3M17 5a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 5v2" /></>,
  profile: <><circle cx="12" cy="8" r="4" /><path d="M4 21v-2a8 8 0 0 1 16 0v2" /></>,
  dashboard: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
  accessibility: <><circle cx="12" cy="4" r="2" /><path d="M3 8h18M12 8v13m0-8-5 8m5-8 5 8" /></>,
  register: <><path d="M7 4h11a2 2 0 0 1 2 2v14H7a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3zM8 9h8M8 13h5" /><path d="M20 20H7a3 3 0 0 1 0-6" /></>,
  help: <><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.7 2.7 0 0 1 5.1 1.2c0 1.7-2.6 2.1-2.6 4M12 17.5h.01" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4m10-4v4M3 10h18" /></>,
  activity: <path d="M2 12h5l2-5 4 10 2-5h7" />,
  exams: <><path d="M7 3h8l4 4v14H5V5a2 2 0 0 1 2-2zM15 3v5h5M8 13h8M8 17h6" /></>,
  map: <><path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2zM9 3v16m6-14v16" /><circle cx="15" cy="10" r="1.5" /></>,
  heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z" />,
  comment: <path d="M21 11a9 9 0 0 1-9 9 10 10 0 0 1-4-.8L3 21l1.8-5A9 9 0 1 1 21 11z" />,
  back: <path d="m14 5-7 7 7 7M7 12h14" />,
}

export function Icon({ name, filled = false }: { name: keyof typeof paths; filled?: boolean }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}

export function Alert({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'error' | 'success' | 'warning' }) {
  return <div className={`alert ${tone}`} role={tone === 'error' ? 'alert' : 'status'}><span className="mark" aria-hidden="true">{tone === 'error' ? '!' : tone === 'success' ? '✓' : 'i'}</span><div>{children}</div></div>
}

export function Intro({ title, description }: { title: string; description: string }) {
  return <div className="intro"><span className="eyebrow">HemoBridge</span><h1 tabIndex={-1}>{title}</h1><p className="muted">{description}</p></div>
}

export function BrandLogo({ navigate, symbolOnly = false }: { navigate: Navigate; symbolOnly?: boolean }) {
  return <RouteLink to="home" navigate={navigate} className={`home-logo${symbolOnly ? ' home-logo--symbol' : ''}`} aria-label="HemoBridge · página inicial"><img className="logo" src={symbolOnly ? '/hemobridge/simbolo-1024.png' : '/hemobridge/logo-horizontal.png'} alt="" /></RouteLink>
}
