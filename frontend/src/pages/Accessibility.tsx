import type { FontScale } from '../services/accessibilityPreferences'
import { Alert, Intro, RouteLink } from '../components/ui'
import type { Navigate } from '../components/ui'
import './Accessibility.css'

type WidgetState = 'off' | 'loading' | 'ready' | 'error'

export function AccessibilityPage({ navigate, backTo, fontScale, onFontScale, vlibrasAuto, widgetState, widgetError, onVlibras, onTour }: {
  navigate: Navigate
  backTo: string
  fontScale: FontScale
  onFontScale: (value: FontScale) => void
  vlibrasAuto: boolean
  widgetState: WidgetState
  widgetError: string
  onVlibras: (enabled: boolean) => void
  onTour: () => void
}) {
  return <main className="accessibility-page">
      <RouteLink className="back-link" to={backTo} navigate={navigate}>← Voltar</RouteLink>
      <Intro title="Acessibilidade" description="Ajuste a leitura e escolha quando usar recursos externos. Estas preferências não alteram seus dados de saúde." />
      <p className="demo-content-label">Suas preferências de leitura ficam guardadas neste navegador.</p>
      <div className="accessibility-grid">
        <section className="surface accessibility-card" aria-labelledby="font-heading">
          <h2 id="font-heading">Tamanho do texto</h2>
          <p>Escolha o tamanho mais confortável. O zoom do navegador também funciona.</p>
          <fieldset className="font-options"><legend>Tamanho</legend>
            {([100, 125, 150, 200] as FontScale[]).map((value) => <label key={value} className="font-option">
              <input type="radio" name="font-scale" value={value} checked={fontScale === value} onChange={() => onFontScale(value)} />
              <span>{value}%</span>
            </label>)}
          </fieldset>
          <p className="accessibility-preview">Acompanhe cada etapa no seu ritmo.</p>
        </section>
        <section className="surface accessibility-card" aria-labelledby="libras-heading">
          <h2 id="libras-heading">Tradução para Libras</h2>
          <p>O <a href="https://vlibras.gov.br/" target="_blank" rel="noopener noreferrer">VLibras</a> oferece tradução automática de conteúdo em português. Ele não substitui um intérprete humano.</p>
          <p>Ao ativar, o widget oficial é carregado de <strong>vlibras.gov.br</strong>. A preferência permite abri-lo nos próximos acessos, sem deduzir sua necessidade pelo perfil.</p>
          <button className="button" type="button" disabled={widgetState === 'loading'} aria-busy={widgetState === 'loading'} onClick={() => onVlibras(!vlibrasAuto)}>
            {widgetState === 'loading' ? 'Carregando VLibras…' : vlibrasAuto ? 'Desativar VLibras' : 'Ativar VLibras'}
          </button>
          <div className="accessibility-widget-feedback" aria-live="polite">
            {widgetState === 'ready' && <Alert tone="success">VLibras carregado. Use o botão flutuante do tradutor para iniciar a tradução.</Alert>}
            {widgetState === 'error' && <Alert tone="error">{widgetError || 'O VLibras não pôde ser carregado. Tente novamente.'}</Alert>}
            {widgetState === 'off' && <p className="muted">A tradução está desativada.</p>}
          </div>
        </section>
      </div>
      <section className="surface accessibility-card accessibility-tour" aria-labelledby="tour-heading">
        <div><h2 id="tour-heading">Tour de orientação</h2><p>Reveja as etapas principais conforme a interface de visitante, paciente ou profissional. O tour é opcional.</p></div>
        <button className="button secondary" type="button" onClick={onTour}>Rever tour</button>
      </section>
    </main>
}
