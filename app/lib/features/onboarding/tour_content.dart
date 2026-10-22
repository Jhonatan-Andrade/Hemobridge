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

List<TourStep> tourSteps(String role) {
  const overview = TourStep(
    'Da triagem ao acompanhamento',
    'A jornada começa com avaliação e orientações da equipe. Quando houver liberação, a coleta acontece presencialmente na unidade. Depois, a equipe registra o atendimento e atualiza a situação no HemoBridge.',
    journey: true,
  );
  const profile = TourStep(
    'Perfil e privacidade',
    'Em Perfil, consulte sua conta e seus dados. Informações de saúde ficam nas áreas privadas. Você poderá rever esta apresentação pelo Perfil.',
  );
  const community = TourStep(
    'Comunidade',
    'Compartilhe informações gerais sobre saúde e doação. Médicos e instituições verificados têm identificação; avisos críticos ativos ficam no topo. Preserve dados pessoais e exames nas áreas privadas.',
  );
  final specific = switch (role) {
    'MEDICO' => [
      const TourStep(
        'Agenda, instituições e exames',
        'Na aba Agenda, selecione a instituição em que está trabalhando e consulte os atendimentos autorizados. Em Exames, acompanhe solicitações e análises. As decisões clínicas devem ficar na área privada.',
      ),
      community,
      profile,
    ],
    'REPRESENTANTE' => [
      const TourStep(
        'Necessidades e estoque',
        'Em Necessidades, acompanhe a demanda por tipo sanguíneo da sua instituição. Em Estoque, consulte bolsas, validade e movimentações. O registro da coleta e a liberação técnica são etapas distintas.',
      ),
      const TourStep(
        'Comunidade e avisos',
        'Na Comunidade, publique orientações e avisos da instituição. Instituições verificadas podem emitir avisos críticos com validade, fixados enquanto ativos. A informação deve acompanhar a situação confirmada da unidade.',
      ),
      profile,
    ],
    'ADMINISTRADOR' => [
      const TourStep(
        'Mapa regional',
        'Na aba Mapa, acompanhe necessidades agregadas por região e tipo sanguíneo. Observe a cobertura e a data dos dados; ausência de informação não indica estoque adequado.',
      ),
      const TourStep(
        'Comunidade e moderação',
        'A Comunidade também está disponível para a administração. Em Moderação, acompanhe denúncias e conteúdos que violem as normas. Verificações devem manter a fonte de conferência registrada.',
      ),
      profile,
    ],
    _ => [
      const TourStep(
        'Painel e acompanhamento',
        'Painel reúne sua situação, o próximo passo e informações de consultas e exames. Acompanhe as orientações da equipe antes e depois da doação.',
      ),
      const TourStep(
        'Locais e Comunidade',
        'Em Locais, pesquise serviços para doação ou exames usando Estado/Município ou sua localização. Confirme o atendimento com a unidade. Na Comunidade, participe de conversas gerais sem publicar informações de saúde pessoais.',
      ),
      profile,
    ],
  };
  return [overview, ...specific];
}

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
          'Prazo informado pela unidade.',
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
          'Atualização do status',
          'Após o registro e a validação da equipe; não significa liberação imediata da bolsa.',
          'Prazo informado pela unidade.',
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
