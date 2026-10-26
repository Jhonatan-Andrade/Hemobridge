import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:hemobridge/core/api_client.dart';
import 'package:hemobridge/core/app_theme.dart';
import 'package:hemobridge/core/session_controller.dart';
import 'package:hemobridge/features/onboarding/onboarding_page.dart';

class FailingTourSession extends SessionController {
  FailingTourSession() : super(ApiClient());
  @override
  Future<void> completeTour() async =>
      throw StateError('armazenamento indisponível');
}

void main() {
  testWidgets('primeiro acesso só persiste a conclusão após a última etapa', (
    tester,
  ) async {
    var completions = 0;
    final session = SessionController(
      ApiClient(
        baseUrl: 'https://api.example.invalid',
        client: MockClient((request) async {
          if (request.url.path.endsWith('/tour/conclusao')) {
            completions++;
            return http.Response(
              '{"isFirstAccess":false,"tourVersion":1}',
              200,
            );
          }
          return http.Response('[]', 200);
        }),
      ),
    )..user = {'id': 'user-test', 'perfil': 'PACIENTE', 'tourVersion': 1};
    await tester.pumpWidget(
      MaterialApp(
        theme: hemobridgeTheme(),
        home: OnboardingPage(session: session),
      ),
    );
    expect(find.text('Etapa 1 de 6'), findsOneWidget);
    expect(find.text('Pular'), findsNothing);
    expect(completions, 0);
    for (var i = 0; i < 5; i++) {
      await tester.ensureVisible(find.text('Continuar'));
      await tester.tap(find.text('Continuar'));
      await tester.pumpAndSettle();
    }
    await tester.ensureVisible(find.text('Concluir e acessar'));
    await tester.tap(find.text('Concluir e acessar'));
    await tester.pumpAndSettle();
    expect(session.isFirstAccess, isFalse);
    expect(completions, 1);
    expect(tester.takeException(), isNull);
    session.dispose();
  });
  testWidgets('orientação cabe em 360 px com texto ampliado', (tester) async {
    tester.view.physicalSize = const Size(360, 740);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final session = SessionController(ApiClient())
      ..user = {'id': 'admin-test', 'perfil': 'ADMINISTRADOR'};
    await tester.pumpWidget(
      MaterialApp(
        theme: hemobridgeTheme(),
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(
            context,
          ).copyWith(textScaler: const TextScaler.linear(2)),
          child: child!,
        ),
        home: OnboardingPage(session: session),
      ),
    );
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
    await tester.ensureVisible(find.text('Continuar'));
    expect(find.text('Continuar'), findsOneWidget);
    session.dispose();
  });

  testWidgets('Voltar e tocar fora não encerram o tour obrigatório', (
    tester,
  ) async {
    final session = SessionController(ApiClient())
      ..user = {'id': 'obrigatorio', 'perfil': 'MEDICO'};
    addTearDown(session.dispose);
    await tester.pumpWidget(
      MaterialApp(
        theme: hemobridgeTheme(),
        home: Builder(
          builder: (context) => Scaffold(
            body: TextButton(
              onPressed: () => Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => OnboardingPage(session: session),
                ),
              ),
              child: const Text('Entrar'),
            ),
          ),
        ),
      ),
    );
    await tester.tap(find.text('Entrar'));
    await tester.pumpAndSettle();
    expect(find.byType(Dialog), findsOneWidget);
    expect(find.text('Concluir e acessar'), findsNothing);
    await tester.binding.handlePopRoute();
    await tester.pumpAndSettle();
    await tester.tapAt(const Offset(2, 2));
    await tester.pumpAndSettle();
    expect(find.byType(Dialog), findsOneWidget);
    expect(session.isFirstAccess, isTrue);
    expect(session.isFirstAccess, isTrue);
    await tester.pumpWidget(const SizedBox());
    expect(session.isFirstAccess, isTrue);
  });

  testWidgets('rever o tour pode ser fechado sem mudar a preferência', (
    tester,
  ) async {
    final session = SessionController(ApiClient())
      ..user = {
        'id': 'revisao',
        'perfil': 'REPRESENTANTE',
        'isFirstAccess': false,
      }
      ..isFirstAccess = false;
    addTearDown(session.dispose);
    await tester.pumpWidget(
      MaterialApp(
        theme: hemobridgeTheme(),
        home: Builder(
          builder: (context) => Scaffold(
            body: TextButton(
              onPressed: () => Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) =>
                      OnboardingPage(session: session, optional: true),
                ),
              ),
              child: const Text('Ver tour'),
            ),
          ),
        ),
      ),
    );
    await tester.tap(find.text('Ver tour'));
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.text('Fechar orientação'));
    await tester.tap(find.text('Fechar orientação'));
    await tester.pumpAndSettle();
    expect(find.byType(Dialog), findsNothing);
    expect(find.text('Ver tour'), findsOneWidget);
    expect(session.isFirstAccess, isFalse);
  });

  testWidgets('prazos da API aparecem nas três fases sem bloquear a orientação', (
    tester,
  ) async {
    final session = SessionController(
      ApiClient(
        baseUrl: 'https://api.example.invalid',
        client: MockClient(
          (request) async => http.Response(
            '[{"etapa":"TRIAGEM","minutos":15,"fonte":"Protocolo","hospital":{"nome":"Hospital Aurora"}},{"etapa":"DOACAO","minutos":40,"fonte":"Atendimento completo","hospital":{"nome":"Hospital Aurora"}},{"etapa":"ATUALIZACAO_STATUS","minutos":120,"fonte":"Prazo operacional","hospital":{"nome":"Hospital Aurora"}}]',
            200,
          ),
        ),
      ),
    )..user = {'id': 'prazos', 'perfil': 'PACIENTE'};
    addTearDown(session.dispose);
    await tester.pumpWidget(
      MaterialApp(
        theme: hemobridgeTheme(),
        home: OnboardingPage(session: session),
      ),
    );
    await tester.pumpAndSettle();
    for (var i = 0; i < 4; i++) {
      await tester.ensureVisible(find.text('Continuar'));
      await tester.tap(find.text('Continuar'));
      await tester.pumpAndSettle();
    }
    expect(find.text('Hospital Aurora: cerca de 15 min.'), findsOneWidget);
    expect(find.text('Hospital Aurora: cerca de 40 min.'), findsOneWidget);
    expect(find.text('Hospital Aurora: cerca de 120 min.'), findsOneWidget);
    expect(find.text('Coleta: cerca de 10 minutos.'), findsNothing);
    expect(find.text('Concluir e acessar'), findsNothing);
  });

  testWidgets('falha ao salvar mantém o bloqueio e oferece nova tentativa', (
    tester,
  ) async {
    final session = FailingTourSession()
      ..user = {'id': 'falha', 'perfil': 'ADMINISTRADOR'};
    addTearDown(session.dispose);
    await tester.pumpWidget(
      MaterialApp(
        theme: hemobridgeTheme(),
        home: OnboardingPage(session: session),
      ),
    );
    await tester.pumpAndSettle();
    for (var i = 0; i < 3; i++) {
      await tester.ensureVisible(find.text('Continuar'));
      await tester.tap(find.text('Continuar'));
      await tester.pumpAndSettle();
    }
    await tester.ensureVisible(find.text('Concluir e acessar'));
    await tester.tap(find.text('Concluir e acessar'));
    await tester.pumpAndSettle();
    expect(
      find.text('Não foi possível salvar a conclusão. Tente novamente.'),
      findsOneWidget,
    );
    expect(session.isFirstAccess, isTrue);
    expect(find.byType(Dialog), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
