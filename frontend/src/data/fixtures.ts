export type Identity = 'visitor' | 'patient' | 'professional'
export type ProfessionalRole = 'doctor' | 'representative' | 'administrator'
export type CommunityParticipantRole = 'patient' | ProfessionalRole
export type CommunityAuthorRole = CommunityParticipantRole | 'editorial' | 'institution'

export const communityRoleLabels: Record<CommunityAuthorRole, string> = {
  patient: 'Paciente', doctor: 'Equipe médica', representative: 'Instituição',
  administrator: 'Administração', editorial: 'Equipe editorial', institution: 'Instituição',
}

export const communitySessionAuthors: Record<CommunityParticipantRole, string> = {
  patient: 'Pessoa cadastrada', doctor: 'Profissional médico',
  representative: 'Representante de instituição', administrator: 'Administrador HemoBridge',
}

export type PatientStatus =
  | 'PRE_CADASTRADO'
  | 'CONSULTA_AGENDADA'
  | 'AGUARDANDO_EXAME'
  | 'EM_ANALISE'
  | 'APROVADO'
  | 'REPROVADO_EXAME'
  | 'REPROVADO_ATENDIMENTO'

export type DemoResponse =
  | 'success'
  | 'network'
  | 'invalid'
  | 'blocked'
  | 'inactive'
  | 'expired'
  | 'duplicate'
  | 'first'
  | 'loadError'
  | 'loading'
  | 'empty'

export interface Comment {
  id: string
  author: string
  date: string
  text: string
  role?: CommunityAuthorRole
  example?: boolean
}

export interface Publication {
  id: string
  author: string
  date: string
  title: string
  content: string
  likes: number
  liked: boolean
  comments: Comment[]
  image?: boolean
  role?: CommunityAuthorRole
  example?: boolean
}

export interface DemoProfile extends Record<string, string> {
  name: string; cpf: string; email: string; phone: string; birth: string
  sex: string; weight: string; city: string; state: string
}

export const demoPatient = {
  initials: 'PC', displayName: 'Pessoa cadastrada', bloodType: 'Definido pela equipe',
  appointment: { month: 'NOV', day: '12', time: '10h', unit: 'Unidade de referência' },
  commentAuthor: 'Pessoa cadastrada',
}

const exampleComment = (id: string, author: string, text: string, role: CommunityAuthorRole = 'patient'): Comment => ({
  id, author, date: '2026-10-01', text, role, example: true,
})

