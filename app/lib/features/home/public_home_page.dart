import 'package:flutter/material.dart';
import '../../core/app_theme.dart';
import '../../core/session_controller.dart';
import '../account/registration_page.dart';
import '../auth/login_page.dart';
import '../community/community_page.dart';

class PublicHomeShell extends StatefulWidget {
  final SessionController session;
  const PublicHomeShell({super.key, required this.session});
  @override
  State<PublicHomeShell> createState() => _PublicHomeShellState();
}

class _PublicHomeShellState extends State<PublicHomeShell> {
  int index = 0;
  void select(int value) => setState(() => index = value);
  Future<void> register() async {
    final registered = await Navigator.of(context).push<String>(
      MaterialPageRoute(
        builder: (_) => RegistrationPage(api: widget.session.api),
      ),
    );
    if (mounted && registered != null) {
      select(2);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'Pré-cadastro concluído. Entre na sua conta para continuar.',
          ),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final authenticated = widget.session.user != null;
    return PopScope(
      canPop: index == 0,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) select(0);
      },
      child: Scaffold(
        appBar: index == 2 && !authenticated
            ? null
            : AppBar(title: const BrandTitle()),
        body: SafeArea(
          child: index == 1
              ? CommunityPage(
                  api: widget.session.api,
                  role: 'VISITANTE',
                  readOnly: true,
                  readOnlyMessage:
                      authenticated && !widget.session.isFirstAccess
                      ? 'Leitura pública. Volte à sua área para publicar ou comentar.'
                      : null,
                  onLogin: authenticated ? null : () => select(2),
                )
              : index == 2 && !authenticated
              ? LoginPage(session: widget.session)
              : ListView(
                  padding: const EdgeInsets.all(24),
                  children: [
                    if (widget.session.error != null) ...[
                      Text(widget.session.error!),
                      const Text(
                        'Sua sessão não foi descartada por uma falha de conexão. Você pode continuar lendo as informações públicas.',
                      ),
                      OutlinedButton(
                        onPressed: widget.session.initialize,
                        child: const Text('Tentar restaurar minha sessão'),
                      ),
                    ],
                    PlatformIntroduction(
                      action: authenticated
                          ? OutlinedButton(
                              onPressed: () => Navigator.of(context).pop(),
                              child: const Text('Voltar à minha área'),
                            )
                          : FilledButton(
                              onPressed: register,
                              child: const Text('Fazer meu pré-cadastro'),
                            ),
                    ),
                    const SizedBox(height: 24),
                    Text(
                      'Como funciona',
                      style: Theme.of(context).textTheme.headlineSmall,
                    ),
                    const SizedBox(height: 12),
                    const Text(
                      '1. Faça seu pré-cadastro para criar sua conta. Cadastro não significa aprovação para doar.\n\n2. Receba orientações na pré-triagem e agende a consulta. Envie exames pela área privada somente se forem solicitados.\n\n3. Acompanhe a avaliação e encontre serviços em Locais. A instituição confirmará sua aptidão na triagem presencial antes da coleta.',
                    ),
                    const SizedBox(height: 24),
                    OutlinedButton.icon(
                      onPressed: () => select(1),
                      icon: const Icon(Icons.people_outline),
                      label: const Text('Explorar a Comunidade'),
                    ),
                    if (!authenticated)
                      TextButton(
                        onPressed: () => select(2),
                        child: const Text('Já tenho uma conta. Entrar'),
                      ),
                    const SizedBox(height: 16),
                    const Text(
                      'Médicos e representantes acessam com a conta fornecida pela instituição. Os prazos e o atendimento variam conforme cada serviço.',
                    ),
                  ],
                ),
        ),
        bottomNavigationBar: NavigationBar(
          selectedIndex: index,
          onDestinationSelected: (value) {
            if (authenticated && value == 2) {
              Navigator.of(context).pop();
            } else {
              select(value);
            }
          },
          destinations: [
            const NavigationDestination(
              icon: Icon(Icons.home_outlined),
              label: 'Início',
            ),
            const NavigationDestination(
              icon: Icon(Icons.people_outline),
              label: 'Comunidade',
            ),
            NavigationDestination(
              icon: const Icon(Icons.person_outline),
              label: authenticated ? 'Minha área' : 'Entrar',
            ),
          ],
        ),
      ),
    );
  }
}

class PlatformIntroduction extends StatelessWidget {
  final Widget? action;
  const PlatformIntroduction({super.key, this.action});
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(24),
    decoration: BoxDecoration(
      gradient: const LinearGradient(
        colors: [petrol, Color(0xff29434c)],
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
      ),
      borderRadius: BorderRadius.circular(24),
      border: const Border(top: BorderSide(color: brand, width: 4)),
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text.rich(
          const TextSpan(
            children: [
              TextSpan(
                text: 'A ponte que\n',
                style: TextStyle(
                  fontFamily: 'Fraunces',
                  fontStyle: FontStyle.italic,
                  fontWeight: FontWeight.w400,
                ),
              ),
              TextSpan(text: 'conecta vidas.'),
            ],
          ),
          style: Theme.of(context).textTheme.headlineMedium?.copyWith(
            color: Colors.white,
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: 20),
        const Text(
          'O que é o HemoBridge?',
          style: TextStyle(
            color: Colors.white,
            fontSize: 20,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 12),
        const Text(
          'O HemoBridge conecta pessoas que desejam doar sangue a hospitais e hemocentros que precisam de doações. Aqui, você inicia seu pré-cadastro, recebe orientações da equipe e acompanha consultas e exames solicitados.',
          style: TextStyle(color: Colors.white, height: 1.6),
        ),
        const SizedBox(height: 16),
        const Text(
          'A Comunidade reúne informações e conversas sobre saúde e doação. Em Locais, você encontra serviços e orientações para chegar à unidade adequada. A avaliação profissional e a triagem presencial continuam essenciais.',
          style: TextStyle(color: Colors.white, height: 1.6),
        ),
        if (action != null) ...[const SizedBox(height: 24), action!],
      ],
    ),
  );
}
