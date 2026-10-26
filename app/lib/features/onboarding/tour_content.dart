class TourStep {
  final String title, text;
  final bool journey;
  const TourStep(this.title, this.text, {this.journey = false});
}

String tourRoleLabel(String role) => switch (role) {
  'MEDICO' => 'Médico',
  'REPRESENTANTE' => 'Representante de Hospital',
  'ADMINISTRADOR' => 'Administrador',
  _ => 'Paciente/Doador',
};

List<TourStep> tourSteps(
  String role, {
  bool approvedDonor = false,
}) => switch (role) {
  'MEDICO' => const [
    TourStep(
      'Sua instituição e seu acesso',
      'Seu acesso é fornecido pela instituição. Na Agenda, confira ou selecione o hospital em que está trabalhando antes de atender. Os vínculos institucionais definem os atendimentos disponíveis.',
    ),
    TourStep(
      'Agenda e atendimento',
      'Na aba Agenda, organize os horários e abra as consultas atribuídas a você. O detalhe da consulta reúne o atendimento e as orientações privadas. Registre as informações clínicas após o início da consulta; cancelamentos futuros exigem motivo.',
    ),
    TourStep(
      'Exames e avaliação',
      'Em Exames e no detalhe do atendimento, solicite exames quando necessários e analise os resultados recebidos. Solicitação, revisão e decisão são etapas diferentes. O prazo varia conforme a instituição; não há aprovação automática.',
    ),
    TourStep(
      'Comunicação e conta',
      'Na Comunidade, compartilhe informações gerais de saúde e doação. Preserve dados clínicos nas áreas privadas. Perfil reúne sua conta e a opção Rever minha jornada; as Notificações ficam no cabeçalho.',
    ),
  ],
  'REPRESENTANTE' => const [
    TourStep(
      'Instituição e necessidades',
      'Na aba Necessidades, mantenha a demanda da sua instituição atualizada por tipo sanguíneo. Necessidade informada é diferente da quantidade física de bolsas. Confira a situação com sua equipe antes de publicar.',
    ),
    TourStep(
      'Registrar uma doação realizada',
      'Depois da coleta, use Registrar doação, no ícone de gota do cabeçalho. Registre uma doação identificada ou avulsa conforme o atendimento realizado. O sistema verifica as regras da modalidade; o registro não libera automaticamente uma bolsa.',
    ),
    TourStep(
      'Estoque e liberação técnica',
      'Em Estoque, acompanhe bolsas, validade e movimentações. Quarentena e liberação técnica são etapas próprias da instituição, separadas do registro de doação e das necessidades. Os prazos variam conforme a instituição.',
    ),
    TourStep(
      'Avisos e conta',
      'Na Comunidade, publique orientações. Instituições verificadas e autorizadas podem emitir avisos críticos com validade, fixados enquanto ativos. Atualizar uma necessidade não publica um aviso automaticamente. Perfil reúne sua conta e Rever minha jornada.',
    ),
  ],
  'ADMINISTRADOR' => const [
    TourStep(
      'Mapa, cobertura e atualidade',
      'Na aba Mapa, acompanhe necessidades informadas por região e tipo sanguíneo. Confira a cobertura e a data dos dados: ausência de informação não significa estoque adequado. O mapa não representa todo o estoque nacional.',
    ),
    TourStep(
      'Moderação da comunidade',
      'Em Moderação, analise denúncias e os conteúdos indicados. Aplique as normas da Comunidade com registro das decisões e acompanhe o resultado. Esta área não realiza avaliação clínica dos doadores.',
    ),
    TourStep(
      'Privacidade na versão web',
      'As solicitações de privacidade são acompanhadas na área Privacidade do site. O aplicativo ainda não tem uma tela dedicada para essa operação. Use apenas as funções disponíveis e autorizadas para sua conta.',
    ),
    TourStep(
      'Comunidade e conta',
      'A Comunidade também está disponível para a administração. Perfil reúne sua conta e Rever minha jornada. As Notificações ficam no cabeçalho. Preserve dados pessoais e de saúde nas áreas privadas.',
    ),
  ],
  _ => [
    TourStep(
      approvedDonor
          ? 'Sua jornada até a aprovação'
          : 'Seu pré-cadastro inicia a jornada',
      approvedDonor
          ? 'Você já passou pelo pré-cadastro e pela avaliação médica na plataforma. Em Perfil, consulte seus dados. A aprovação ajuda a orientar os próximos passos, mas não substitui a triagem presencial da unidade antes de cada doação.'
          : 'Você já concluiu o pré-cadastro e criou sua conta. Essa etapa permite acompanhar sua jornada; a aptidão para doar depende da avaliação profissional. Seus dados ficam em Perfil.',
    ),
    TourStep(
      'Pré-triagem e agendamento',
      approvedDonor
          ? 'A pré-triagem e a consulta fizeram parte do percurso de avaliação. A orientação automática da pré-triagem não é aptidão clínica. Minhas consultas, dentro do Painel, reúne os detalhes e as orientações disponíveis. Agora, Encontrar onde doar no Painel leva à aba Locais.'
          : 'Quando estiver na etapa de agendar, no Painel toque em Agendar consulta. Antes de escolher um horário, responda à pré-triagem para receber orientações. Essa orientação automática não define aptidão clínica. Minhas consultas, dentro do Painel, reúne o horário, os detalhes e as alterações da consulta.',
    ),
    TourStep(
      'Consulta e próximos cuidados',
      'Em Minhas consultas, acompanhe as orientações e acesse a sala quando estiver disponível. Converse com o médico sobre sua saúde. O profissional registra o atendimento e pode solicitar exames. Concluir a consulta não significa aprovação automática; o prazo varia conforme a instituição.',
    ),
    TourStep(
      'Exames e avaliação, se solicitados',
      'Se o médico solicitar exames, consulte o pedido em Painel → Meus exames e envie os resultados pela área privada. Acompanhe a avaliação, pendências e orientações no Painel, em Meus exames e nas Notificações. Na jornada atual, a aprovação ocorre pela avaliação médica dos exames solicitados. Não publique exames na Comunidade.',
    ),
    TourStep(
      'Locais, triagem presencial e coleta',
      'Na aba Locais, pesquise serviços para os exames solicitados ou unidades onde doar. Recomendações personalizadas aparecem quando houver aprovação e tipagem validada. Confirme serviços e horários com a unidade: o mapa não reserva uma coleta. No local, a equipe fará a triagem presencial e confirmará sua aptidão naquele atendimento.',
      journey: true,
    ),
    TourStep(
      'Acompanhamento e recursos da conta',
      'Após a coleta, a instituição registra a doação; esse histórico ajuda nas próximas orientações e estimativas. Não há novo status automático de “processamento” após doar. Acompanhe o Painel e as Notificações do cabeçalho. Comunidade reúne conversas gerais; Perfil reúne seus dados e Rever minha jornada.',
    ),
  ],
};

