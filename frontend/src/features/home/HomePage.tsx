import fundoEditorial from '../../assets/home/fundo-editorial.jpg'
import gotaExterior from '../../assets/home/gota-exterior.svg'
import gotaInterior from '../../assets/home/gota-interior.svg'
import { useLocation } from 'react-router-dom'
import { AppShell } from '../../components/layout/AppShell'
import { ButtonLink, Card, ErrorState, Loading, Message } from '../../components/ui'
import { useAsync } from '../../lib/useAsync'
import { hemocentrosService } from '../../services/hemocentros'
import { navVisitante } from '../auth/navVisitante'
import { HemocentroCard } from '../paciente/HemocentroCard'

const oQueE =
  'O HemoBridge é uma plataforma de agendamento de doação de sangue. Você escolhe um hemocentro parceiro, vê os horários com vaga e agenda. O histórico das suas doações acompanha você entre os hemocentros.'

const motivos = [
  ['Uma doação ajuda até quatro pessoas', 'O sangue é separado em componentes usados em cirurgias, tratamentos de câncer, partos e acidentes.'],
  ['Não há substituto', 'O sangue não pode ser fabricado. Os estoques dependem de quem doa com regularidade.'],
  ['Sem fila e sem viagem perdida', 'Cada horário tem um número de vagas. Quando você agenda, a sua está garantida.'],
] as const

const etapas = [
  ['Crie sua conta', 'Cadastro rápido, com o consentimento para o uso dos seus dados.'],
  ['Escolha o hemocentro', 'Veja de quais tipos sanguíneos cada um precisa agora.'],
  ['Agende', 'Escolha o dia e um horário com vaga.'],
  ['Doe', 'A equipe registra a doação e ativa sua conta de doador.'],
] as const

// Figma: Web desktop / Acesso e orientações / Home pública / Inicial (43:1340) e mobile (660:7571).
// RF03 – apresentação pública do Hemobridge.
export function HomePage() {
  const parceiros = useAsync(() => hemocentrosService.listar({ tamanhoPagina: 4 }), [])
  // Ex.: confirmação da exclusão de dados (RF16), que encerra a sessão e volta para cá.
  const aviso = (useLocation().state as { aviso?: string } | null)?.aviso

  return (
    <AppShell nav={navVisitante} compacto>
      <div className="mx-auto flex w-full max-w-296 flex-col gap-10">
        {aviso && (
          <Message tone="success">
            <p>{aviso}</p>
          </Message>
        )}
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
                  <p className="text-body">Escolha um hemocentro, veja os horários com vaga e agende sua doação de sangue.</p>
                </div>
                <div className="flex w-full flex-col gap-3 sm:flex-row">
                  <ButtonLink to="/cadastro" kind="editorial">
                    Criar conta
                  </ButtonLink>
                  <ButtonLink to="/entrar" kind="secondary">
                    Já tenho conta
                  </ButtonLink>
                </div>
                <ButtonLink to="/doar" kind="secondary">
                  Ver hemocentros
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

        <section aria-labelledby="por-que" className="flex flex-col gap-4">
          <h2 id="por-que" className="text-heading font-semibold text-ink">
            Por que doar
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {motivos.map(([titulo, texto]) => (
              <Card key={titulo} title={titulo}>
                {texto}
              </Card>
            ))}
          </div>
        </section>

        <section aria-labelledby="como-funciona" className="flex flex-col gap-4">
          <h2 id="como-funciona" className="text-heading font-semibold text-ink">
            Como funciona
          </h2>
          <ol className="grid gap-4 md:grid-cols-4">
            {etapas.map(([titulo, texto], i) => (
              <li key={titulo} className="flex flex-col gap-2 rounded-card border border-line bg-surface p-4">
                <span className="flex size-9 items-center justify-center rounded-full bg-brand text-label font-semibold text-surface" aria-hidden="true">
                  {i + 1}
                </span>
                <h3 className="text-section font-semibold text-ink">{titulo}</h3>
                <p className="text-body text-muted">{texto}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="parceiros" className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <h2 id="parceiros" className="text-heading font-semibold text-ink">
              Hemocentros parceiros
            </h2>
            <ButtonLink to="/doar" kind="secondary">
              Ver todos
            </ButtonLink>
          </div>
          {parceiros.carregando ? (
            <Loading texto="Carregando hemocentros…" />
          ) : parceiros.erro || !parceiros.dados ? (
            <ErrorState mensagens={parceiros.erro ?? ['Não foi possível carregar os hemocentros.']} onRetry={parceiros.recarregar} />
          ) : !parceiros.dados.itens.length ? (
            <Card title="Em breve">Os primeiros hemocentros parceiros aparecerão aqui.</Card>
          ) : (
            <ul className="grid gap-4 md:grid-cols-2">
              {parceiros.dados.itens.map((h) => (
                <HemocentroCard key={h.id} hemocentro={h} />
              ))}
            </ul>
          )}
        </section>

        <section className="flex flex-col items-center gap-3 rounded-sheet bg-surface p-6 text-center">
          <h2 className="text-section font-semibold text-ink">Pronto para doar?</h2>
          <p className="text-body text-muted">Crie sua conta e agende em poucos minutos.</p>
          <div className="flex w-full flex-col justify-center gap-3 sm:flex-row">
            <ButtonLink to="/cadastro">Criar conta</ButtonLink>
            <ButtonLink to="/entrar" kind="secondary">
              Entrar
            </ButtonLink>
          </div>
        </section>
      </div>
    </AppShell>
  )
}
