import 'package:flutter/material.dart';
import '../../core/api_client.dart';
import '../../core/app_theme.dart';
import '../../core/session_controller.dart';
import '../community/community_page.dart';
import '../locations/locations_page.dart';
import '../onboarding/onboarding_page.dart';
import '../workspace/role_workspace.dart';

class AppShell extends StatefulWidget {
  final SessionController session;
  const AppShell({super.key, required this.session});
  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  int index = 0;
  @override
  Widget build(BuildContext context) {
    final role = widget.session.user!['perfil'] as String;
    final patient = role == 'PACIENTE',
        doctor = role == 'MEDICO',
        representative = role == 'REPRESENTANTE';
    final labels = [
      patient
          ? 'Painel'
          : doctor
          ? 'Agenda'
          : representative
          ? 'Necessidades'
          : 'Mapa',
      'Comunidade',
      patient
          ? 'Locais'
          : doctor
          ? 'Exames'
          : representative
          ? 'Estoque'
          : 'Moderação',
      'Perfil',
    ];
    final icons = [
      patient
          ? Icons.dashboard_outlined
          : doctor
          ? Icons.calendar_month_outlined
          : representative
          ? Icons.bloodtype_outlined
          : Icons.map_outlined,
      Icons.people_outline,
      patient
          ? Icons.location_on_outlined
          : doctor
          ? Icons.science_outlined
          : representative
          ? Icons.inventory_2_outlined
          : Icons.rule_outlined,
      Icons.person_outline,
    ];
    final body = index == 1
        ? CommunityPage(api: widget.session.api, role: role)
        : index == 2 && patient
        ? const LocationsPage()
        : index == 3
        ? ProfilePage(session: widget.session)
        : RoleWorkspace(
            key: ValueKey('$role-$index'),
            api: widget.session.api,
            role: role,
            secondary: index == 2,
          );
    return Scaffold(
      appBar: AppBar(title: const BrandTitle()),
      body: SafeArea(child: body),
      bottomNavigationBar: NavigationBar(
        selectedIndex: index,
        onDestinationSelected: (value) => setState(() => index = value),
        destinations: List.generate(
          4,
          (i) => NavigationDestination(icon: Icon(icons[i]), label: labels[i]),
        ),
      ),
    );
  }
}

class ProfilePage extends StatelessWidget {
  final SessionController session;
  const ProfilePage({super.key, required this.session});
  @override
  Widget build(BuildContext context) => ListView(
    padding: const EdgeInsets.all(24),
    children: [
      Text('Meu perfil', style: Theme.of(context).textTheme.headlineSmall),
      Card(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                session.user!['nome'] as String,
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: 12),
              Text(session.user!['email'] as String),
              const SizedBox(height: 16),
              Text(switch (session.user!['perfil']) {
                'MEDICO' => 'Médico',
                'REPRESENTANTE' => 'Representante de Hospital',
                'ADMINISTRADOR' => 'Administrador',
                _ => 'Paciente/Doador',
              }),
            ],
          ),
        ),
      ),
      OutlinedButton.icon(
        onPressed: () => Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => OnboardingPage(session: session, optional: true),
          ),
        ),
        icon: const Icon(Icons.help_outline),
        label: const Text('Ver apresentação'),
      ),
      FilledButton(
        onPressed: () async {
          try {
            await session.logout();
          } on ApiException catch (e) {
            if (context.mounted) {
              ScaffoldMessenger.of(
                context,
              ).showSnackBar(SnackBar(content: Text(e.message)));
            }
          }
        },
        child: const Text('Sair'),
      ),
    ],
  );
}
