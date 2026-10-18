import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:hemobridge/core/api_client.dart';
import 'package:hemobridge/core/app_theme.dart';
import 'package:hemobridge/core/session_controller.dart';
import 'package:hemobridge/features/onboarding/onboarding_page.dart';

void main() {
  testWidgets('primeiro acesso só persiste a conclusão após a última etapa', (
    tester,
  ) async {
    SharedPreferences.setMockInitialValues({});
    final session = SessionController(ApiClient())
      ..user = {'id': 'user-test', 'perfil': 'PACIENTE'};
    await tester.pumpWidget(
      MaterialApp(
        theme: hemobridgeTheme(),
        home: OnboardingPage(session: session),
      ),
    );
    expect(find.text('Etapa 1 de 4'), findsOneWidget);
    expect(find.text('Pular'), findsNothing);
    expect(
      (await SharedPreferences.getInstance()).getBool(
        'isFirstAccess.user-test',
      ),
      isNull,
    );
    for (var i = 0; i < 3; i++) {
      await tester.ensureVisible(find.text('Continuar'));
      await tester.tap(find.text('Continuar'));
      await tester.pumpAndSettle();
    }
    await tester.ensureVisible(find.text('Concluir e acessar'));
    await tester.tap(find.text('Concluir e acessar'));
    await tester.pumpAndSettle();
    expect(session.isFirstAccess, isFalse);
    expect(
      (await SharedPreferences.getInstance()).getBool(
        'isFirstAccess.user-test',
      ),
      isFalse,
    );
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
}
