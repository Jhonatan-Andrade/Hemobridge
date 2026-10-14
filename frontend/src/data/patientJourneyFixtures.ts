export interface JourneyNotification {
  id: string
  title: string
  summary: string
  date: string
  destination: string
  read: boolean
}

// Exemplos editoriais: nenhuma pessoa, hospital, agenda ou necessidade real.
export const demoJourneyNotifications: readonly JourneyNotification[] = [
  { id: 'etapa', title: 'Conheça a próxima etapa', summary: 'Veja onde os detalhes de uma consulta serão apresentados quando ela existir.', date: 'Prévia', destination: 'external-P04', read: false },
  { id: 'painel', title: 'Orientações no painel', summary: 'O painel apresenta a situação e o próximo passo conforme a etapa de acompanhamento.', date: 'Prévia', destination: 'dashboard', read: true },
]
