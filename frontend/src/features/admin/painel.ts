/** Leva o foco (e a rolagem, no mobile) ao título do painel lateral após escolher um registro. */
export function focarPainel() {
  requestAnimationFrame(() => {
    const titulo = document.getElementById('painel-admin')
    titulo?.focus({ preventScroll: true })
    titulo?.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  })
}
