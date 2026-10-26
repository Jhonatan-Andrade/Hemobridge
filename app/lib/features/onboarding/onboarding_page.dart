import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/app_theme.dart';
import '../../core/session_controller.dart';
import 'tour_content.dart';

class OnboardingPage extends StatefulWidget {
  final SessionController session;
  final bool optional;
  const OnboardingPage({
    super.key,
    required this.session,
    this.optional = false,
  });
  @override
  State<OnboardingPage> createState() => _OnboardingPageState();
}

class _OnboardingPageState extends State<OnboardingPage> {
  final titleFocus = FocusNode(debugLabel: 'Título da etapa');
  final scroll = ScrollController();
  int step = 0;
  bool busy = false, loadingEstimates = true, estimatesFailed = false;
  String? error;
  List<JourneyTiming> timings = journeyTimings(null);

  @override
  void initState() {
    super.initState();
    if (widget.session.user?['perfil'] == 'PACIENTE') loadEstimates();
    focusTitle();
  }

  void focusTitle() => WidgetsBinding.instance.addPostFrameCallback((_) {
    if (mounted) titleFocus.requestFocus();
  });

  void changeStep(int value) {
    setState(() => step = value);
    if (scroll.hasClients) scroll.jumpTo(0);
    focusTitle();
  }

  @override
  void dispose() {
    titleFocus.dispose();
    scroll.dispose();
    super.dispose();
  }

  Future<void> loadEstimates() async {
    setState(() {
      loadingEstimates = true;
      estimatesFailed = false;
    });
    try {
      final data = await widget.session.api.request('/jornada/estimativas');
      if (mounted) setState(() => timings = journeyTimings(data));
    } catch (_) {
      if (mounted) setState(() => estimatesFailed = true);
    } finally {
      if (mounted) setState(() => loadingEstimates = false);
    }
  }

  Future<void> complete() async {
    if (busy) return;
    if (widget.optional) {
      Navigator.pop(context);
      return;
    }
    setState(() {
      busy = true;
      error = null;
    });
    try {
      await widget.session.completeTour();
      if (mounted && Navigator.canPop(context)) Navigator.pop(context);
    } catch (_) {
      if (mounted) {
        setState(
          () => error = 'Não foi possível salvar a conclusão. Tente novamente.',
        );
      }
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> openSource(String url) async {
    try {
      final opened = await launchUrl(
        Uri.parse(url),
        mode: LaunchMode.externalApplication,
      );
      if (!opened && mounted) {
        setState(
          () => error = 'Não foi possível abrir a referência. Tente novamente.',
        );
      }
    } catch (_) {
      if (mounted) {
        setState(
          () => error = 'Não foi possível abrir a referência. Tente novamente.',
        );
      }
    }
  }

  Widget journeyTimes() => Container(
    margin: const EdgeInsets.symmetric(vertical: 24),
    padding: const EdgeInsets.all(20),
    decoration: BoxDecoration(
      color: canvas,
      borderRadius: BorderRadius.circular(16),
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          'Tempos das etapas',
          style: Theme.of(context).textTheme.titleMedium,
        ),
        const SizedBox(height: 12),
        const Text(
          'Estimativas variam por unidade e não incluem garantia de horário ou aprovação.',
        ),
        for (final timing in timings) ...[
          const SizedBox(height: 20),
          Text(timing.title, style: Theme.of(context).textTheme.titleSmall),
          const SizedBox(height: 8),
          Text(timing.text),
          if (timing.estimates.isEmpty) ...[
            const SizedBox(height: 8),
            Text(timing.fallback),
            if (timing.url != null)
              TextButton(
                onPressed: () => openSource(timing.url!),
                child: Text('${timing.source} ↗'),
              ),
          ] else
            for (final estimate in timing.estimates) ...[
              const SizedBox(height: 12),
              Text('${estimate.hospital}: cerca de ${estimate.minutes} min.'),
              Text(
                'Fonte: ${estimate.source}',
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ],
        ],
        if (loadingEstimates)
          Semantics(
            liveRegion: true,
            child: const Text('Consultando os prazos das instituições…'),
          ),
        if (estimatesFailed) ...[
          const SizedBox(height: 16),
          const Text(
            'Os prazos das instituições estão indisponíveis. As orientações gerais continuam disponíveis.',
          ),
          TextButton(
            onPressed: loadEstimates,
            child: const Text('Tentar novamente'),
          ),
        ],
      ],
    ),
  );

  @override
  Widget build(BuildContext context) {
    final role = widget.session.user!['perfil'] as String;
    final steps = tourSteps(
      role,
      approvedDonor: widget.session.user?['papel'] == 'DOADOR',
    );
    final current = steps[step];
    return PopScope(
      canPop: widget.optional && !busy,
      child: Dialog(
        insetPadding: const EdgeInsets.all(16),
        backgroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        clipBehavior: Clip.antiAlias,
        child: ConstrainedBox(
          constraints: BoxConstraints(
            maxWidth: 620,
            maxHeight: MediaQuery.sizeOf(context).height - 64,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Flexible(
                child: SingleChildScrollView(
                  controller: scroll,
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const BrandTitle(),
                      const SizedBox(height: 16),
                      Text(tourRoleLabel(role)),
                      const SizedBox(height: 12),
                      Semantics(
                        liveRegion: true,
                        child: Text('Etapa ${step + 1} de ${steps.length}'),
                      ),
                      const SizedBox(height: 12),
                      LinearProgressIndicator(value: (step + 1) / steps.length),
                      const SizedBox(height: 24),
                      Semantics(
                        header: true,
                        child: Focus(
                          focusNode: titleFocus,
                          child: Text(
                            current.title,
                            style: Theme.of(context).textTheme.headlineSmall,
                          ),
                        ),
                      ),
                      const SizedBox(height: 18),
                      Text(current.text),
                      if (current.journey) journeyTimes(),
                    ],
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    if (error != null)
                      Semantics(liveRegion: true, child: Text(error!)),
                    FilledButton(
                      onPressed: busy
                          ? null
                          : step == steps.length - 1
                          ? complete
                          : () => changeStep(step + 1),
                      child: Text(
                        busy
                            ? 'Salvando…'
                            : step == steps.length - 1
                            ? 'Concluir e acessar'
                            : 'Continuar',
                      ),
                    ),
                    if (step > 0)
                      TextButton(
                        onPressed: busy ? null : () => changeStep(step - 1),
                        child: const Text('Voltar'),
                      ),
                    if (widget.optional)
                      TextButton(
                        onPressed: busy ? null : () => Navigator.pop(context),
                        child: const Text('Fechar orientação'),
                      ),
                    if (!widget.optional)
                      TextButton(
                        onPressed: busy || widget.session.signingOut
                            ? null
                            : () async {
                                try {
                                  await widget.session.logout();
                                } catch (_) {
                                  /* O logout local também limpa a sessão. */
                                }
                              },
                        child: const Text('Sair da conta'),
                      ),
                    const SizedBox(height: 12),
                    Text(
                      widget.optional
                          ? 'Você pode rever esta apresentação sempre que precisar.'
                          : 'Conclua a apresentação para acessar sua área. Você poderá revê-la pelo Perfil.',
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