class JourneyEstimate {
  final String stage, hospital, source;
  final int minutes;
  const JourneyEstimate(this.stage, this.hospital, this.source, this.minutes);
}

class JourneyTiming {
  final String stage, title, text, fallback;
  final String? source, url;
  final List<JourneyEstimate> estimates;
  const JourneyTiming(
    this.stage,
    this.title,
    this.text,
    this.fallback, {
    this.source,
    this.url,
    this.estimates = const [],
  });
}

List<JourneyTiming> journeyTimings(Object? data) {
  final estimates = <JourneyEstimate>[];
  if (data is List) {
    for (final item in data) {
      if (item is Map &&
          item['etapa'] is String &&
          item['minutos'] is int &&
          (item['minutos'] as int) > 0 &&
          item['fonte'] is String &&
          (item['fonte'] as String).trim().isNotEmpty &&
          item['hospital'] is Map &&
          item['hospital']['nome'] is String) {
        estimates.add(
          JourneyEstimate(
            item['etapa'],
            item['hospital']['nome'],
            item['fonte'],
            item['minutos'],
          ),
        );
      }
    }
  }
  return [
        const JourneyTiming(
          'TRIAGEM',
          'Triagem',
          'Entrevista e avaliação pela equipe antes da doação.',
          'O prazo varia conforme a instituição.',
        ),
        const JourneyTiming(
          'DOACAO',
          'Coleta e doação no local',
          'A coleta é presencial. A estimativa da instituição pode incluir o atendimento completo.',
          'Coleta: cerca de 10 minutos.',
          source: 'Referência: Hemominas',
          url: 'https://www.hemominas.mg.gov.br/servicos/doar-sangue',
        ),
        const JourneyTiming(
          'ATUALIZACAO_STATUS',
          'Registro posterior da doação',
          'A instituição registra a doação realizada. Não há um novo status automático do paciente; o registro não significa liberação imediata da bolsa.',
          'O prazo varia conforme a instituição.',
        ),
      ]
      .map(
        (item) => JourneyTiming(
          item.stage,
          item.title,
          item.text,
          item.fallback,
          source: item.source,
          url: item.url,
          estimates: estimates
              .where((value) => value.stage == item.stage)
              .toList(),
        ),
      )
      .toList();
}
