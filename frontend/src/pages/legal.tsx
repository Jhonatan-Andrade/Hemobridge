import { Intro, RouteLink } from '../components/ui'
import type { Navigate } from '../components/ui'
export function LegalContent({ kind = 'privacy' }: { kind?: string }) {
  return (
    <>
      <h2>
        {kind === 'community-rules'
          ? 'Normas da comunidade'
          : kind === 'terms'
            ? 'Termos de uso'
            : 'Privacidade e dados pessoais'}
      </h2>
      {kind === 'community-rules' ? (
        <>
          <p>
            Compartilhe conteúdos relevantes sobre saúde e doação de sangue. Trate todas as pessoas
            com respeito e indique a fonte de informações técnicas.
          </p>
          <p>
            Não publique dados pessoais, exames, diagnósticos individuais, imagens de pacientes,
            discriminação, publicidade enganosa ou conteúdo ilegal. As orientações gerais da
            comunidade não substituem avaliação profissional.
          </p>
          <p>
            Você pode denunciar publicações. A administração pode ocultar conteúdos que violem estas
            normas, preservando a trilha de análise. A identificação de perfil verificado
            corresponde à conferência institucional do cadastro profissional.
          </p>
        </>
      ) : (
        <>
          <p>
            O HemoBridge oferece pré-cadastro, acompanhamento de consultas e exames, comunicação
            sobre doação e uma comunidade de informações gerais. A aptidão para doar é definida por
            profissionais e pelo serviço de hemoterapia; o cadastro não constitui aprovação clínica.
          </p>
          <p>
            Dados de identificação e contato são utilizados para a conta. Informações de saúde são
            acessadas por profissionais autorizados para avaliação e acompanhamento, conforme a
            finalidade e a base legal aplicáveis. O consentimento é registrado com a versão do
            termo, finalidade e data; pode ser revogado pelo canal de privacidade, sem efeito
            retroativo sobre tratamentos lícitos anteriores.
          </p>
          <p>
            Você pode solicitar acesso, correção e as demais providências previstas na LGPD. Pedidos
            de exclusão são analisados conforme a finalidade e a obrigação legal de guarda.
            Registros clínicos sujeitos à Lei 13.787/2018 seguem os prazos legais. O encerramento da
            conta não elimina automaticamente esses registros.
          </p>
          <p>
            O navegador mantém preferências de leitura e a conclusão da apresentação inicial. A
            sessão web utiliza cookie protegido, inacessível ao JavaScript. O serviço não utiliza
            dados de saúde em publicidade.
          </p>
          <p>
            Mapas e buscas utilizam OpenStreetMap, Google Maps e IBGE. A localização é opcional e
            solicitada após seu comando. Confirme disponibilidade, endereço e horários com a unidade
            antes de comparecer.
          </p>
          <p>
            Responsável pelo serviço: {import.meta.env.VITE_LEGAL_ENTITY_NAME ?? 'HemoBridge'}.{' '}
            {import.meta.env.VITE_PRIVACY_CONTACT && (
              <>
                Canal de privacidade:{' '}
                <a href={`mailto:${import.meta.env.VITE_PRIVACY_CONTACT}`}>
                  {import.meta.env.VITE_PRIVACY_CONTACT}
                </a>
                .
              </>
            )}
          </p>
        </>
      )}
      <p className="help">Versão: outubro de 2026.</p>
    </>
  )
}
export function LegalPage({ route, navigate }: { route: string; navigate: Navigate }) {
  return (
    <main className="publication-page">
      <RouteLink to="home" navigate={navigate}>
        ← Voltar ao início
      </RouteLink>
      <Intro
        title={
          route === 'community-rules'
            ? 'Normas da comunidade'
            : route === 'terms'
              ? 'Termos de uso'
              : 'Privacidade'
        }
        description="Leia as condições e os direitos relacionados ao uso da plataforma."
      />
      <LegalContent kind={route} />
    </main>
  )
}
