import 'package:flutter/material.dart';
import '../../core/app_theme.dart';
import '../../core/session_controller.dart';

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
  int step = 0;
  bool busy = false;
  List<(String, String, String)> get steps => switch (widget
      .session
      .user!['perfil']) {
    'MEDICO' => [
      (
        'Sua instituição',
        'Selecione o hospital antes de consultar agenda e atendimentos. Você só acessa vínculos autorizados.',
        'O período de cada atendimento acompanha o horário publicado.',
      ),
      (
        'Atendimento e exames',
        'Acompanhe consultas atribuídas, solicite exames e preserve o sigilo das informações clínicas.',
        'Informe os prazos de análise nas orientações da solicitação.',
      ),
      (
        'Comunidade',
        'Compartilhe informações gerais. A identificação de perfil verificado depende da conferência do registro profissional.',
        'As conversas públicas não substituem avaliação individual.',
      ),
    ],
    'REPRESENTANTE' => [
      (
        'Necessidades e estoque',
        'Atualize os níveis por tipo sanguíneo e acompanhe bolsas, validade e movimentações da sua instituição.',
        'Atualize os dados quando houver mudança confirmada.',
      ),
      (
        'Da coleta ao registro',
        'Registre a doação. A bolsa permanece em quarentena até a liberação técnica.',
        'O processamento segue os prazos do serviço de hemoterapia.',
      ),
      (
        'Avisos da unidade',
        'Instituições verificadas podem emitir avisos críticos com data de expiração.',
        'Um aviso crítico fica fixado por até sete dias.',
      ),
    ],
    'ADMINISTRADOR' => [
      (
        'Gestão responsável',
        'Acompanhe indicadores agregados e gerencie os acessos conforme as permissões de cada perfil.',
        'Cada verificação deve registrar a fonte de conferência.',
      ),
      (
        'Mapa regional',
        'A cartografia vem do IBGE. A necessidade considera instituições participantes e dados atualizados.',
        'Consulte a data da informação e a cobertura dos registros.',
      ),
      (
        'Moderação',
        'Acompanhe denúncias e oculte conteúdos que violem as normas da comunidade.',
        'A moderação segue a política operacional de atendimento.',
      ),
    ],
    _ => [
      (
        'Sua jornada',
        'Meu painel reúne sua situação e o próximo passo. O pré-cadastro inicia o processo; a avaliação depende da equipe.',
        'O prazo de triagem é informado pela unidade.',
      ),
      (
        'Consultas e exames',
        'Consulte horários, acompanhe o atendimento e envie apenas os exames solicitados na área privada.',
        'O prazo da análise acompanha as orientações de cada solicitação.',
      ),
      (
        'Onde doar',
        'Use Locais para pesquisar serviços da sua região. Confirme atendimento e horário antes da visita.',
        'O Ministério da Saúde estima cerca de 40 minutos para todo o procedimento no local; filas podem alterar a duração.',
      ),
      (
        'Acompanhamento e comunidade',
        'O status é atualizado após registro e validação da equipe. Participe de conversas gerais sem expor dados de saúde.',
        'O tempo de atualização é informado pela instituição.',
      ),
    ],
  };
  Future<void> complete() async {
    if (widget.optional) {
      Navigator.pop(context);
      return;
    }
    setState(() => busy = true);
    try {
      await widget.session.completeTour();
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final current = steps[step];
    return PopScope(
      canPop: widget.optional,
      child: Scaffold(
        appBar: AppBar(
          title: const BrandTitle(),
          automaticallyImplyLeading: widget.optional,
        ),
        body: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Card(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text('Etapa ${step + 1} de ${steps.length}'),
                    const SizedBox(height: 12),
                    LinearProgressIndicator(value: (step + 1) / steps.length),
                    const SizedBox(height: 28),
                    Text(
                      current.$1,
                      style: Theme.of(context).textTheme.headlineSmall,
                    ),
                    const SizedBox(height: 18),
                    Text(current.$2),
                    const SizedBox(height: 24),
                    Container(
                      padding: const EdgeInsets.all(18),
                      decoration: BoxDecoration(
                        color: canvas,
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Text(current.$3),
                    ),
                    const SizedBox(height: 24),
                    FilledButton(
                      onPressed: busy
                          ? null
                          : step == steps.length - 1
                          ? complete
                          : () => setState(() => step++),
                      child: Text(
                        step == steps.length - 1
                            ? 'Concluir e acessar'
                            : 'Continuar',
                      ),
                    ),
                    if (step > 0)
                      TextButton(
                        onPressed: () => setState(() => step--),
                        child: const Text('Voltar'),
                      ),
                    const Text(
                      'Conclua a apresentação para acessar sua área. Você poderá revê-la pelo perfil.',
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
