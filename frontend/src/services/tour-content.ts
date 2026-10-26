import type { UserRole } from '../types/domain'

export type TourStep = { title: string; text: string; location: string; duration?: string; collectionReference?: boolean }
export const tourRoleLabels: Record<UserRole, string> = {
  PACIENTE: 'Paciente/Doador', MEDICO: 'Médico', REPRESENTANTE: 'Representante de Hospital', ADMINISTRADOR: 'Administrador',
}
export const platformPurpose = 'O HemoBridge conecta pessoas que desejam doar sangue a hospitais e hemocentros que precisam de doações. Aqui você acompanha orientações, consultas e informações para encontrar onde sua doação pode ajudar.'
export const rolePurpose: Record<UserRole, string> = {
  PACIENTE: 'Sua área reúne os próximos passos da jornada, suas consultas, os exames solicitados e os locais de atendimento. O cadastro e as orientações automáticas não substituem a avaliação profissional.',
  MEDICO: 'Sua área organiza as instituições em que você atua, a agenda e os atendimentos atribuídos. Os registros clínicos, os pedidos de exames e as avaliações ficam nas áreas privadas.',
  REPRESENTANTE: 'Sua área reúne as necessidades da instituição, o registro das doações realizadas e o estoque de bolsas. A necessidade informada, a coleta registrada e a liberação técnica são operações distintas.',
  ADMINISTRADOR: 'Sua área reúne o mapa regional, a moderação da Comunidade e as solicitações de privacidade disponíveis na web. A cobertura e a data dos dados ajudam a interpretar o mapa.',
}

