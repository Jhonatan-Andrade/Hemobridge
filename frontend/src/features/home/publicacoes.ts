// Conteúdo estático das publicações exibidas na Home pública (Figma: "Publicações / Home").
// Não há API de comunidade; os textos e contadores são os do Figma.
export type Publicacao = {
  id: string
  autor: string
  data: string
  titulo: string
  resumo: string
  curtidas: number
  comentarios: number
  destaque?: boolean
}

export const publicacoes: Publicacao[] = [
  {
    id: 'etapas',
    autor: 'Equipe editorial',
    data: '01/10/2026',
    titulo: 'Conheça as etapas de acompanhamento',
    resumo:
      'No HemoBridge, o pré-cadastro é o primeiro passo. Depois de entrar, acompanhe no painel as orientações para consulta e exame. A avaliação da equi…',
    curtidas: 12,
    comentarios: 1,
    destaque: true,
  },
  {
    id: 'orientacoes',
    autor: 'Comunidade HemoBridge',
    data: '30/09/2026',
    titulo: 'Uma conversa começa com informação',
    resumo:
      'Este espaço reúne informações e conversas sobre doação de sangue. Leia com calma e consulte as orientações da equipe responsável.',
    curtidas: 7,
    comentarios: 0,
  },
  {
    id: 'bem-vindo',
    autor: 'Equipe editorial',
    data: '29/09/2026',
    titulo: 'Bem-vindo à Comunidade HemoBridge',
    resumo:
      'Explore as publicações, leia comentários e participe das conversas. Compartilhe dúvidas e experiências com respeito.',
    curtidas: 4,
    comentarios: 0,
  },
]
