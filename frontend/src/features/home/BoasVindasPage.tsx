import logo from '../../assets/brand/logo-horizontal.png'
import { ButtonLink } from '../../components/ui'

// Figma: Web desktop / Acesso e orientações / Boas-vindas / Visão geral (192:4693) e mobile (660:9731).
// Orientação do visitante em uma etapa; "Concluir" volta para a Home pública.
export function BoasVindasPage() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-editorial-night px-5 py-10">
      <section aria-labelledby="boas-vindas-titulo" className="flex w-full max-w-150 flex-col gap-4.5 rounded-sheet bg-surface p-5 sm:p-8">
        <img src={logo} alt="HemoBridge" width={150} height={42} className="h-auto w-37.5" />
        <p className="text-caption text-ink">Etapa 1 de 1</p>
        <div
          role="progressbar"
          aria-label="Progresso da orientação"
          aria-valuemin={0}
          aria-valuemax={1}
          aria-valuenow={1}
          className="h-1.5 w-full overflow-hidden rounded-full bg-line"
        >
          <div className="h-full w-full bg-brand" />
        </div>
        <h1 id="boas-vindas-titulo" className="text-heading font-semibold text-ink">
          <span className="font-editorial font-normal italic">A ponte que</span> conecta vidas.
        </h1>
        <p className="text-body text-ink">
          O HemoBridge aproxima pessoas interessadas em doar sangue das instituições de saúde. Faça o pré-cadastro ou explore a comunidade.
        </p>
        <p className="rounded-control bg-background p-4 text-caption text-ink">
          Ao entrar pela primeira vez, você conhecerá o percurso do seu perfil.
        </p>
        <ButtonLink to="/" block>
          Concluir
        </ButtonLink>
      </section>
    </main>
  )
}
