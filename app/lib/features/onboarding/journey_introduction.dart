import 'package:flutter/material.dart';
import '../../core/session_controller.dart';
import '../home/public_home_page.dart';
import 'onboarding_page.dart';
import 'tour_content.dart';

Future<void> showJourneyTour(BuildContext context, SessionController session) =>
    showDialog<void>(
      context: context,
      barrierDismissible: !session.isFirstAccess,
      traversalEdgeBehavior: TraversalEdgeBehavior.closedLoop,
      builder: (_) =>
          OnboardingPage(session: session, optional: !session.isFirstAccess),
    );

class JourneyIntroduction extends StatelessWidget {
  final SessionController session;
  final VoidCallback onStart;
  const JourneyIntroduction({
    super.key,
    required this.session,
    required this.onStart,
  });
  @override
  Widget build(BuildContext context) {
    final role = session.user?['perfil'] as String? ?? 'PACIENTE';
    final description = switch (role) {
      'MEDICO' =>
        'Na sua área, Agenda reúne instituições e consultas atribuídas; Exames reúne solicitações e avaliações. Comunidade e Perfil completam sua navegação.',
      'REPRESENTANTE' =>
        'Na sua área, Necessidades reúne a demanda informada; o cabeçalho oferece Registrar doação após a coleta. Estoque, Comunidade e Perfil completam sua navegação.',
      'ADMINISTRADOR' =>
        'Na sua área, Mapa reúne necessidades regionais e Moderação reúne denúncias. Comunidade e Perfil completam sua navegação. Solicitações de privacidade são acompanhadas no site.',
      _ =>
        'Na sua área, Painel reúne consultas, exames solicitados e sua situação. Locais ajuda a encontrar os serviços adequados; Comunidade e Perfil completam sua navegação.',
    };
    return ListView(
      padding: const EdgeInsets.all(24),
      children: [
        Text(
          'Conheça o HemoBridge',
          style: Theme.of(context).textTheme.headlineSmall,
        ),
        const SizedBox(height: 16),
        const PlatformIntroduction(),
        const SizedBox(height: 24),
        Text(
          'Sua área: ${tourRoleLabel(role)}',
          style: Theme.of(context).textTheme.titleLarge,
        ),
        const SizedBox(height: 12),
        Text(description),
        const SizedBox(height: 16),
        Text(
          session.isFirstAccess
              ? 'Leia esta introdução no seu tempo. Quando estiver pronto, abra a apresentação da sua jornada. A primeira apresentação precisa ser concluída para liberar as funções privadas; você pode explorar as informações públicas ou sair da conta antes disso.'
              : 'Você já conhece sua área. Se quiser, reveja a sequência da sua jornada e onde encontrar cada função. Esta revisão pode ser fechada a qualquer momento.',
        ),
        const SizedBox(height: 24),
        FilledButton(
          onPressed: onStart,
          child: const Padding(
            padding: EdgeInsets.symmetric(vertical: 8),
            child: Text(
              'Entendi o HemoBridge. Conhecer minha jornada',
              textAlign: TextAlign.center,
            ),
          ),
        ),
        const SizedBox(height: 16),
        OutlinedButton(
          onPressed: () => Navigator.of(context).push(
            MaterialPageRoute<void>(
              builder: (_) => PublicHomeShell(session: session),
            ),
          ),
          child: const Text('Explorar a página inicial'),
        ),
        const SizedBox(height: 12),
      ],
    );
  }
}