export function tourSteps(role: UserRole, approvedDonor = false): TourStep[] {
  const variable = 'O tempo varia conforme a instituição.'
  const common: TourStep = {
    title: 'Comunicação e sua conta',
    text: 'Na Comunidade, compartilhe informações gerais sobre saúde e doação, preservando dados pessoais e exames nas áreas privadas. Em Perfil você cuida da sua conta. A revisão desta apresentação fica disponível pelo menu e pode ser fechada quando quiser.',
    location: 'Menu → Comunidade e Perfil; Notificações reúne os avisos da equipe.',
  }
  const byRole: Record<UserRole, TourStep[]> = {
    PACIENTE: [
      {
        title: 'Seu pré-cadastro inicia a jornada',
        text: approvedDonor
          ? 'Você já concluiu o pré-cadastro e sua avaliação na plataforma. Vamos rever como a jornada se organiza. O cadastro cria a conta; a aprovação clínica depende da avaliação profissional e não substitui a triagem presencial.'
          : 'Você já concluiu o pré-cadastro e criou sua conta. Não há uma aprovação administrativa separada desse cadastro. A avaliação clínica acontece nas próximas etapas: ter uma conta ainda não significa estar apto para doar.',
        location: 'Meu painel mostra sua situação; Perfil reúne seus dados.',
      },
      { title: 'Pré-triagem e agendamento', text: approvedDonor ? 'Você já passou pela avaliação da plataforma. Na jornada inicial, a pré-triagem orienta antes do agendamento; esse resultado automático não é uma aprovação clínica. O histórico dos horários e atendimentos continua em Minhas consultas. Para encontrar onde doar agora, use Locais.' : 'Antes de escolher um horário, responda à pré-triagem para receber orientações. Esse resultado automático não é uma aprovação clínica. Depois, escolha uma consulta disponível e acompanhe os detalhes e eventuais alterações em Minhas consultas.', location: approvedDonor ? 'Meu painel → Minhas consultas para o histórico; Locais para encontrar onde doar.' : 'Meu painel → Agendar consulta; depois, Minhas consultas.', duration: variable },
      { title: 'Consulta e próximos cuidados', text: 'Converse com o médico e acompanhe as orientações do atendimento. Quando o acesso à sala estiver liberado, ele estará nos detalhes da consulta. O atendimento pode levar a pedidos de exames ou outras orientações; concluir a consulta, por si só, não indica aprovação.', location: 'Meu painel → Minhas consultas → detalhes da consulta.', duration: variable },
      { title: 'Exames e avaliação, quando solicitados', text: 'Se o médico solicitar exames, confira as orientações e envie os resultados pela área privada. Acompanhe a análise, os pedidos de reenvio e a decisão profissional no painel. Exames não são uma tarefa obrigatória para toda conta; a aprovação disponível nesta jornada depende da avaliação dos resultados solicitados.', location: 'Meu painel → Meus exames; situação no painel e avisos em Notificações.', duration: variable },
      { title: 'Locais, triagem presencial e coleta', text: 'Busque serviços para os exames solicitados ou instituições onde doar. Após a aprovação e a tipagem, você pode consultar recomendações compatíveis. Confirme serviços e horários com a unidade: indicar um local ou abrir o Maps não reserva a coleta. A equipe fará a triagem presencial e confirmará sua aptidão naquele atendimento.', location: 'Menu → Locais; Estado/Município ou localização por sua escolha.', duration: 'A espera e a triagem variam conforme a instituição. A Hemominas informa cerca de dez minutos para a coleta de sangue; esse tempo não inclui todo o atendimento.', collectionReference: true },
      { title: 'Acompanhamento e recursos da conta', text: 'Depois da coleta, a instituição registra a doação realizada. Esse histórico ajuda nas próximas orientações, sem prometer atualização imediata. Acompanhe sua situação e os avisos, participe da Comunidade e cuide da conta em Perfil. Você pode rever esta jornada pelo menu.', location: 'Meu painel, Locais e Notificações; menu → Comunidade e Perfil.', duration: variable },
    ],
    MEDICO: [
      { title: 'Sua instituição e seu acesso', text: 'Seu acesso profissional é fornecido pela instituição. Antes de organizar os atendimentos, confira em qual instituição está trabalhando. Quem atua em mais de um hospital pode trocar o vínculo ativo no seletor.', location: 'Minha agenda → seletor de instituição; Perfil reúne sua conta.' },
      { title: 'Agenda e atendimento', text: 'Organize os horários e abra as consultas atribuídas a você. O registro clínico fica disponível após o início do atendimento. Para cancelar uma consulta futura, informe o motivo no detalhe autorizado.', location: 'Menu → Minha agenda e Atendimento → detalhes da consulta.', duration: variable },
      { title: 'Exames e registro da avaliação', text: 'Solicite exames quando necessários e revise os resultados recebidos na área privada. Registre a análise, as pendências e a decisão conforme os dados disponíveis. Pedido de exame, avaliação do resultado e decisão clínica são momentos diferentes; não há promessa de aprovação de todo atendimento.', location: 'Menu → Exames; solicitações e registros no detalhe do atendimento.', duration: variable },
      common,
    ],
    REPRESENTANTE: [
      { title: 'Instituição e necessidades', text: 'Mantenha a necessidade real da sua instituição atualizada por tipo sanguíneo. O nível de necessidade é uma informação conferida pela unidade; ele não equivale à quantidade de bolsas no estoque.', location: 'Menu → Necessidades.' },
      { title: 'Registrar a doação realizada', text: 'Depois que a coleta acontecer, registre a doação identificada ou avulsa conforme o atendimento e as regras da modalidade. Esse registro alimenta o acompanhamento; ele não substitui a triagem presencial nem libera uma bolsa automaticamente.', location: 'Menu → Registrar doação.', duration: variable },
      { title: 'Estoque e liberação técnica', text: 'Acompanhe as bolsas, a validade e as movimentações em Estoque. Quarentena e liberação técnica têm seus próprios requisitos. Registrar uma coleta ou atualizar uma necessidade não libera uma bolsa para uso.', location: 'Menu → Estoque.', duration: variable },
      { ...common, title: 'Avisos da instituição e sua conta', text: 'Compartilhe orientações na Comunidade. Avisos críticos exigem instituição verificada e ativa e ficam fixados durante sua validade. Confirme a urgência e mantenha o aviso atualizado: publicar um aviso é diferente de atualizar a necessidade. Perfil reúne sua conta e o menu permite rever esta jornada.' },
    ],
    ADMINISTRADOR: [
      { title: 'Mapa, cobertura e atualidade', text: 'Acompanhe as necessidades informadas por região e tipo sanguíneo. Confira a cobertura e a data antes de interpretar os resultados: a ausência de informação não indica estoque adequado e o mapa não representa um inventário completo do país.', location: 'Menu → Mapa regional.' },
      { title: 'Moderação da Comunidade', text: 'Analise denúncias, confira o conteúdo no seu contexto e aplique as normas da Comunidade. Registre a decisão e acompanhe o encaminhamento. Dados clínicos devem permanecer nas áreas privadas.', location: 'Menu → Moderação e Comunidade.' },
      { title: 'Privacidade e canais disponíveis', text: 'Acompanhe as solicitações de privacidade pela interface web, conforme a autorização da conta. Essa operação está disponível aqui no site; o aplicativo ainda não possui uma tela dedicada. Use as funções existentes sem confundir moderação com avaliação clínica.', location: 'Menu do site → Privacidade.', duration: variable },
      common,
    ],
  }
  return byRole[role]
}
