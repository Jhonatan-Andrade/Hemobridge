import { entryRouteOf } from '../types/domain'
import type { SessionUser } from '../types/domain'
import type { Navigate } from '../components/ui'
import { RouteLink } from '../components/ui'
import { platformPurpose, rolePurpose, tourRoleLabels } from '../services/tour-content'

export function PlatformExplanation({ navigate, user }: { navigate: Navigate; user?: SessionUser | null }) {
  return (
    <main className="community-page platform-introduction">
      <h1 tabIndex={-1}>O que é o HemoBridge?</h1>
      <p className="platform-lead">{platformPurpose}</p>
      <section className="surface card">
        <h2>Da vontade de ajudar ao acompanhamento</h2>
        <ol className="platform-steps">
          <li><strong>Crie sua conta.</strong> O pré-cadastro inicia a jornada e permite entrar no seu painel. Não há uma aprovação administrativa separada do cadastro.</li>
          <li><strong>Receba orientações e agende uma consulta.</strong> A pré-triagem é uma orientação automática; a avaliação clínica cabe aos profissionais.</li>
          <li><strong>Acompanhe os próximos cuidados.</strong> Se o médico solicitar exames, confira as orientações e envie os resultados na área privada. O painel mostra a avaliação e as pendências.</li>
          <li><strong>Encontre onde sua doação pode ajudar.</strong> Consulte os serviços disponíveis e confirme o atendimento com a unidade. A aptidão para cada coleta será confirmada na triagem presencial.</li>
          <li><strong>Continue em contato.</strong> O registro da doação pela instituição ajuda nas próximas orientações. A Comunidade reúne informações gerais e conversas sobre saúde e doação.</li>
        </ol>
        <p>Os tempos de consulta, exames e atendimento variam conforme a instituição.</p>
      </section>
      <section className="surface card">
        <h2>Um espaço para cada pessoa</h2>
        <p>Paciente/Doador acompanha sua jornada. O Médico organiza atendimentos e avaliações. O Representante de Hospital mantém necessidades e registros institucionais. O Administrador acompanha o mapa e a moderação.</p>
        <p>Informações pessoais e exames ficam nas áreas privadas. O HemoBridge ajuda a organizar o cuidado; não substitui a avaliação da instituição nem garante uma reserva de coleta.</p>
      </section>
      <div className="actions">
        <RouteLink className="button" to={user ? entryRouteOf(user) : 'register'} navigate={navigate}>{user ? 'Voltar à minha área' : 'Fazer pré-cadastro'}</RouteLink>
        <RouteLink className="button secondary" to="home" navigate={navigate}>Voltar ao início</RouteLink>
        <RouteLink className="button secondary" to="community" navigate={navigate}>Conhecer a Comunidade</RouteLink>
      </div>
    </main>
  )
}
export function FirstAccessIntroduction({ user, navigate, onUnderstand }: {
  user: SessionUser; navigate: Navigate; onUnderstand: () => void
}) {
  return (
    <main className="community-page platform-introduction">
      <span className="eyebrow">{tourRoleLabels[user.perfil]}</span>
      <h1 tabIndex={-1}>Antes de começar, conheça o HemoBridge</h1>
      <p className="platform-lead">{platformPurpose}</p>
      <section className="surface card" aria-labelledby="introduction-role-title">
        <h2 id="introduction-role-title">Seu lugar nessa ponte</h2>
        <p>{rolePurpose[user.perfil]}</p>
        <p>A Comunidade é o espaço das conversas e informações gerais. Documentos e dados de saúde devem permanecer nas áreas privadas.</p>
      </section>
      <section className="surface card" aria-labelledby="introduction-next-title">
        <h2 id="introduction-next-title">Entenda no seu ritmo</h2>
        <p>Leia esta introdução antes de iniciar. A próxima apresentação explica as etapas da sua jornada e onde encontrar as funções do seu perfil, sem ensinar cada campo.</p>
        <p>Ela é necessária para liberar as funções da conta no primeiro acesso. Você pode explorar as informações públicas ou sair e continuar depois; nada é concluído automaticamente.</p>
        <div className="actions">
          <RouteLink className="text-button" to="how-it-works" navigate={navigate}>Ler mais sobre a plataforma</RouteLink>
          <RouteLink className="text-button" to="community" navigate={navigate}>Explorar a Comunidade</RouteLink>
        </div>
      </section>
      <button type="button" className="button introduction-acknowledge" onClick={onUnderstand}>
        Entendi o HemoBridge. Conhecer minha jornada
      </button>
    </main>
  )
}
