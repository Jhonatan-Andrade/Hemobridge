import type { UserRole } from '../types/domain'

export type TourStep = { title: string; text: string; journey?: boolean }
export const tourRoleLabels: Record<UserRole, string> = {
  PACIENTE: 'Paciente/Doador',
  MEDICO: 'Médico',
  REPRESENTANTE: 'Representante de Hospital',
  ADMINISTRADOR: 'Administrador',
}

export function tourSteps(role?: UserRole): TourStep[] {
  if (!role)
    return [
      {
        title: 'A ponte que conecta vidas',
        text: 'O HemoBridge conecta pessoas interessadas em doar sangue a instituições de saúde. Faça o pré-cadastro para acompanhar sua jornada ou explore a Comunidade.',
      },
    ]
  const overview: TourStep = {
    title: 'Da triagem ao acompanhamento',
    journey: true,
    text: 'A jornada começa com avaliação e orientações da equipe. Quando houver liberação, a coleta acontece presencialmente na unidade. Depois, a equipe registra o atendimento e atualiza a situação no HemoBridge.',
  }
  const profile: TourStep = {
    title: 'Perfil e privacidade',
    text: 'Em Perfil, consulte sua conta e as informações do seu cadastro. Use as áreas privadas para dados de saúde. Você poderá rever esta apresentação pelo menu e ajustar a leitura em Acessibilidade.',
  }
  const community: TourStep = {
    title: 'Comunidade',
    text: 'Compartilhe informações gerais sobre saúde e doação. Médicos e instituições verificados têm identificação; avisos críticos ativos ficam no topo. Preserve dados pessoais e exames nas áreas privadas.',
  }
  const byRole: Record<UserRole, TourStep[]> = {
    PACIENTE: [
      {
        title: 'Meu painel, consultas e exames',
        text: 'Meu painel reúne sua situação e o próximo passo. Em Consultas, acompanhe os horários e atendimentos. Em Exames, veja as solicitações e o andamento da análise. Notificações reúnem os avisos da equipe.',
      },
      {
        title: 'Locais e Comunidade',
        text: 'Em Locais, pesquise serviços para doação ou exames usando Estado/Município ou sua localização. Confirme o atendimento com a unidade. Na Comunidade, participe de conversas gerais sem publicar informações de saúde pessoais.',
      },
      profile,
    ],
    MEDICO: [
      {
        title: 'Instituições, agenda e exames',
        text: 'Selecione a instituição em que está trabalhando. Agenda organiza os horários, Atendimento reúne consultas atribuídas e Exames permite acompanhar as solicitações e a análise. Registre as decisões clínicas na área privada.',
      },
      community,
      profile,
    ],
    REPRESENTANTE: [
      {
        title: 'Necessidades e estoque',
        text: 'Em Necessidades, acompanhe a demanda por tipo sanguíneo da sua instituição. Em Estoque, consulte bolsas, validade e movimentações. O registro da coleta e a liberação técnica são etapas distintas.',
      },
      {
        ...community,
        text: 'Na Comunidade, publique orientações e avisos da instituição. Instituições verificadas podem emitir avisos críticos com validade, fixados enquanto ativos. A informação de estoque deve acompanhar a situação confirmada da unidade.',
      },
      profile,
    ],
    ADMINISTRADOR: [
      {
        title: 'Painel e mapa regional',
        text: 'O painel administrativo reúne indicadores e gestão de acessos. Em Mapa, acompanhe necessidades agregadas por região e tipo sanguíneo. Observe a cobertura e a data dos dados; ausência de informação não indica estoque adequado.',
      },
      {
        title: 'Comunidade e moderação',
        text: 'A Comunidade também está disponível para a administração. Em Moderação, acompanhe denúncias e conteúdos que violem as normas. Verificações de profissionais e instituições devem manter a fonte de conferência registrada.',
      },
      profile,
    ],
  }
  return [overview, ...byRole[role]]
}

type Estimate = { etapa: string; minutos: number; fonte: string; hospital: { nome: string } }
export function journeyTimings(data: unknown) {
  const estimates = Array.isArray(data)
    ? data.filter(
        (item): item is Estimate =>
          !!item &&
          typeof item === 'object' &&
          Number.isInteger(item.minutos) &&
          item.minutos > 0 &&
          typeof item.fonte === 'string' &&
          !!item.fonte.trim() &&
          typeof item.hospital?.nome === 'string',
      )
    : []
  return [
    {
      stage: 'TRIAGEM',
      title: 'Triagem',
      text: 'Entrevista e avaliação pela equipe antes da doação.',
      fallback: 'Prazo informado pela unidade.',
    },
    {
      stage: 'DOACAO',
      title: 'Coleta e doação no local',
      text: 'A coleta é presencial. A estimativa da instituição pode incluir o atendimento completo.',
      fallback: 'Coleta: cerca de 10 minutos.',
      source: 'Referência: Hemominas',
      url: 'https://www.hemominas.mg.gov.br/servicos/doar-sangue',
    },
    {
      stage: 'ATUALIZACAO_STATUS',
      title: 'Atualização do status',
      text: 'Após o registro e a validação da equipe; não significa liberação imediata da bolsa.',
      fallback: 'Prazo informado pela unidade.',
    },
  ].map((item) => ({ ...item, estimates: estimates.filter((value) => value.etapa === item.stage) }))
}
