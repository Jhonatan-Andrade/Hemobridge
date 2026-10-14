export type Identity = 'visitor' | 'patient' | 'professional'
export type ProfessionalRole = 'doctor' | 'representative' | 'administrator'

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

export const initialPublications: Publication[] = [
  {
    id: 'etapas', author: 'Equipe editorial', date: '2026-10-01',
    title: 'Conheça as etapas de acompanhamento',
    content: 'No HemoBridge, o pré-cadastro é o primeiro passo. Depois de entrar, acompanhe no painel as orientações para consulta e exame. A avaliação da equipe acontece nas etapas seguintes.',
    likes: 12, liked: false, image: true,
    comments: [{ id: 'exemplo-1', author: 'Leitor da comunidade', date: '2026-10-01', text: 'Gostei de encontrar as etapas reunidas em um só lugar.' }],
  },
  {
    id: 'orientacoes', author: 'Comunidade HemoBridge', date: '2026-09-30',
    title: 'Uma conversa começa com informação',
    content: 'Este espaço reúne informações e conversas sobre doação de sangue. Leia com calma e consulte as orientações da equipe responsável quando precisar.',
    likes: 7, liked: false, comments: [],
  },
  {
    id: 'bem-vindo', author: 'Equipe editorial', date: '2026-09-29',
    title: 'Bem-vindo à Comunidade HemoBridge',
    content: 'Você pode explorar as publicações e ler comentários. Ao entrar, pode curtir ou participar da conversa. Mantenha dados pessoais e de saúde fora das publicações públicas.',
    likes: 4, liked: false, comments: [],
  },
  {
    id: 'acompanhar', author: 'Comunidade HemoBridge', date: '2026-09-28',
    title: 'Encontre seus próximos passos',
    content: 'O painel reúne sua situação e seus próximos passos. A home apresenta a plataforma e a comunidade; o perfil reúne os dados da sua conta. Cada espaço tem sua própria finalidade.',
    likes: 3, liked: false, comments: [],
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