export const initialPublications: Publication[] = [
  {
    id: 'etapas', author: 'Equipe editorial', date: '2026-10-01',
    title: 'Conheça as etapas de acompanhamento',
    content: 'No HemoBridge, o pré-cadastro é o primeiro passo. Depois de entrar, acompanhe no painel as orientações para consulta e exame. A avaliação da equipe acontece nas etapas seguintes.',
    likes: 12, liked: false, image: true, role: 'editorial', example: true,
    comments: [
      exampleComment('exemplo-1', 'Leitora da comunidade', 'Gostei de encontrar as etapas reunidas em um só lugar.'),
      exampleComment('exemplo-2', 'Pessoa interessada', 'Ficou mais fácil entender que o pré-cadastro vem antes da avaliação.'),
      exampleComment('exemplo-3', 'Profissional da equipe', 'Em cada etapa, a orientação específica deve aparecer no painel privado.', 'doctor'),
      exampleComment('exemplo-4', 'Leitor da comunidade', 'O resumo visual ajuda a encontrar o próximo passo.'),
      exampleComment('exemplo-5', 'Representante de instituição', 'É útil ter a orientação da unidade separada das conversas públicas.', 'representative'),
      exampleComment('exemplo-6', 'Pessoa cadastrada', 'Posso voltar para consultar as etapas quando precisar.'),
      exampleComment('exemplo-7', 'Leitora da comunidade', 'A diferença entre informação geral e avaliação individual está clara.'),
      exampleComment('exemplo-8', 'Profissional da equipe', 'Dúvidas sobre exames devem seguir o canal privado da equipe.', 'doctor'),
      exampleComment('exemplo-9', 'Pessoa interessada', 'Encontrei a comunidade pelo menu do painel.'),
      exampleComment('exemplo-10', 'Leitor da comunidade', 'Seria bom confirmar os detalhes de cada etapa antes de comparecer.'),
      exampleComment('exemplo-11', 'Representante de instituição', 'Avisos da unidade podem complementar este guia geral.', 'representative'),
      exampleComment('exemplo-12', 'Leitora da comunidade', 'Obrigado por manter a conversa sem dados de saúde pessoais.'),
    ],
  },
  {
    id: 'orientacoes', author: 'Comunidade HemoBridge', date: '2026-09-30',
    title: 'Uma conversa começa com informação',
    content: 'Este espaço reúne informações e conversas sobre doação de sangue. Leia com calma e consulte as orientações da equipe responsável quando precisar.',
    likes: 7, liked: false, role: 'editorial', example: true,
    comments: [
      exampleComment('orientacoes-1', 'Leitor da comunidade', 'É bom poder ler antes de participar.'),
      exampleComment('orientacoes-2', 'Profissional da equipe', 'A conversa pública não substitui a orientação individual.', 'doctor'),
    ],
  },
  {
    id: 'bem-vindo', author: 'Equipe editorial', date: '2026-09-29',
    title: 'Bem-vindo à Comunidade HemoBridge',
    content: 'Você pode explorar as publicações e ler comentários. Ao entrar, pode curtir ou participar da conversa. Mantenha dados pessoais e de saúde fora das publicações públicas.',
    likes: 4, liked: false, role: 'editorial', example: true,
    comments: [exampleComment('bem-vindo-1', 'Pessoa cadastrada', 'Vou acompanhar as novidades por aqui.')],
  },
  {
    id: 'acompanhar', author: 'Comunidade HemoBridge', date: '2026-09-28',
    title: 'Encontre seus próximos passos',
    content: 'O painel reúne sua situação e seus próximos passos. A home apresenta a plataforma e a comunidade; o perfil reúne os dados da sua conta. Cada espaço tem sua própria finalidade.',
    likes: 3, liked: false, role: 'editorial', example: true,
    comments: [exampleComment('acompanhar-1', 'Leitora da comunidade', 'Gostei de encontrar os espaços separados por finalidade.')],
  },
  {
    id: 'aviso-institucional', author: 'Instituição Exemplo (nome fictício)', date: '2026-09-27',
    title: 'Aviso institucional: confirme os dados da unidade antes da visita',
    content: 'Esta é uma publicação ilustrativa de uma instituição. Antes de se deslocar, confirme endereço, horário de atendimento e serviços no canal oficial da unidade. O HemoBridge ainda não apresenta avisos operacionais de instituições reais.',
    likes: 6, liked: false, role: 'institution', example: true,
    comments: [
      exampleComment('aviso-1', 'Pessoa interessada', 'É importante conferir o horário no canal da unidade.'),
      exampleComment('aviso-2', 'Representante de instituição', 'Um aviso assim poderia reunir alterações de atendimento confirmadas.', 'representative'),
      exampleComment('aviso-3', 'Leitora da comunidade', 'A indicação de exemplo evita confundir com um comunicado real.'),
    ],
  },
  {
    id: 'conversa-medica', author: 'Equipe médica (exemplo fictício)', date: '2026-09-26',
    title: 'Perguntas para levar à avaliação individual',
    content: 'Este texto ilustra uma publicação profissional. A equipe pode explicar o fluxo de consulta e a finalidade dos exames solicitados. Dúvidas sobre resultados, elegibilidade ou condições de saúde devem ser tratadas em atendimento privado com profissional habilitado.',
    likes: 9, liked: false, role: 'doctor', example: true,
    comments: [
      exampleComment('medico-1', 'Pessoa cadastrada', 'Vou guardar minhas dúvidas para a consulta.'),
      exampleComment('medico-2', 'Profissional da equipe', 'É melhor não compartilhar resultados no feed.', 'doctor'),
      exampleComment('medico-3', 'Leitora da comunidade', 'Essa diferença entre conversa pública e atendimento ajuda bastante.'),
    ],
  },
  {
    id: 'aviso-comunidade', author: 'Administração HemoBridge (exemplo)', date: '2026-09-25',
    title: 'Como participar das conversas da comunidade',
    content: 'Este é um exemplo de aviso da administração. Compartilhe perguntas gerais e experiências sem identificar pessoas, divulgar exames ou solicitar avaliação clínica no espaço público. Comentários devem ser respeitosos e relacionados ao assunto da publicação.',
    likes: 5, liked: false, role: 'administrator', example: true,
    comments: [
      exampleComment('admin-1', 'Leitor da comunidade', 'As orientações são fáceis de encontrar.'),
      exampleComment('admin-2', 'Profissional da equipe', 'Casos individuais precisam seguir canais privados.', 'doctor'),
    ],
  },
]

export const patientStatuses: Record<PatientStatus, {
  label: string; summary: string; guidance: string; action: string; destination: string
}> = {
  PRE_CADASTRADO: { label: 'Pré-cadastrado', summary: 'Seu pré-cadastro está registrado.', guidance: 'Veja as orientações para a etapa de consulta; esta prévia não reserva horários.', action: 'Agendar consulta', destination: 'P03' },
  CONSULTA_AGENDADA: { label: 'Consulta agendada', summary: 'Sua consulta está agendada.', guidance: 'Confira os detalhes do seu agendamento.', action: 'Ver consulta', destination: 'P04' },
  AGUARDANDO_EXAME: { label: 'Aguardando exame', summary: 'Aguardamos seu exame.', guidance: 'Envie o exame solicitado pela equipe.', action: 'Enviar exame', destination: 'P05' },
  EM_ANALISE: { label: 'Em análise', summary: 'O exame está em análise.', guidance: 'Aguarde o retorno da equipe.', action: 'Ver exame', destination: 'P05' },
  APROVADO: { label: 'Aprovado', summary: 'Processo aprovado pela equipe.', guidance: 'Conheça a prévia de locais recomendados. Ainda não há recomendação personalizada ou estoque consultado.', action: 'Ver locais recomendados', destination: 'P08' },
  REPROVADO_EXAME: { label: 'Reprovado · exame', summary: 'O exame precisa ser reenviado.', guidance: 'Confira a orientação registrada pela equipe.', action: 'Reenviar exame', destination: 'P05' },
  REPROVADO_ATENDIMENTO: { label: 'Reprovado · clínico', summary: 'Avaliação com reprovação clínica.', guidance: 'Confira a orientação registrada e agende nova consulta.', action: 'Agendar consulta', destination: 'P03' },
}

export const exampleProfile: DemoProfile = {
  name: 'Pessoa cadastrada', cpf: '000.000.000-00', email: 'pessoa@example.invalid',
  phone: '(00) 00000-0000', birth: '1995-01-01', sex: 'Não informado',
  weight: '65', city: 'Cidade de referência', state: 'demo',
}

export const exampleFormValues: Record<string, string> = {
  ...exampleProfile, password: 'Exemplo123', confirm: 'Exemplo123', current: 'Exemplo123',
  new: 'OutraSenha123', newconfirm: 'OutraSenha123', sex: 'demo', state: 'demo',
}
