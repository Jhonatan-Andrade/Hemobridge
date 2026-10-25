import fundoEditorial from '../../assets/home/fundo-editorial.jpg'
import gotaExterior from '../../assets/home/gota-exterior.svg'
import gotaInterior from '../../assets/home/gota-interior.svg'
import { AppShell } from '../../components/layout/AppShell'
import { ButtonLink } from '../../components/ui'
import { navVisitante } from '../auth/navVisitante'
import { PublicationCard } from './PublicationCard'
import { publicacoes } from './publicacoes'

const oQueE =
  'O HemoBridge conecta quem deseja doar sangue a hospitais e hemocentros que precisam de doações. Você encontra orientações para se cadastrar, acompanhar sua avaliação e descobrir onde sua doação pode ajudar.'

// Figma: Web desktop / Acesso e orientações / Home pública / Inicial (43:1340) e mobile (660:7571).
// Página estática, sem chamadas à API.
export function HomePage() {
  return (
    <AppShell nav={navVisitante} compacto>
      <div className="mx-auto flex w-full max-w-296 flex-col gap-6">
        {/* Destaque e apresentação */}
        <section className="relative" aria-labelledby="home-titulo">
          {/* Motivo / Gota: uma parcialmente fora e outra dentro do card, sem cobrir texto. */}
          <img src={gotaExterior} alt="" width={116} height={123} className="pointer-events-none absolute -bottom-6 -left-3 h-auto w-19.5 lg:-left-4 lg:w-29" />
          <div className="relative flex flex-col justify-center overflow-hidden rounded-sheet border-t-3 border-coral px-6 pb-34 pt-6.5 shadow-hero lg:min-h-138.75 lg:rounded-hero lg:p-12">
            <div aria-hidden="true" className="absolute inset-0">
              <img src={fundoEditorial} alt="" className="size-full object-cover" />
              <div className="absolute inset-0 bg-linear-to-b from-petrol-900/98 via-petrol-900/88 via-55% to-petrol-900/53 lg:bg-linear-to-r lg:from-petrol-900 lg:via-petrol-900/94 lg:via-46% lg:to-petrol-900/25" />
            </div>

            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-col items-start gap-4 text-cream lg:max-w-190">
                <div className="flex flex-col gap-2">
                  <h1 id="home-titulo" className="text-hero-sm font-semibold lg:text-hero">
                    HemoBridge:
                    <br />
                    <span className="font-editorial font-normal italic">A ponte que</span>
                    <br />
                    conecta vidas.
                  </h1>
                  <p className="text-body">Consulte sua situação, veja os próximos passos e acompanhe suas consultas em um só lugar.</p>
                </div>
                <div className="flex w-full flex-col gap-3 sm:flex-row">
                  <ButtonLink to="/cadastro" kind="editorial">
                    Fazer pré-cadastro
                  </ButtonLink>
                  <ButtonLink to="/entrar" kind="secondary">
                    Já tenho conta
                  </ButtonLink>
                </div>
                <p className="text-caption lg:max-w-168">
                  O pré-cadastro inicia o processo. Consultas e exames aparecem quando houver dados disponíveis.
                </p>
                <ButtonLink to="/boas-vindas" kind="secondary">
                  Como funciona? Ver tour
                </ButtonLink>
              </div>

              {/* Explicação / O que é o HemoBridge? (no desktop flutua sobre o destaque) */}
              <aside
                aria-labelledby="home-o-que-e"
                className="hidden w-80 shrink-0 flex-col gap-2.5 rounded-sheet border border-cream/90 bg-surface p-5.5 shadow-float lg:-mt-5 lg:flex lg:self-start"
              >
                <p className="text-small/5 font-bold text-editorial-eyebrow">Conheça a plataforma</p>
                <h2 id="home-o-que-e" className="text-explainer font-medium text-petrol-900">
                  O que é o HemoBridge?
                </h2>
                <p className="text-body text-editorial-text">{oQueE}</p>
                <p className="text-body text-editorial-text">
                  Depois de entrar, você encontra sua situação, os próximos passos e as informações de suas consultas no painel. A comunidade
                  reúne publicações e conversas sobre doação de sangue.
                </p>
              </aside>
            </div>

            <img
              src={gotaInterior}
              alt=""
              width={78}
              height={83}
              className="pointer-events-none absolute -right-6 bottom-20 h-auto w-12 lg:bottom-5 lg:right-15 lg:w-19.5"
            />
          </div>
        </section>

        {/* No mobile, "O que é o HemoBridge?" vira um card escuro abaixo do destaque. */}
        <section aria-labelledby="home-o-que-e-mobile" className="flex flex-col gap-2 rounded-sheet bg-ink p-6 text-surface lg:hidden">
          <h2 id="home-o-que-e-mobile" className="text-section font-semibold">
            O que é o HemoBridge?
          </h2>
          <p className="text-body">{oQueE}</p>
        </section>

        {/* Comunidade HemoBridge (Figma 49:15012): conteúdo de demonstração; as ações levam ao login. */}
        <section
          aria-labelledby="home-comunidade"
          className="flex flex-col gap-4 rounded-sheet bg-linear-92 from-petrol-900 via-editorial-plum to-editorial-berry p-5 text-cream shadow-community lg:-mx-8 lg:rounded-sheet-lg lg:bg-linear-107 lg:p-8"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex flex-col gap-4">
              <h2 id="home-comunidade" className="text-community-sm font-medium lg:text-community">
                Comunidade HemoBridge
              </h2>
              <p className="text-body">Informações, novidades e conversas sobre doação de sangue.</p>
              <p className="text-caption">Conversas da comunidade</p>
              <ButtonLink to="/entrar" kind="secondary">
                Ver comunidade
              </ButtonLink>
            </div>
            <ButtonLink to="/boas-vindas" kind="secondary">
              Próximos passos<span aria-hidden="true" className="hidden lg:inline"> →</span>
            </ButtonLink>
          </div>
          <div className="grid gap-5 pt-5 lg:grid-cols-3">
            {publicacoes.map((p) => (
              <PublicationCard key={p.id} publicacao={p} />
            ))}
          </div>
        </section>

        <div className="flex justify-center">
          <ButtonLink to="/entrar" kind="secondary">
            Entrar como paciente
          </ButtonLink>
        </div>
      </div>
    </AppShell>
  )
}
